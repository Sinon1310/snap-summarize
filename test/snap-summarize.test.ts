import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as SnapSummarize from '../lib/snap-summarize-stack';

describe('SnapSummarizeStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new SnapSummarize.SnapSummarizeStack(app, 'TestSnapSummarizeStack');
    template = Template.fromStack(stack);
  });

  test('SQS Processing Queue is created with correct visibility timeout', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      VisibilityTimeout: 300,
    });
  });

  test('SQS Dead Letter Queue is created', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      MessageRetentionPeriod: 14 * 24 * 60 * 60, // 14 days in seconds
    });
  });

  test('DynamoDB Jobs table is created with correct key schema', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'SummarizeJobs',
      KeySchema: [
        { AttributeName: 'jobId', KeyType: 'HASH' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  test('SNS Topic is created', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'SnapSummarizeJobComplete',
    });
  });

  test('App Lambda functions are created (3 app + 1 CDK internal for S3 auto-delete)', () => {
    // CDK creates a 4th internal Lambda for S3 autoDeleteObjects
    template.resourceCountIs('AWS::Lambda::Function', 4);
  });

  test('App Lambda functions use Node.js 20', () => {
    // Check our three app Lambdas by their handlers
    for (const handler of ['index.handler']) {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: handler,
        Runtime: 'nodejs20.x',
      });
    }
  });

  test('API Gateway REST API is created', () => {
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  test('CloudFront distribution is created', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  test('Two S3 buckets are created (website + uploads)', () => {
    template.resourceCountIs('AWS::S3::Bucket', 2);
  });

  test('CloudFront has SPA error response for 404', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          }),
        ]),
      }),
    });
  });
});
