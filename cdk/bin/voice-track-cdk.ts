#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VoiceTrackStack } from '../lib/voice-track-stack';
import { AuthStack } from '../lib/auth-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();

// Create authentication stack
const authStack = new AuthStack(app, 'VoiceTrackAuthStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  description: 'Authentication stack for VoiceTrack application',
});

// Create main backend stack
const backendStack = new VoiceTrackStack(app, 'VoiceTrackBackendStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  description: 'Backend stack for VoiceTrack application',
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  identityPool: authStack.identityPool,
});

// Create frontend stack
const frontendStack = new FrontendStack(app, 'VoiceTrackFrontendStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  description: 'Frontend stack for VoiceTrack application',
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  graphqlEndpoint: backendStack.graphqlEndpoint,
  mapName: backendStack.mapName,
});

// Add tags to all stacks
const tags = {
  'Project': 'VoiceTrack',
  'Environment': 'Dev',
  'ManagedBy': 'CDK',
};

cdk.Tags.of(authStack).add('Project', tags.Project);
cdk.Tags.of(authStack).add('Environment', tags.Environment);
cdk.Tags.of(authStack).add('ManagedBy', tags.ManagedBy);

cdk.Tags.of(backendStack).add('Project', tags.Project);
cdk.Tags.of(backendStack).add('Environment', tags.Environment);
cdk.Tags.of(backendStack).add('ManagedBy', tags.ManagedBy);

cdk.Tags.of(frontendStack).add('Project', tags.Project);
cdk.Tags.of(frontendStack).add('Environment', tags.Environment);
cdk.Tags.of(frontendStack).add('ManagedBy', tags.ManagedBy);