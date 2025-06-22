import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuthStack } from './stacks/auth-stack';
import { StorageStack } from './stacks/storage-stack';
import { ApiStack } from './stacks/api-stack';
import { FrontendStack } from './stacks/frontend-stack';
import { PollyStack } from './stacks/polly-stack';
import { ComprehendStack } from './stacks/comprehend-stack';
import { LocationStack } from './stacks/location-stack';
import { TimestreamStack } from './stacks/timestream-stack';

export class VoiceVoyageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Authentication stack (Amazon Cognito)
    const authStack = new AuthStack(this, 'AuthStack');

    // Storage stack (DynamoDB for journal entries)
    const storageStack = new StorageStack(this, 'StorageStack');

    // AWS Polly stack for text-to-speech
    const pollyStack = new PollyStack(this, 'PollyStack', {
      userPool: authStack.userPool,
      identityPool: authStack.identityPool,
    });

    // AWS Comprehend stack for natural language processing
    const comprehendStack = new ComprehendStack(this, 'ComprehendStack', {
      userPool: authStack.userPool,
      identityPool: authStack.identityPool,
    });

    // AWS Location Service stack for maps and location
    const locationStack = new LocationStack(this, 'LocationStack', {
      userPool: authStack.userPool,
      identityPool: authStack.identityPool,
    });

    // AWS Timestream stack for time series data
    const timestreamStack = new TimestreamStack(this, 'TimestreamStack');

    // API stack (API Gateway and Lambda functions)
    const apiStack = new ApiStack(this, 'ApiStack', {
      userPool: authStack.userPool,
      journalTable: storageStack.journalTable,
      pollyClient: pollyStack.pollyClient,
      comprehendClient: comprehendStack.comprehendClient,
      locationClient: locationStack.locationClient,
      timestreamDatabase: timestreamStack.timestreamDatabase,
    });

    // Frontend stack (S3 and CloudFront for hosting the React app)
    const frontendStack = new FrontendStack(this, 'FrontendStack', {
      apiEndpoint: apiStack.apiEndpoint,
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
      identityPool: authStack.identityPool,
      mapName: locationStack.mapName,
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: frontendStack.distributionDomainName,
      description: 'The URL of the VoiceVoyage application',
    });

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: apiStack.apiEndpoint,
      description: 'The endpoint of the VoiceVoyage API',
    });
  }
}