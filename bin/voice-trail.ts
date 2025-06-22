#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { BackendStack } from '../lib/backend-stack';
import { LocationStack } from '../lib/location-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();

// Create authentication stack with Cognito
const authStack = new AuthStack(app, 'VoiceTrailAuthStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  description: 'VoiceTrail Authentication Stack with AWS Cognito',
});

// Create backend stack with AppSync and Timestream
const backendStack = new BackendStack(app, 'VoiceTrailBackendStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  description: 'VoiceTrail Backend Stack with AWS AppSync and AWS Timestream',
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

// Create location stack with AWS Location Service and Polly
const locationStack = new LocationStack(app, 'VoiceTrailLocationStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  description: 'VoiceTrail Location Stack with AWS Location Service and AWS Polly',
  api: backendStack.api,
});

// Create frontend stack with Amplify
new FrontendStack(app, 'VoiceTrailFrontendStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  description: 'VoiceTrail Frontend Stack with AWS Amplify',
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  api: backendStack.api,
});

app.synth();