#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VoiceSentinelAppSyncStack } from '../lib/appsync-stack';
import { VoiceSentinelLambdaStack } from '../lib/lambda-stack';
import { VoiceSentinelTimestreamStack } from '../lib/timestream-stack';
import { VoiceSentinelIamStack } from '../lib/iam-stack';

const app = new cdk.App();

// Create the stacks
const iamStack = new VoiceSentinelIamStack(app, 'VoiceSentinelIamStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

const timestreamStack = new VoiceSentinelTimestreamStack(app, 'VoiceSentinelTimestreamStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

const lambdaStack = new VoiceSentinelLambdaStack(app, 'VoiceSentinelLambdaStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  iamRole: iamStack.lambdaRole,
  timestreamDatabase: timestreamStack.database,
  timestreamTable: timestreamStack.table,
});

const appSyncStack = new VoiceSentinelAppSyncStack(app, 'VoiceSentinelAppSyncStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  textToSpeechFunction: lambdaStack.textToSpeechFunction,
  sentimentAnalysisFunction: lambdaStack.sentimentAnalysisFunction,
  timeseriesDataFunction: lambdaStack.timeseriesDataFunction,
});

// Add tags to all resources
const tags = {
  Project: 'VoiceSentinel',
  Environment: 'Dev',
  ManagedBy: 'CDK',
};

Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(iamStack).add(key, value);
  cdk.Tags.of(timestreamStack).add(key, value);
  cdk.Tags.of(lambdaStack).add(key, value);
  cdk.Tags.of(appSyncStack).add(key, value);
});