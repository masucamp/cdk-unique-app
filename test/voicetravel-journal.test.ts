import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VoiceTravelJournalStack } from '../lib/voicetravel-journal-stack';

describe('VoiceTravelJournalStack', () => {
  const app = new cdk.App();
  const stack = new VoiceTravelJournalStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  test('DynamoDB Table Created', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'createdAt',
          KeyType: 'RANGE'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    });
  });

  test('Cognito User Pool Created', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AutoVerifyAttributes: ['email'],
      SelfSignUpEnabled: true
    });
  });

  test('AppSync GraphQL API Created', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS'
    });
  });

  test('S3 Bucket Created', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT'],
            AllowedOrigins: ['*']
          }
        ]
      }
    });
  });

  test('Lambda Functions Created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 2);
  });

  test('AWS Location Service Resources Created', () => {
    template.hasResourceProperties('AWS::Location::Map', {
      MapName: 'VoiceTravelMap',
      Configuration: {
        Style: 'VectorEsriStreets'
      }
    });

    template.hasResourceProperties('AWS::Location::PlaceIndex', {
      DataSource: 'Esri',
      IndexName: 'VoiceTravelPlaceIndex'
    });
  });
});