import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as path from 'path';

export interface ApiStackProps {
  userPool: cognito.UserPool;
  journalTable: dynamodb.Table;
  pollyClient: any;
  comprehendClient: any;
  locationClient: any;
  timestreamDatabase: timestream.CfnDatabase;
}

export class ApiStack extends Construct {
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id);

    // Create a Lambda function for journal operations
    const journalLambda = new lambda.Function(this, 'JournalLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/journal')),
      environment: {
        JOURNAL_TABLE: props.journalTable.tableName,
        TIMESTREAM_DATABASE: props.timestreamDatabase.databaseName,
        TIMESTREAM_TABLE: 'TravelEvents',
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function access to the DynamoDB table
    props.journalTable.grantReadWriteData(journalLambda);

    // Create a Lambda function for Polly operations
    const pollyLambda = new lambda.Function(this, 'PollyLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/polly')),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function access to Polly
    pollyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'polly:SynthesizeSpeech',
          'polly:StartSpeechSynthesisTask',
          'polly:GetSpeechSynthesisTask',
        ],
        resources: ['*'],
      })
    );

    // Create a Lambda function for Comprehend operations
    const comprehendLambda = new lambda.Function(this, 'ComprehendLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/comprehend')),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function access to Comprehend
    comprehendLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'comprehend:DetectEntities',
          'comprehend:DetectKeyPhrases',
          'comprehend:DetectSentiment',
          'comprehend:DetectDominantLanguage',
        ],
        resources: ['*'],
      })
    );

    // Create a Lambda function for Location Service operations
    const locationLambda = new lambda.Function(this, 'LocationLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/location')),
      environment: {
        MAP_NAME: 'VoiceVoyageMap',
        PLACE_INDEX_NAME: 'VoiceVoyagePlaceIndex',
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function access to Location Service
    locationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'geo:GetMap*',
          'geo:SearchPlaceIndexForText',
          'geo:SearchPlaceIndexForPosition',
        ],
        resources: ['*'],
      })
    );

    // Create a Lambda function for Timestream operations
    const timestreamLambda = new lambda.Function(this, 'TimestreamLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/timestream')),
      environment: {
        TIMESTREAM_DATABASE: props.timestreamDatabase.databaseName,
        TIMESTREAM_TABLE: 'TravelEvents',
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function access to Timestream
    timestreamLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'timestream:WriteRecords',
          'timestream:Select',
          'timestream:DescribeTable',
          'timestream:ListMeasures',
        ],
        resources: [
          `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${props.timestreamDatabase.databaseName}/table/TravelEvents`,
          `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${props.timestreamDatabase.databaseName}`,
        ],
      })
    );

    timestreamLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'timestream:DescribeEndpoints',
          'timestream:SelectValues',
          'timestream:CancelQuery',
        ],
        resources: ['*'],
      })
    );

    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, 'VoiceVoyageApi', {
      restApiName: 'VoiceVoyage API',
      description: 'API for VoiceVoyage application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    // Create a Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'VoiceVoyageAuthorizer', {
      cognitoUserPools: [props.userPool],
    });

    // Create API resources
    const journalResource = api.root.addResource('journal');
    const pollyResource = api.root.addResource('polly');
    const comprehendResource = api.root.addResource('comprehend');
    const locationResource = api.root.addResource('location');
    const timestreamResource = api.root.addResource('timestream');

    // Add methods to the journal resource
    journalResource.addMethod('GET', new apigateway.LambdaIntegration(journalLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    journalResource.addMethod('POST', new apigateway.LambdaIntegration(journalLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    journalResource.addMethod('PUT', new apigateway.LambdaIntegration(journalLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    journalResource.addMethod('DELETE', new apigateway.LambdaIntegration(journalLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add methods to the Polly resource
    pollyResource.addMethod('POST', new apigateway.LambdaIntegration(pollyLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add methods to the Comprehend resource
    comprehendResource.addMethod('POST', new apigateway.LambdaIntegration(comprehendLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add methods to the Location resource
    locationResource.addMethod('GET', new apigateway.LambdaIntegration(locationLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    locationResource.addMethod('POST', new apigateway.LambdaIntegration(locationLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add methods to the Timestream resource
    timestreamResource.addMethod('GET', new apigateway.LambdaIntegration(timestreamLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    timestreamResource.addMethod('POST', new apigateway.LambdaIntegration(timestreamLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Store the API endpoint
    this.apiEndpoint = api.url;

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ApiEndpointOutput', {
      value: this.apiEndpoint,
      description: 'The endpoint of the VoiceVoyage API',
    });
  }
}