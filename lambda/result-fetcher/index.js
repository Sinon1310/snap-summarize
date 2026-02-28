const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({});

exports.handler = async (event) => {
  try {
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return response(400, { error: "Missing jobId" });
    }

    const result = await dynamo.send(new GetItemCommand({
      TableName: process.env.JOBS_TABLE,
      Key: { jobId: { S: jobId } },
    }));

    if (!result.Item) {
      return response(404, { error: "Job not found" });
    }

    const item = result.Item;

    return response(200, {
      jobId: item.jobId.S,
      status: item.status.S,
      type: item.type?.S,
      timestamp: item.timestamp?.S,
      summary: item.summary?.S || null,
      sentiment: item.sentiment?.S || null,
      keyPhrases: item.keyPhrases?.S ? JSON.parse(item.keyPhrases.S) : [],
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