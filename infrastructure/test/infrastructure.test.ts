import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Infrastructure from '../lib/appsync-stack';
import * as Lambda from '../lib/lambda-stack';
import * as Timestream from '../lib/timestream-stack';
import * as Iam from '../lib/iam-stack';

// Mock AWS Lambda functions for testing
const mockTextToSpeechFunction = {
  functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:TextToSpeechFunction',
} as any;

const mockSentimentAnalysisFunction = {
  functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:SentimentAnalysisFunction',
} as any;

const mockTimeseriesDataFunction = {
  functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:TimeseriesDataFunction',
} as any;

// Mock IAM role for testing
const mockLambdaRole = {
  roleArn: 'arn:aws:iam::123456789012:role/VoiceSentinelLambdaRole',
} as any;

// Mock Timestream database and table for testing
const mockTimestreamDatabase = {
  databaseName: 'voice-sentinel-db',
} as any;

const mockTimestreamTable = {
  tableName: 'sentiment-analysis',
} as any;

describe('VoiceSentinel Infrastructure', () => {
  test('IAM Stack Creates Lambda Role', () => {
    const app = new cdk.App();
    const stack = new Iam.VoiceSentinelIamStack(app, 'TestIamStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          },
        ],
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
            ],
          ],
        },
      ],
    });

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'polly:SynthesizeSpeech',
              'polly:DescribeVoices',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'comprehend:DetectSentiment',
              'comprehend:BatchDetectSentiment',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'timestream:WriteRecords',
              'timestream:Select',
              'timestream:DescribeTable',
              'timestream:ListMeasures',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });
  });

  test('Timestream Stack Creates Database and Table', () => {
    const app = new cdk.App();
    const stack = new Timestream.VoiceSentinelTimestreamStack(app, 'TestTimestreamStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Timestream::Database', {
      DatabaseName: 'voice-sentinel-db',
    });

    template.hasResourceProperties('AWS::Timestream::Table', {
      DatabaseName: 'voice-sentinel-db',
      TableName: 'sentiment-analysis',
      RetentionProperties: {
        MemoryStoreRetentionPeriodInHours: '24',
        MagneticStoreRetentionPeriodInDays: '7',
      },
    });
  });

  test('AppSync Stack Creates GraphQL API', () => {
    const app = new cdk.App();
    const stack = new Infrastructure.VoiceSentinelAppSyncStack(app, 'TestAppSyncStack', {
      textToSpeechFunction: mockTextToSpeechFunction,
      sentimentAnalysisFunction: mockSentimentAnalysisFunction,
      timeseriesDataFunction: mockTimeseriesDataFunction,
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'voice-sentinel-api',
      AuthenticationType: 'API_KEY',
      XrayEnabled: true,
    });

    template.hasResourceProperties('AWS::AppSync::DataSource', {
      Type: 'AWS_LAMBDA',
    });

    template.hasResourceProperties('AWS::AppSync::Resolver', {
      TypeName: 'Mutation',
      FieldName: 'convertTextToSpeech',
    });

    template.hasResourceProperties('AWS::AppSync::Resolver', {
      TypeName: 'Mutation',
      FieldName: 'analyzeSentiment',
    });

    template.hasResourceProperties('AWS::AppSync::Resolver', {
      TypeName: 'Mutation',
      FieldName: 'storeSentimentData',
    });

    template.hasResourceProperties('AWS::AppSync::Resolver', {
      TypeName: 'Query',
      FieldName: 'getSentimentHistory',
    });
  });
});