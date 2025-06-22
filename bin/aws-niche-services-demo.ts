#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VoiceInsightStack } from '../lib/voice-insight-stack';

const app = new cdk.App();
new VoiceInsightStack(app, 'VoiceInsightStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});