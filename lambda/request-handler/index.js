const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const dynamo = new DynamoDBClient({});
const sqs = new SQSClient({});
const s3 = new S3Client({});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { type, input, email } = body;

    // Validate input
    if (!type || !email) {
      return response(400, { error: "Missing required fields: type, email" });
    }
    if (type === "url" && !input) {
      return response(400, { error: "Missing URL input" });
    }
    if (!["url", "file"].includes(type)) {
      return response(400, { error: "Type must be 'url' or 'file'" });
    }

    const jobId = randomUUID();
    const timestamp = new Date().toISOString();

    // If file upload, generate a pre-signed S3 URL
    let uploadUrl = null;
    let s3Key = null;
    if (type === "file") {
      s3Key = `uploads/${jobId}`;
      const command = new PutObjectCommand({
        Bucket: process.env.UPLOADS_BUCKET,
        Key: s3Key,
      });
      uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    }

    // Save job to DynamoDB
    await dynamo.send(new PutItemCommand({
      TableName: process.env.JOBS_TABLE,
      Item: {
        jobId: { S: jobId },
        status: { S: "PENDING" },
        type: { S: type },
        input: { S: type === "url" ? input : s3Key },
        email: { S: email },
        timestamp: { S: timestamp },
      },
    }));

    // Send message to SQS
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify({ jobId, type, input: type === "url" ? input : s3Key, email }),
    }));

    return response(202, {
      jobId,
      status: "PENDING",
      message: "Job accepted! You'll receive an email when it's ready.",
      ...(uploadUrl && { uploadUrl }),
    });

  } catch (err) {
    console.error(err);
    return response(500, { error: "Internal server error" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});