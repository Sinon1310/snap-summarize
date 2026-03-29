const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const dynamo = new DynamoDBClient({});
const sqs = new SQSClient({});
const s3 = new S3Client({});

// ─── Rate Limiting ───────────────────────────────────────────────────────
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const windowKey = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  
  // Clean up old entries
  for (const [key] of rateLimit) {
    if (!key.startsWith(ip) || parseInt(key.split(':')[1]) < Math.floor(now / RATE_LIMIT_WINDOW) - 1) {
      rateLimit.delete(key);
    }
  }
  
  const count = (rateLimit.get(windowKey) || 0) + 1;
  rateLimit.set(windowKey, count);
  
  return count <= MAX_REQUESTS_PER_WINDOW;
}

// ─── Input Validation ─────────────────────────────────────────────────────
function validateUrl(url) {
  try {
    const parsed = new URL(url);
    
    // Block localhost, private IPs, file:// protocol
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname.startsWith('127.') || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        parsed.protocol === 'file:') {
      return false;
    }
    
    // Only allow http/https
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

exports.handler = async (event) => {
  try {
    // Rate limiting check
    const ip = event.requestContext?.identity?.sourceIp || 'unknown';
    if (!checkRateLimit(ip)) {
      return response(429, { error: "Rate limit exceeded. Maximum 5 requests per minute. Please try again later." });
    }

    const body = JSON.parse(event.body || "{}");
    const { type, input, email } = body;

    // Validate required fields
    if (!type || !email) {
      return response(400, { error: "Missing required fields: type, email" });
    }
    if (!["url", "file"].includes(type)) {
      return response(400, { error: "Type must be 'url' or 'file'" });
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      return response(400, { error: "Invalid email address" });
    }
    
    // Validate URL if type is url
    if (type === "url") {
      if (!input) {
        return response(400, { error: "Missing URL input" });
      }
      if (!validateUrl(input)) {
        return response(400, { error: "Invalid URL. Only http/https URLs are allowed, and localhost/private IPs are blocked." });
      }
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