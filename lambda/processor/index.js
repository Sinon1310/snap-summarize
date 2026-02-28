const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const https = require("https");

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({});
const s3 = new S3Client({});

const summarize = (text) => {
  return new Promise((resolve, reject) => {
    const trimmed = text.slice(0, 1024);
    const data = JSON.stringify({ inputs: trimmed });

    const options = {
      hostname: "router.huggingface.co",
      path: "/hf-inference/models/facebook/bart-large-cnn",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          console.log("HF status:", res.statusCode);
          console.log("HF body:", body.slice(0, 500));
          if (res.statusCode !== 200) {
            return reject(new Error(`HF API error ${res.statusCode}: ${body}`));
          }
          const parsed = JSON.parse(body);
          resolve(parsed[0]?.summary_text || "Could not generate summary.");
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
};

const getSentiment = (text) => {
  const lower = text.toLowerCase();
  const positive = (lower.match(/good|great|excellent|amazing|wonderful|fantastic|positive|success|happy|best/g) || []).length;
  const negative = (lower.match(/bad|terrible|awful|horrible|negative|fail|worst|poor|sad|wrong/g) || []).length;
  if (positive > negative) return "POSITIVE";
  if (negative > positive) return "NEGATIVE";
  return "NEUTRAL";
};

const getKeyPhrases = (text) => {
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 5);
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

const fetchUrl = (url) => {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : require("http");
    mod.get(url, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        const text = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        resolve(text.slice(0, 3000));
      });
    }).on("error", reject);
  });
};

const fetchS3 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.UPLOADS_BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const text = await response.Body.transformToString();
  return text.slice(0, 3000);
};

exports.handler = async (event) => {
  for (const record of event.Records) {
    const { jobId, type, input, email } = JSON.parse(record.body);

    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: process.env.JOBS_TABLE,
        Key: { jobId: { S: jobId } },
        UpdateExpression: "SET #s = :s",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": { S: "PROCESSING" } },
      }));

      let text = "";
      if (type === "url") {
        text = await fetchUrl(input);
      } else {
        text = await fetchS3(input);
      }

      console.log("Text length:", text.length);

      const summary = await summarize(text);
      const sentiment = getSentiment(text);
      const keyPhrases = getKeyPhrases(text);

      await dynamo.send(new UpdateItemCommand({
        TableName: process.env.JOBS_TABLE,
        Key: { jobId: { S: jobId } },
        UpdateExpression: "SET #s = :s, summary = :sum, sentiment = :sen, keyPhrases = :kp",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":s": { S: "COMPLETED" },
          ":sum": { S: summary },
          ":sen": { S: sentiment },
          ":kp": { S: JSON.stringify(keyPhrases) },
        },
      }));

      await sns.send(new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: "Your SnapSummarize result is ready!",
        Message: `Your summary is ready!\n\nJob ID: ${jobId}\nSentiment: ${sentiment}\n\nSummary:\n${summary}\n\nKey Topics: ${keyPhrases.join(", ")}`,
      }));

    } catch (err) {
      console.error(`Failed to process job ${jobId}:`, err);
      await dynamo.send(new UpdateItemCommand({
        TableName: process.env.JOBS_TABLE,
        Key: { jobId: { S: jobId } },
        UpdateExpression: "SET #s = :s",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": { S: "FAILED" } },
      }));
    }
  }
};