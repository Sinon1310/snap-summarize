const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const https = require("https");

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({});
const s3 = new S3Client({});

// ─── STOP WORDS ─────────────────────────────────────────────────────
// Common English words to exclude from key phrase extraction
const STOP_WORDS = new Set([
  "about", "above", "after", "again", "against", "along", "also", "among",
  "another", "because", "been", "before", "being", "below", "between",
  "both", "could", "does", "doing", "down", "during", "each", "every",
  "first", "from", "further", "going", "have", "having", "here", "hers",
  "herself", "himself", "however", "http", "https", "i", "into", "its",
  "itself", "just", "know", "like", "many", "might", "more", "most",
  "much", "must", "myself", "never", "only", "other", "ought", "ours",
  "ourselves", "over", "own", "same", "shall", "she", "should",
  "some", "such", "than", "that", "the", "their", "them", "then",
  "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "upon", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will",
  "with", "would", "your", "yours", "yourself", "yourselves",
  "also", "been", "being", "come", "could", "did", "does", "done",
  "for", "from", "get", "got", "had", "has", "have", "her", "him",
  "his", "how", "its", "let", "may", "nor", "not", "now", "old",
  "one", "our", "out", "own", "put", "say", "she", "too", "use",
  "way", "who", "why", "all", "and", "are", "but", "can", "few",
  "new", "per", "the", "was", "you", "able", "even", "make", "made",
  "said", "well", "will", "back", "still", "since", "take", "took",
  "used", "using", "find", "found", "give", "include", "keep", "last",
  "long", "look", "make", "mean", "need", "next", "part", "show",
  "than", "tell", "turn", "want", "went", "work", "year", "years",
  "page", "text", "click", "link", "menu", "search",
  "cookie", "cookies", "privacy", "accept", "website", "view",
  "read", "article", "content", "wikipedia", "help", "edit",
  "free", "jump", "navigation", "main", "section",
  "function", "return", "script", "style", "class", "document",
  "window", "event", "element", "value", "null", "undefined", "true", "false",
  "loading", "loaded", "gform"
]);

// ─── SUMMARIZE (Hugging Face) ───────────────────────────────────────
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

// ─── SENTIMENT ──────────────────────────────────────────────────────
const getSentiment = (text) => {
  const lower = text.toLowerCase();
  const positiveWords = [
    "good", "great", "excellent", "amazing", "wonderful", "fantastic",
    "positive", "success", "successful", "happy", "best", "improve",
    "improved", "benefit", "beneficial", "advantage", "growth",
    "opportunity", "innovation", "innovative", "progress", "achieve",
    "breakthrough", "remarkable", "outstanding", "promising", "advance"
  ];
  const negativeWords = [
    "bad", "terrible", "awful", "horrible", "negative", "fail", "failed",
    "failure", "worst", "poor", "sad", "wrong", "problem", "crisis",
    "danger", "dangerous", "threat", "risk", "decline", "loss",
    "damage", "conflict", "concern", "critical", "severe", "disaster",
    "catastrophe", "devastating", "harmful", "controversial"
  ];

  let positive = 0;
  let negative = 0;
  for (const w of positiveWords) {
    const regex = new RegExp("\\b" + w + "\\b", "gi");
    const matches = lower.match(regex);
    if (matches) positive += matches.length;
  }
  for (const w of negativeWords) {
    const regex = new RegExp("\\b" + w + "\\b", "gi");
    const matches = lower.match(regex);
    if (matches) negative += matches.length;
  }

  if (positive > 0 && negative > 0 && Math.abs(positive - negative) <= 2) return "MIXED";
  if (positive > negative) return "POSITIVE";
  if (negative > positive) return "NEGATIVE";
  return "NEUTRAL";
};

// ─── KEY PHRASES ────────────────────────────────────────────────────
const getKeyPhrases = (text) => {
  // Clean text: only letters, spaces, hyphens
  const cleaned = text.toLowerCase().replace(/[^a-z\s\-]/g, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(w => w.length > 2);

  // Build bigrams (two-word phrases) and unigrams
  const phraseFreq = {};
  const wordFreq = {};

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // Skip stop words and code-like tokens
    if (STOP_WORDS.has(w)) continue;
    if (w.length > 25) continue; // skip impossibly long "words" (concatenated JS)
    if (/^[a-z]{1,2}$/.test(w)) continue; // skip 1-2 letter words
    if (/(.)\1{3,}/.test(w)) continue; // skip repeating chars (e.g. "aaaa")

    wordFreq[w] = (wordFreq[w] || 0) + 1;

    // Bigrams
    if (i < words.length - 1) {
      const next = words[i + 1];
      if (!STOP_WORDS.has(next) && next.length > 2 && next.length <= 25) {
        const bigram = `${w} ${next}`;
        phraseFreq[bigram] = (phraseFreq[bigram] || 0) + 1;
      }
    }
  }

  // Boost bigrams that appear 2+ times, then fill with top unigrams
  const results = [];

  // Get top bigrams
  const topBigrams = Object.entries(phraseFreq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
  results.push(...topBigrams);

  // Get top unigrams (not already part of a selected bigram)
  const bigramWords = new Set(topBigrams.flatMap(b => b.split(" ")));
  const topWords = Object.entries(wordFreq)
    .filter(([word]) => !bigramWords.has(word) && word.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10 - results.length)
    .map(([word]) => word);
  results.push(...topWords);

  return results.slice(0, 8);
};

// ─── URL FETCHER (properly strips JS/CSS/boilerplate) ───────────────
const fetchUrl = (url) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const mod = urlObj.protocol === "https:" ? https : require("http");

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SnapSummarize/1.0; +https://snapsummarize.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    };

    const handleResponse = (res) => {
      // Follow redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : `${urlObj.protocol}//${urlObj.hostname}${res.headers.location}`;
        console.log("Following redirect to:", redirectUrl);
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }

      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        const text = extractText(body);
        console.log("Extracted text length:", text.length);
        console.log("First 200 chars:", text.slice(0, 200));
        resolve(text.slice(0, 5000));
      });
    };

    mod.get(options, handleResponse).on("error", reject);
  });
};

// ─── HTML → CLEAN TEXT ──────────────────────────────────────────────
const extractText = (html) => {
  let text = html;

  // 1. Remove everything we don't want BEFORE tag stripping
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  text = text.replace(/<header[\s\S]*?<\/header>/gi, " ");
  text = text.replace(/<aside[\s\S]*?<\/aside>/gi, " ");
  text = text.replace(/<form[\s\S]*?<\/form>/gi, " ");
  text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, " ");
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");

  // 2. Try to extract just <article> or <main> content if present
  const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (articleMatch) {
    text = articleMatch[1];
  } else if (mainMatch) {
    text = mainMatch[1];
  } else if (bodyMatch) {
    text = bodyMatch[1];
  }

  // 3. Strip remaining HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // 4. Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#039;/g, "'");
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&#\d+;/g, " ");

  // 5. Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  // 6. Filter out lines that look like code/JS (very long "words" without spaces)
  const sentences = text.split(/[.!?]+/).filter(s => {
    const words = s.trim().split(/\s+/);
    // Skip if it has extremely long words (code concatenation)
    if (words.some(w => w.length > 40)) return false;
    // Skip if mostly non-alpha characters
    const alphaRatio = (s.replace(/[^a-zA-Z]/g, "").length) / (s.length || 1);
    if (alphaRatio < 0.5) return false;
    // Skip very short fragments
    if (words.length < 3) return false;
    return true;
  });

  return sentences.join(". ").trim();
};

// ─── S3 FETCHER ─────────────────────────────────────────────────────
const fetchS3 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.UPLOADS_BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const text = await response.Body.transformToString();
  return text.slice(0, 5000);
};

// ─── MAIN HANDLER ───────────────────────────────────────────────────
exports.handler = async (event) => {
  for (const record of event.Records) {
    const { jobId, type, input, email } = JSON.parse(record.body);

    try {
      // Mark as PROCESSING
      await dynamo.send(new UpdateItemCommand({
        TableName: process.env.JOBS_TABLE,
        Key: { jobId: { S: jobId } },
        UpdateExpression: "SET #s = :s",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": { S: "PROCESSING" } },
      }));

      // Fetch content
      let text = "";
      if (type === "url") {
        text = await fetchUrl(input);
      } else {
        text = await fetchS3(input);
      }

      console.log("Cleaned text length:", text.length);

      if (text.length < 50) {
        throw new Error("Not enough readable content extracted from the source.");
      }

      // AI Summarization
      const summary = await summarize(text);

      // Analysis
      const sentiment = getSentiment(text);
      const keyPhrases = getKeyPhrases(text);

      // Save results
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

      // Notify via SNS
      await sns.send(new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: "Your SnapSummarize Result is Ready! ⚡",
        Message: `Your summary is ready!\n\nJob ID: ${jobId}\nSentiment: ${sentiment}\n\nSummary:\n${summary}\n\nKey Topics: ${keyPhrases.join(", ")}`,
      }));

    } catch (err) {
      console.error(`Failed to process job ${jobId}:`, err);
      await dynamo.send(new UpdateItemCommand({
        TableName: process.env.JOBS_TABLE,
        Key: { jobId: { S: jobId } },
        UpdateExpression: "SET #s = :s, errorMessage = :e",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":s": { S: "FAILED" },
          ":e": { S: err.message || "Unknown error" },
        },
      }));
    }
  }
};