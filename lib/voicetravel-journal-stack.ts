import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class VoiceTravelJournalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'VoiceTravelUserPool', {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
    });

    const userPoolClient = userPool.addClient('VoiceTravelUserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Create a DynamoDB table for journal entries
    const journalTable = new dynamodb.Table(this, 'JournalEntries', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // Add GSI for user-specific queries
    journalTable.addGlobalSecondaryIndex({
      indexName: 'byUser',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Create an S3 bucket for storing audio files
    const audioBucket = new s3.Bucket(this, 'JournalAudioBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
      autoDeleteObjects: true, // For demo purposes only
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // In production, restrict this to your domain
          allowedHeaders: ['*'],
        },
      ],
    });

    // Create an AppSync GraphQL API
    const api = new appsync.GraphqlApi(this, 'VoiceTravelJournalAPI', {
      name: 'VoiceTravelJournalAPI',
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, 'schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
    });

    // Create Lambda functions for processing
    const sentimentAnalysisFunction = new nodejs.NodejsFunction(this, 'SentimentAnalysisFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/sentimentAnalysis.ts'),
      handler: 'handler',
      environment: {
        JOURNAL_TABLE: journalTable.tableName,
      },
    });

    const textToSpeechFunction = new nodejs.NodejsFunction(this, 'TextToSpeechFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/textToSpeech.ts'),
      handler: 'handler',
      environment: {
        AUDIO_BUCKET: audioBucket.bucketName,
        JOURNAL_TABLE: journalTable.tableName,
      },
    });

    // Grant permissions
    journalTable.grantReadWriteData(sentimentAnalysisFunction);
    journalTable.grantReadWriteData(textToSpeechFunction);
    audioBucket.grantReadWrite(textToSpeechFunction);

    // Add permissions for AWS Comprehend
    sentimentAnalysisFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['comprehend:DetectSentiment'],
        resources: ['*'],
      })
    );

    // Add permissions for AWS Polly
    textToSpeechFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['polly:SynthesizeSpeech'],
        resources: ['*'],
      })
    );

    // Create AWS Location Service resources
    const mapName = 'VoiceTravelMap';
    const placeIndexName = 'VoiceTravelPlaceIndex';

    // Create a map resource
    const cfnMap = new cdk.aws_location.CfnMap(this, 'VoiceTravelMap', {
      mapName: mapName,
      configuration: {
        style: 'VectorEsriStreets',
      },
    });

    // Create a place index for geocoding
    const cfnPlaceIndex = new cdk.aws_location.CfnPlaceIndex(this, 'VoiceTravelPlaceIndex', {
      dataSource: 'Esri',
      indexName: placeIndexName,
    });

    // Create IAM policy for frontend to access Location Service
    const locationServicePolicy = new iam.PolicyStatement({
      actions: [
        'geo:GetMap*',
        'geo:SearchPlaceIndexForText',
        'geo:SearchPlaceIndexForPosition',
      ],
      resources: [
        `arn:aws:geo:${this.region}:${this.account}:map/${mapName}`,
        `arn:aws:geo:${this.region}:${this.account}:place-index/${placeIndexName}`,
      ],
    });

    // Create DynamoDB data source for AppSync
    const journalTableDataSource = api.addDynamoDbDataSource('JournalTableDataSource', journalTable);

    // Create resolvers for GraphQL operations
    journalTableDataSource.createResolver('CreateJournalEntryResolver', {
      typeName: 'Mutation',
      fieldName: 'createJournalEntry',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition('id').auto(),
        appsync.Values.projecting('input').attribute('createdAt').is('util.time.nowISO8601()')
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    journalTableDataSource.createResolver('GetJournalEntryResolver', {
      typeName: 'Query',
      fieldName: 'getJournalEntry',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'id'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    journalTableDataSource.createResolver('ListJournalEntriesResolver', {
      typeName: 'Query',
      fieldName: 'listJournalEntries',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    journalTableDataSource.createResolver('ListJournalEntriesByUserResolver', {
      typeName: 'Query',
      fieldName: 'listJournalEntriesByUser',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbQuery(
        'userId', 'userId', 
        { 'createdAt': 'createdAt' }
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Create Lambda data sources for sentiment analysis and text-to-speech
    const sentimentAnalysisDataSource = api.addLambdaDataSource(
      'SentimentAnalysisDataSource',
      sentimentAnalysisFunction
    );

    const textToSpeechDataSource = api.addLambdaDataSource(
      'TextToSpeechDataSource',
      textToSpeechFunction
    );

    // Create resolvers for sentiment analysis and text-to-speech
    sentimentAnalysisDataSource.createResolver('AnalyzeSentimentResolver', {
      typeName: 'Mutation',
      fieldName: 'analyzeSentiment',
    });

    textToSpeechDataSource.createResolver('ConvertToSpeechResolver', {
      typeName: 'Mutation',
      fieldName: 'convertToSpeech',
    });

    // Output values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: api.graphqlUrl,
    });

    new cdk.CfnOutput(this, 'GraphQLApiId', {
      value: api.apiId,
    });

    new cdk.CfnOutput(this, 'AudioBucketName', {
      value: audioBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'MapName', {
      value: mapName,
    });

    new cdk.CfnOutput(this, 'PlaceIndexName', {
      value: placeIndexName,
    });
  }
}