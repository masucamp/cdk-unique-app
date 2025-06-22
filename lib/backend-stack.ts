import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';

interface BackendStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class BackendStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;
  public readonly timestreamDatabase: timestream.CfnDatabase;
  public readonly timestreamTable: timestream.CfnTable;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Create a Timestream database
    this.timestreamDatabase = new timestream.CfnDatabase(this, 'VoiceTrailTimestreamDB', {
      databaseName: 'voice-trail-db',
    });

    // Create a Timestream table
    this.timestreamTable = new timestream.CfnTable(this, 'VoiceTrailTimestreamTable', {
      databaseName: this.timestreamDatabase.databaseName!,
      tableName: 'hiking-data',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7',
      },
    });
    this.timestreamTable.addDependency(this.timestreamDatabase);

    // Create an AppSync API
    this.api = new appsync.GraphqlApi(this, 'VoiceTrailAPI', {
      name: 'voice-trail-api',
      schema: appsync.SchemaFile.fromAsset('graphql/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
      xrayEnabled: true,
    });

    // Create a Lambda function to interact with Timestream
    const timestreamLambda = new lambda.Function(this, 'TimestreamHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/timestream'),
      environment: {
        DATABASE_NAME: this.timestreamDatabase.databaseName!,
        TABLE_NAME: this.timestreamTable.tableName!,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function permissions to access Timestream
    timestreamLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'timestream:WriteRecords',
          'timestream:Select',
          'timestream:DescribeTable',
          'timestream:ListMeasures',
        ],
        resources: [
          `arn:aws:timestream:${this.region}:${this.account}:database/${this.timestreamDatabase.databaseName!}/table/${this.timestreamTable.tableName!}`,
        ],
      })
    );

    // Create a Lambda data source for AppSync
    const lambdaDataSource = this.api.addLambdaDataSource(
      'TimestreamDataSource',
      timestreamLambda
    );

    // Create resolvers for the GraphQL API
    lambdaDataSource.createResolver('CreateHikingDataResolver', {
      typeName: 'Mutation',
      fieldName: 'createHikingData',
    });

    lambdaDataSource.createResolver('GetHikingDataResolver', {
      typeName: 'Query',
      fieldName: 'getHikingData',
    });

    lambdaDataSource.createResolver('ListHikingDataResolver', {
      typeName: 'Query',
      fieldName: 'listHikingData',
    });

    // Output the API URL and ID
    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: this.api.graphqlUrl,
      description: 'The URL of the GraphQL API',
      exportName: 'VoiceTrailGraphQLAPIURL',
    });

    new cdk.CfnOutput(this, 'GraphQLAPIID', {
      value: this.api.apiId,
      description: 'The ID of the GraphQL API',
      exportName: 'VoiceTrailGraphQLAPIID',
    });

    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: this.timestreamDatabase.databaseName!,
      description: 'The name of the Timestream database',
      exportName: 'VoiceTrailTimestreamDatabaseName',
    });

    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: this.timestreamTable.tableName!,
      description: 'The name of the Timestream table',
      exportName: 'VoiceTrailTimestreamTableName',
    });
  }
}