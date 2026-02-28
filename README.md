# SnapSummarize ⚡

> AI-powered content summarization app built with serverless AWS architecture

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange?logo=amazon-aws)](https://aws.amazon.com/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![CDK](https://img.shields.io/badge/AWS_CDK-IaC-yellow)](https://aws.amazon.com/cdk/)

**Live Demo:** [https://d38fodes1k5hjx.cloudfront.net](https://d38fodes1k5hjx.cloudfront.net)

![SnapSummarize Screenshot](https://via.placeholder.com/800x400/0f172a/38bdf8?text=SnapSummarize+Demo)

## 🚀 Features

- **URL Summarization** - Paste any article/blog URL and get an AI-generated summary
- **File Upload** - Upload documents (PDF, TXT, DOC) for summarization
- **Sentiment Analysis** - Get sentiment classification (Positive/Negative/Neutral)
- **Key Phrase Extraction** - Automatically extracts important phrases
- **Email Notifications** - Receive email when your summary is ready
- **Real-time Status** - Live polling shows processing progress

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│ API Gateway │────▶│   Lambda    │
│  Frontend   │     │   (REST)    │     │  (Handler)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
       ┌───────────────────────────────────────┼───────────────────────────────────────┐
       │                                       ▼                                       │
       │                               ┌─────────────┐                                 │
       │                               │     SQS     │                                 │
       │                               │   (Queue)   │                                 │
       │                               └──────┬──────┘                                 │
       │                                      │                                        │
       │    ┌─────────────┐            ┌──────▼──────┐            ┌─────────────┐      │
       │    │  DynamoDB   │◀───────────│   Lambda    │───────────▶│ Hugging Face│      │
       │    │  (Storage)  │            │ (Processor) │            │     AI      │      │
       │    └─────────────┘            └──────┬──────┘            └─────────────┘      │
       │                                      │                                        │
       │                               ┌──────▼──────┐                                 │
       │                               │     SNS     │                                 │
       │                               │   (Email)   │                                 │
       │                               └─────────────┘                                 │
       │                                                                               │
       │    ┌─────────────┐            ┌─────────────┐                                 │
       │    │     S3      │◀───────────│ CloudFront  │◀──── Users                      │
       │    │  (Hosting)  │            │    (CDN)    │                                 │
       │    └─────────────┘            └─────────────┘                                 │
       │                                                                               │
       └───────────────────────────────── AWS Cloud ───────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **AWS Lambda** - Serverless compute (3 functions)
- **Amazon API Gateway** - RESTful API endpoints
- **Amazon SQS** - Message queue for async processing
- **Amazon DynamoDB** - NoSQL database for job storage
- **Amazon SNS** - Email notifications
- **Amazon S3** - File uploads & static website hosting
- **Amazon CloudFront** - CDN for global distribution
- **AWS CDK** - Infrastructure as Code (TypeScript)

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing

### AI/ML
- **Hugging Face Inference API** - AI model hosting
- **facebook/bart-large-cnn** - Text summarization model

## 📁 Project Structure

```
snap-summarize/
├── bin/
│   └── snap-summarize.ts        # CDK app entry point
├── lib/
│   └── snap-summarize-stack.ts  # AWS infrastructure definition
├── lambda/
│   ├── request-handler/         # Handles job submission
│   │   └── index.js
│   ├── processor/               # Processes content & calls AI
│   │   └── index.js
│   └── result-fetcher/          # Retrieves job results
│       └── index.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx     # Submit form
│   │   │   └── ResultsPage.jsx  # Results display
│   │   ├── api/
│   │   │   └── index.js         # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── cdk.json
├── package.json
└── README.md
```

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### Deploy Backend

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy infrastructure
cdk deploy
```

### Deploy Frontend

```bash
# Build frontend
cd frontend
npm install
npm run build

# Sync to S3 (replace with your bucket name)
aws s3 sync ./dist s3://YOUR_WEBSITE_BUCKET --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 🔌 API Reference

### Submit Job
```http
POST /submit
Content-Type: application/json

{
  "type": "url",           // "url" or "file"
  "input": "https://...",  // URL to summarize
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "jobId": "uuid-here",
  "status": "PENDING",
  "message": "Job accepted!"
}
```

### Get Results
```http
GET /results/{jobId}
```

**Response:**
```json
{
  "jobId": "uuid-here",
  "status": "COMPLETED",
  "summary": "AI generated summary...",
  "sentiment": "POSITIVE",
  "keyPhrases": ["phrase1", "phrase2"]
}
```

## 🔐 Environment Variables

The following are configured automatically via CDK:

| Variable | Description |
|----------|-------------|
| `JOBS_TABLE` | DynamoDB table name |
| `QUEUE_URL` | SQS queue URL |
| `UPLOADS_BUCKET` | S3 bucket for uploads |
| `TOPIC_ARN` | SNS topic for notifications |
| `HUGGINGFACE_API_KEY` | AI API key (stored in Lambda env) |

## 💡 How It Works

1. **User submits** a URL or uploads a file via the React frontend
2. **API Gateway** receives the request and triggers the Request Handler Lambda
3. **Request Handler** creates a job in DynamoDB and sends a message to SQS
4. **SQS** triggers the Processor Lambda asynchronously
5. **Processor** fetches the content, calls Hugging Face AI for summarization
6. **Results** are saved to DynamoDB and user is notified via SNS email
7. **Frontend polls** the results endpoint until status is COMPLETED
8. **Summary, sentiment, and key phrases** are displayed to the user

## 📊 Status Flow

```
PENDING → PROCESSING → COMPLETED
                    ↘ FAILED
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👤 Author

**Sinon Rodrigues**

- GitHub: [@sinonrodrigues](https://github.com/sinonrodrigues)

---

⭐ Star this repo if you found it helpful!
