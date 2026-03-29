import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';

export class SnapSummarizeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----------------------------------------
    // 1. S3 BUCKETS
    // ----------------------------------------
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    // ----------------------------------------
    // 2. CLOUDFRONT (with OAC for private S3 bucket)
    // ----------------------------------------
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      // SPA routing: serve index.html for 403/404s so React Router handles the path
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // ----------------------------------------
    // 3. DYNAMODB TABLE
    // ----------------------------------------
    const jobsTable = new dynamodb.Table(this, 'SummarizeJobsTable', {
      tableName: 'SummarizeJobs',
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ----------------------------------------
    // 4. SQS QUEUE + DEAD LETTER QUEUE
    // ----------------------------------------

    // DLQ: captures messages that fail after 3 processing attempts
    const processingDLQ = new sqs.Queue(this, 'ProcessingDLQ', {
      queueName: 'SnapSummarizeProcessingDLQ',
      retentionPeriod: cdk.Duration.days(14),
    });

    const processingQueue = new sqs.Queue(this, 'ProcessingQueue', {
      queueName: 'SnapSummarizeProcessingQueue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: processingDLQ,
        maxReceiveCount: 3,
      },
    });

    // ----------------------------------------
    // 5. SNS TOPIC
    // ----------------------------------------
    const jobCompleteTopic = new sns.Topic(this, 'JobCompleteTopic', {
      topicName: 'SnapSummarizeJobComplete',
    });

    // ----------------------------------------
    // 6. LAMBDA FUNCTIONS
    // ----------------------------------------

    // Function 1: RequestHandler
    const requestHandler = new lambda.Function(this, 'RequestHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/request-handler')),
      environment: {
        JOBS_TABLE: jobsTable.tableName,
        QUEUE_URL: processingQueue.queueUrl,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Function 2: Processor
    // IMPORTANT: Set HF_TOKEN before deploying: export HF_TOKEN=your_hugging_face_token
    // Without this token the processor Lambda will fail to call the Hugging Face API.
    const processor = new lambda.Function(this, 'Processor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/processor')),
      environment: {
        JOBS_TABLE: jobsTable.tableName,
        SNS_TOPIC_ARN: jobCompleteTopic.topicArn,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
        HF_TOKEN: process.env.HF_TOKEN || '',
      },
      timeout: cdk.Duration.seconds(300),
      memorySize: 512,
    });

    // Function 3: ResultFetcher
    const resultFetcher = new lambda.Function(this, 'ResultFetcher', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/result-fetcher')),
      environment: {
        JOBS_TABLE: jobsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // ----------------------------------------
    // 7. PERMISSIONS (least-privilege)
    // ----------------------------------------
    jobsTable.grantWriteData(requestHandler);
    processingQueue.grantSendMessages(requestHandler);
    uploadsBucket.grantPut(requestHandler);

    jobsTable.grantWriteData(processor);
    processingQueue.grantConsumeMessages(processor);
    uploadsBucket.grantRead(processor);
    jobCompleteTopic.grantPublish(processor);

    jobsTable.grantReadData(resultFetcher);

    // ----------------------------------------
    // 8. SQS TRIGGERS PROCESSOR
    // ----------------------------------------
    processor.addEventSource(new lambdaEventSources.SqsEventSource(processingQueue, {
      batchSize: 1,
    }));

    // ----------------------------------------
    // 9. API GATEWAY (with rate limiting)
    // ----------------------------------------
    const api = new apigateway.RestApi(this, 'SnapSummarizeApi', {
      restApiName: 'SnapSummarize API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 10,      // 10 requests per second
        throttlingBurstLimit: 20,     // Burst capacity of 20 requests
      },
    });

    const submitResource = api.root.addResource('submit');
    submitResource.addMethod('POST', new apigateway.LambdaIntegration(requestHandler));

    const resultsResource = api.root.addResource('results');
    const jobIdResource = resultsResource.addResource('{jobId}');
    jobIdResource.addMethod('GET', new apigateway.LambdaIntegration(resultFetcher));

    // ----------------------------------------
    // 10. OUTPUTS
    // ----------------------------------------
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Your website URL',
    });

    new cdk.CfnOutput(this, 'ApiURL', {
      value: api.url,
      description: 'Your API URL — paste this into frontend/.env as VITE_API_BASE_URL',
    });

    new cdk.CfnOutput(this, 'UploadsBucketName', {
      value: uploadsBucket.bucketName,
      description: 'S3 bucket for uploads',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for website hosting — use this in the frontend deploy command',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'DLQUrl', {
      value: processingDLQ.queueUrl,
      description: 'Dead Letter Queue URL — monitor this for failed processing jobs',
    });
  }
}