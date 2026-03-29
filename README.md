# SnapSummarize ⚡

> A serverless, cloud-native content summarization service powered by AWS and AI.

![AWS](https://img.shields.io/badge/AWS-Serverless-orange?logo=amazon-aws)
![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)
![CDK](https://img.shields.io/badge/IaC-AWS_CDK-yellow)
![Status](https://img.shields.io/badge/Status-Live-brightgreen)


---

## 🧠 The Problem
Professionals, students, and researchers are constantly overwhelmed by long articles, reports, and documents. Reading everything in full is time-consuming and inefficient.

## ✅ The Solution
SnapSummarize lets you paste any URL or upload a document and instantly get:
- 📝 An AI-generated summary
- 😊 Sentiment analysis (Positive / Neutral / Negative)
- 🏷️ Key phrases extracted from the content
- 📧 Email notification when your summary is ready

---

## 🏗️ Architecture

![SnapSummarize Architecture Diagram](docs/architecture-diagram.png)

### Event-Driven System Flow

**Frontend Layer:**
- Users access the React frontend via **CloudFront CDN** (served from **S3**)
- Web browser makes API requests to **API Gateway**

**API Layer:**
- **API Gateway** receives REST API requests and routes to Lambda functions

**Backend Layer (Lambda Functions):**

1. **Lambda 1: Request Handler**
   - Validates input (rate limiting, URL validation)
   - Stores job in **DynamoDB** with status `PENDING`
   - Queues job to **Amazon SQS**

2. **Lambda 2: Processor** (Triggered by SQS)
   - Fetches content from URL or **S3** (file uploads)
   - Calls **Hugging Face API** (BART model) for AI summarization
   - Performs sentiment analysis and key phrase extraction
   - Updates **DynamoDB** with status `COMPLETED` and results
   - Sends email notification via **Amazon SNS**

3. **Lambda 3: Result Fetcher**
   - Frontend polls this Lambda every 3 seconds
   - Reads job status and results from **DynamoDB**
   - Returns to frontend for display

**Storage & Messaging:**
- **DynamoDB** - Stores job status, summaries, sentiment, key phrases
- **SQS** - Message queue for async job processing
- **S3** - File uploads bucket (pre-signed URLs)

**Notification:**
- **SNS** - Sends email alerts when summaries are ready

### Why Serverless + SQS?
The system is **asynchronous and event-driven**. When a user submits a job:
1. The request is immediately accepted (202 response) — no waiting
2. A message is placed on an SQS queue
3. The Processor Lambda picks it up independently
4. Results are stored in DynamoDB and user is notified via email

This design ensures **loose coupling**, **high scalability**, and **resilience** — if the processor fails, the message stays in the queue and retries automatically.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| API | Amazon API Gateway (REST) |
| Compute | AWS Lambda (Node.js 20) |
| Queue | Amazon SQS |
| Database | Amazon DynamoDB |
| Notifications | Amazon SNS |
| Storage | Amazon S3 |
| CDN | Amazon CloudFront |
| AI/ML | Hugging Face (facebook/bart-large-cnn) |
| IaC | AWS CDK (TypeScript) |
| Region | ap-south-1 (Mumbai) |

---

## 🚀 Features

- **Asynchronous Processing** — jobs are queued and processed in the background
- **AI Summarization** — uses facebook/bart-large-cnn model via Hugging Face Inference API
- **Sentiment Analysis** — detects positive, neutral, or negative tone
- **Key Phrase Extraction** — identifies the most important topics
- **Email Notifications** — get notified via SNS when your summary is ready
- **File + URL Support** — submit a web URL or upload a document directly
- **Infrastructure as Code** — entire AWS stack defined in CDK TypeScript
- **Fully Serverless** — no servers to manage, scales automatically

---

## 📁 Project Structure
```
snap-summarize/
├── bin/
│   └── snap-summarize.ts          # CDK app entry point
├── lib/
│   └── snap-summarize-stack.ts    # All AWS infrastructure (CDK)
├── lambda/
│   ├── request-handler/
│   │   └── index.js               # Validates input, queues job
│   ├── processor/
│   │   └── index.js               # Fetches content, runs AI, saves results
│   └── result-fetcher/
│       └── index.js               # Returns results from DynamoDB
├── frontend/
│   └── src/                       # React + Vite frontend
└── README.md
```

---

## ⚙️ How to Deploy

### Prerequisites
- AWS Account + AWS CLI configured
- Node.js 18+
- AWS CDK installed (`npm install -g aws-cdk`)
- Hugging Face account + API token

### 1. Clone the repo
```bash
git clone https://github.com/Sinon1310/snap-summarize.git
cd snap-summarize
npm install
```

### 2. Set your Hugging Face token
```bash
export HF_TOKEN=your_hugging_face_token_here
```

### 3. Bootstrap and deploy
```bash
cdk bootstrap
cdk deploy
```

### 4. Build and deploy frontend

After `cdk deploy` completes, note the outputs printed in your terminal:

```bash
# Get your outputs at any time with:
aws cloudformation describe-stacks --stack-name SnapSummarizeStack \
  --query 'Stacks[0].Outputs' --output table
```

Then build and upload the frontend:

```bash
cd frontend
npm install

# Set your API URL from the CDK output (ApiURL)
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL to the ApiURL value from CDK output

npm run build

# Deploy to S3 — use WebsiteBucketName from CDK output
aws s3 sync ./dist s3://$(aws cloudformation describe-stacks \
  --stack-name SnapSummarizeStack \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
  --output text) --delete
```

---

## 🔐 Security

- All IAM roles follow the **principle of least privilege** — each Lambda only has permissions it needs
- The uploads S3 bucket blocks all public access
- Files are accessed via **pre-signed URLs** — never exposed directly
- API keys are stored as **environment variables**, never hardcoded in source code

---

## 💡 What I Learned

- **Event-driven architecture** — how SQS decouples services for resilience and scalability
- **Infrastructure as Code** — managing cloud resources with AWS CDK instead of clicking in the console
- **Serverless design patterns** — async job processing with Lambda + SQS
- **AI API integration** — calling Hugging Face inference endpoints from a Lambda function
- **AWS IAM** — applying least privilege permissions across services
- **Real-world debugging** — reading CloudWatch logs, fixing API errors, iterating fast

---

## 👤 Author

**Sinon Rodrigues**
- GitHub: [@Sinon1310](https://github.com/Sinon1310)

---

*Built with ☁️ on AWS*

