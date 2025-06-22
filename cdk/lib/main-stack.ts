import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuthStack } from './auth-stack';
import { LocationStack } from './location-stack';
import { PollyStack } from './polly-stack';
import { TimestreamStack } from './timestream-stack';
import { AppSyncStack } from './appsync-stack';
import { AmplifyStack } from './amplify-stack';

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create authentication resources
    const authStack = new AuthStack(this, 'Auth');

    // Create AWS Location Service resources
    const locationStack = new LocationStack(this, 'Location');

    // Create AWS Polly resources
    const pollyStack = new PollyStack(this, 'Polly');

    // Create AWS Timestream resources
    const timestreamStack = new TimestreamStack(this, 'Timestream');

    // Create AppSync API
    const appsyncStack = new AppSyncStack(this, 'AppSync', {
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
      locationMap: locationStack.map,
      locationPlaceIndex: locationStack.placeIndex,
      pollyRole: pollyStack.pollyRole,
      timestreamDatabase: timestreamStack.database,
      timestreamTable: timestreamStack.table
    });

    // Create Amplify hosting for the React application
    const amplifyStack = new AmplifyStack(this, 'Amplify', {
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
      identityPool: authStack.identityPool,
      graphqlApi: appsyncStack.api
    });

    // Output the Amplify app URL
    new cdk.CfnOutput(this, 'AmplifyAppURL', {
      value: `https://${amplifyStack.appDomain}`,
      description: 'URL of the Amplify-hosted VoiceGuide application'
    });

    // Output the AppSync GraphQL API URL
    new cdk.CfnOutput(this, 'GraphQLApiURL', {
      value: appsyncStack.api.graphqlUrl,
      description: 'URL of the AppSync GraphQL API'
    });

    // Output the Cognito User Pool ID
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: authStack.userPool.userPoolId,
      description: 'ID of the Cognito User Pool'
    });

    // Output the Cognito User Pool Client ID
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: authStack.userPoolClient.userPoolClientId,
      description: 'ID of the Cognito User Pool Client'
    });

    // Output the Identity Pool ID
    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: authStack.identityPool.ref,
      description: 'ID of the Cognito Identity Pool'
    });

    // Output the AWS Location Map name
    new cdk.CfnOutput(this, 'LocationMapName', {
      value: locationStack.map.mapName,
      description: 'Name of the AWS Location Service Map'
    });

    // Output the AWS Location Place Index name
    new cdk.CfnOutput(this, 'LocationPlaceIndexName', {
      value: locationStack.placeIndex.placeIndexName,
      description: 'Name of the AWS Location Service Place Index'
    });

    // Output the AWS Timestream Database name
    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: timestreamStack.database.databaseName,
      description: 'Name of the AWS Timestream Database'
    });

    // Output the AWS Timestream Table name
    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: timestreamStack.table.tableName,
      description: 'Name of the AWS Timestream Table'
    });
  }
}