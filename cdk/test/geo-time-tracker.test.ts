import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as GeoTimeTracker from '../lib/geo-time-tracker-stack';

test('GeoTimeTracker Stack Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new GeoTimeTracker.GeoTimeTrackerStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);

  // Verify Timestream resources
  template.resourceCountIs('AWS::Timestream::Database', 1);
  template.resourceCountIs('AWS::Timestream::Table', 1);
  
  // Verify Location Service resources
  template.resourceCountIs('AWS::Location::Map', 1);
  template.resourceCountIs('AWS::Location::Tracker', 1);
  
  // Verify AppSync API
  template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  
  // Verify Lambda functions
  template.resourceCountIs('AWS::Lambda::Function', 3); // Data processor, simulator, and IoT endpoint getter
  
  // Verify IoT rule
  template.resourceCountIs('AWS::IoT::TopicRule', 1);
  
  // Verify Cognito resources
  template.resourceCountIs('AWS::Cognito::UserPool', 1);
  template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
  
  // Verify Amplify app
  template.resourceCountIs('AWS::Amplify::App', 1);
});