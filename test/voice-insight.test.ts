import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VoiceInsightStack } from '../lib/voice-insight-stack';

describe('VoiceInsightStack', () => {
  const app = new cdk.App();
  const stack = new VoiceInsightStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  test('Timestream Database Created', () => {
    template.hasResourceProperties('AWS::Timestream::Database', {
      DatabaseName: 'voice-insight-db'
    });
  });

  test('Timestream Table Created', () => {
    template.hasResourceProperties('AWS::Timestream::Table', {
      TableName: 'voice-analysis-results',
      DatabaseName: 'voice-insight-db'
    });
  });

  test('AppSync API Created', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'voice-insight-api',
      AuthenticationType: 'API_KEY'
    });
  });

  test('Lambda Function Created', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
      Handler: 'index.handler'
    });
  });

  test('S3 Bucket Created', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      WebsiteConfiguration: {
        IndexDocument: 'index.html',
        ErrorDocument: 'index.html'
      }
    });
  });

  test('CloudFront Distribution Created', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html'
      }
    });
  });
});