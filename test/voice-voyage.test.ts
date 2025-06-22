import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VoiceVoyageStack } from '../lib/voice-voyage-stack';

describe('VoiceVoyage Stack', () => {
  const app = new cdk.App();
  const stack = new VoiceVoyageStack(app, 'TestVoiceVoyageStack');
  const template = Template.fromStack(stack);

  test('Cognito User Pool Created', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'VoiceVoyageUserPool',
    });
  });

  test('DynamoDB Table Created', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'entryId',
          KeyType: 'RANGE',
        },
      ],
    });
  });

  test('API Gateway Created', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'VoiceVoyage API',
    });
  });

  test('Lambda Functions Created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 5);
  });

  test('S3 Bucket Created for Frontend', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      WebsiteConfiguration: {
        IndexDocument: 'index.html',
      },
    });
  });

  test('CloudFront Distribution Created', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  test('Timestream Database Created', () => {
    template.hasResourceProperties('AWS::Timestream::Database', {
      DatabaseName: 'VoiceVoyageDB',
    });
  });

  test('Location Service Map Created', () => {
    template.hasResourceProperties('AWS::Location::Map', {
      MapName: 'VoiceVoyageMap',
    });
  });
});