import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AuthStack } from '../lib/auth-stack';
import { BackendStack } from '../lib/backend-stack';
import { LocationStack } from '../lib/location-stack';

describe('VoiceTrail CDK Stacks', () => {
  test('AuthStack creates Cognito resources', () => {
    const app = new cdk.App();
    const stack = new AuthStack(app, 'TestAuthStack');
    const template = Template.fromStack(stack);

    // Verify that the stack creates a Cognito User Pool
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    
    // Verify that the stack creates a Cognito User Pool Client
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    
    // Verify that the User Pool has the expected properties
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'voice-trail-user-pool',
      AutoVerifiedAttributes: ['email'],
      Schema: [
        {
          Name: 'email',
          Required: true,
          Mutable: true,
        },
        {
          Name: 'given_name',
          Required: true,
          Mutable: true,
        },
        {
          Name: 'family_name',
          Required: true,
          Mutable: true,
        },
      ],
    });
  });

  test('BackendStack creates AppSync and Timestream resources', () => {
    const app = new cdk.App();
    
    // Create the auth stack first to get the user pool
    const authStack = new AuthStack(app, 'TestAuthStack');
    
    // Create the backend stack with the user pool from the auth stack
    const backendStack = new BackendStack(app, 'TestBackendStack', {
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
    });
    
    const template = Template.fromStack(backendStack);

    // Verify that the stack creates a Timestream database
    template.resourceCountIs('AWS::Timestream::Database', 1);
    
    // Verify that the stack creates a Timestream table
    template.resourceCountIs('AWS::Timestream::Table', 1);
    
    // Verify that the stack creates an AppSync API
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    
    // Verify that the stack creates a Lambda function
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });

  test('LocationStack creates AWS Location Service resources', () => {
    const app = new cdk.App();
    
    // Create the auth stack first to get the user pool
    const authStack = new AuthStack(app, 'TestAuthStack');
    
    // Create the backend stack to get the AppSync API
    const backendStack = new BackendStack(app, 'TestBackendStack', {
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
    });
    
    // Create the location stack with the AppSync API from the backend stack
    const locationStack = new LocationStack(app, 'TestLocationStack', {
      api: backendStack.api,
    });
    
    const template = Template.fromStack(locationStack);

    // Verify that the stack creates an AWS Location Service map
    template.resourceCountIs('AWS::Location::Map', 1);
    
    // Verify that the stack creates an AWS Location Service route calculator
    template.resourceCountIs('AWS::Location::RouteCalculator', 1);
    
    // Verify that the stack creates a Lambda function
    template.resourceCountIs('AWS::Lambda::Function', 1);
    
    // Verify that the Lambda function has the necessary permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'geo:GetMap*',
              'geo:SearchPlaceIndexForPosition',
              'geo:SearchPlaceIndexForText',
              'geo:CalculateRoute',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });
    
    // Verify that the Lambda function has permissions to use Polly
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
  });
});