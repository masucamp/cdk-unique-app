import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MainStack } from '../lib/main-stack';

describe('VoiceGuide Stack', () => {
  const app = new cdk.App();
  const stack = new MainStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  test('Contains Cognito User Pool', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: expect.stringContaining('UserPool'),
      AutoVerifiedAttributes: ['email'],
    });
  });

  test('Contains AWS Location Service Map', () => {
    template.hasResourceProperties('AWS::Location::Map', {
      MapName: 'VoiceGuideMap',
      Configuration: {
        Style: 'VectorEsriNavigation',
      },
    });
  });

  test('Contains AWS Location Service Place Index', () => {
    template.hasResourceProperties('AWS::Location::PlaceIndex', {
      IndexName: 'VoiceGuidePlaceIndex',
      DataSource: 'Esri',
    });
  });

  test('Contains AWS Timestream Database', () => {
    template.hasResourceProperties('AWS::Timestream::Database', {
      DatabaseName: 'VoiceGuideDB',
    });
  });

  test('Contains AWS Timestream Table', () => {
    template.hasResourceProperties('AWS::Timestream::Table', {
      DatabaseName: 'VoiceGuideDB',
      TableName: 'UserInteractions',
    });
  });

  test('Contains AppSync GraphQL API', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'VoiceGuideAPI',
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
    });
  });

  test('Contains Amplify App', () => {
    template.hasResourceProperties('AWS::Amplify::App', {
      Name: 'VoiceGuide',
    });
  });
});