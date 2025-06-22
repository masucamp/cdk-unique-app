import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as location from 'aws-cdk-lib/aws-location';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

interface AppSyncStackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  locationMap: location.CfnMap;
  locationPlaceIndex: location.CfnPlaceIndex;
  pollyRole: iam.Role;
  timestreamDatabase: timestream.CfnDatabase;
  timestreamTable: timestream.CfnTable;
}

export class AppSyncStack extends Construct {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: AppSyncStackProps) {
    super(scope, id);

    // Create the AppSync GraphQL API
    this.api = new appsync.GraphqlApi(this, 'Api', {
      name: 'VoiceGuideAPI',
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, 'schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
            appIdClientRegex: props.userPoolClient.userPoolClientId,
            defaultAction: appsync.UserPoolDefaultAction.ALLOW,
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

    // Create a Lambda function for location search
    const locationFunction = new lambda.Function(this, 'LocationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        
        exports.handler = async (event) => {
          const location = new AWS.Location();
          
          switch (event.field) {
            case 'searchPlaces':
              const searchText = event.arguments.searchText;
              const result = await location.searchPlaceIndexForText({
                IndexName: '${props.locationPlaceIndex.placeIndexName}',
                Text: searchText,
                MaxResults: 10
              }).promise();
              return result.Results;
              
            case 'getPlace':
              const placeId = event.arguments.placeId;
              const placeResult = await location.getPlace({
                IndexName: '${props.locationPlaceIndex.placeIndexName}',
                PlaceId: placeId
              }).promise();
              return placeResult.Place;
              
            default:
              throw new Error('Unknown field: ' + event.field);
          }
        };
      `),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions to the Lambda function
    locationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'geo:SearchPlaceIndexForText',
          'geo:GetPlace',
        ],
        resources: [
          `arn:aws:geo:\${AWS::Region}:\${AWS::AccountId}:place-index/${props.locationPlaceIndex.placeIndexName}`,
        ],
      })
    );

    // Create a Lambda data source for location search
    const locationDataSource = this.api.addLambdaDataSource(
      'LocationDataSource',
      locationFunction
    );

    // Create resolvers for location queries
    locationDataSource.createResolver('SearchPlacesResolver', {
      typeName: 'Query',
      fieldName: 'searchPlaces',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(`
        {
          "field": "searchPlaces",
          "arguments": {
            "searchText": $util.toJson($context.arguments.searchText)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    locationDataSource.createResolver('GetPlaceResolver', {
      typeName: 'Query',
      fieldName: 'getPlace',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(`
        {
          "field": "getPlace",
          "arguments": {
            "placeId": $util.toJson($context.arguments.placeId)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Create a Lambda function for Polly text-to-speech
    const pollyFunction = new lambda.Function(this, 'PollyFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        
        exports.handler = async (event) => {
          const polly = new AWS.Polly();
          
          try {
            const text = event.arguments.text;
            const voiceId = event.arguments.voiceId || 'Joanna';
            
            const result = await polly.synthesizeSpeech({
              OutputFormat: 'mp3',
              Text: text,
              TextType: 'text',
              VoiceId: voiceId
            }).promise();
            
            // Convert audio stream to base64
            const audioBase64 = result.AudioStream.toString('base64');
            
            return {
              audioContent: audioBase64,
              format: 'mp3'
            };
          } catch (error) {
            console.error('Error synthesizing speech:', error);
            throw error;
          }
        };
      `),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions to the Polly function
    pollyFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['polly:SynthesizeSpeech'],
        resources: ['*'],
      })
    );

    // Create a Lambda data source for Polly
    const pollyDataSource = this.api.addLambdaDataSource(
      'PollyDataSource',
      pollyFunction
    );

    // Create resolver for text-to-speech
    pollyDataSource.createResolver('SynthesizeSpeechResolver', {
      typeName: 'Mutation',
      fieldName: 'synthesizeSpeech',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(`
        {
          "arguments": {
            "text": $util.toJson($context.arguments.text),
            "voiceId": $util.toJson($context.arguments.voiceId)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // Create a Lambda function for Timestream interactions
    const timestreamFunction = new lambda.Function(this, 'TimestreamFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        
        exports.handler = async (event) => {
          const timestreamWrite = new AWS.TimestreamWrite();
          const timestreamQuery = new AWS.TimestreamQuery();
          
          const databaseName = '${props.timestreamDatabase.databaseName}';
          const tableName = '${props.timestreamTable.tableName}';
          
          switch (event.field) {
            case 'recordInteraction':
              const { userId, interactionType, locationId, details } = event.arguments.input;
              
              const currentTime = Date.now().toString();
              
              const record = {
                Dimensions: [
                  { Name: 'userId', Value: userId },
                  { Name: 'interactionType', Value: interactionType },
                  { Name: 'locationId', Value: locationId || 'none' }
                ],
                MeasureName: 'interaction',
                MeasureValue: '1',
                MeasureValueType: 'BIGINT',
                Time: currentTime,
                TimeUnit: 'MILLISECONDS'
              };
              
              if (details) {
                record.Dimensions.push({ Name: 'details', Value: JSON.stringify(details) });
              }
              
              await timestreamWrite.writeRecords({
                DatabaseName: databaseName,
                TableName: tableName,
                Records: [record]
              }).promise();
              
              return {
                id: currentTime,
                userId,
                interactionType,
                locationId: locationId || 'none',
                timestamp: new Date(parseInt(currentTime)).toISOString(),
                details: details || {}
              };
              
            case 'getUserInteractions':
              const userId2 = event.arguments.userId;
              const limit = event.arguments.limit || 10;
              
              const query = \`
                SELECT time, measure_value::bigint as value, 
                       locationId, interactionType, details
                FROM "\${databaseName}"."${tableName}"
                WHERE userId = '\${userId2}'
                ORDER BY time DESC
                LIMIT \${limit}
              \`;
              
              const queryResult = await timestreamQuery.query({
                QueryString: query
              }).promise();
              
              return queryResult.Rows.map(row => {
                const data = {};
                row.Data.forEach((item, index) => {
                  const columnName = queryResult.ColumnInfo[index].Name;
                  data[columnName] = item.ScalarValue;
                });
                
                return {
                  id: data.time,
                  userId: userId2,
                  interactionType: data.interactionType,
                  locationId: data.locationId,
                  timestamp: new Date(parseInt(data.time)).toISOString(),
                  details: data.details ? JSON.parse(data.details) : {}
                };
              });
              
            default:
              throw new Error('Unknown field: ' + event.field);
          }
        };
      `),
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions to the Timestream function
    timestreamFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'timestream:WriteRecords',
          'timestream:Select',
          'timestream:DescribeTable',
          'timestream:ListMeasures',
        ],
        resources: [
          `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${props.timestreamDatabase.databaseName}/table/${props.timestreamTable.tableName}`,
          `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${props.timestreamDatabase.databaseName}`,
        ],
      })
    );

    // Create a Lambda data source for Timestream
    const timestreamDataSource = this.api.addLambdaDataSource(
      'TimestreamDataSource',
      timestreamFunction
    );

    // Create resolvers for Timestream operations
    timestreamDataSource.createResolver('RecordInteractionResolver', {
      typeName: 'Mutation',
      fieldName: 'recordInteraction',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(`
        {
          "field": "recordInteraction",
          "arguments": {
            "input": $util.toJson($context.arguments.input)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    timestreamDataSource.createResolver('GetUserInteractionsResolver', {
      typeName: 'Query',
      fieldName: 'getUserInteractions',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(`
        {
          "field": "getUserInteractions",
          "arguments": {
            "userId": $util.toJson($context.arguments.userId),
            "limit": $util.toJson($context.arguments.limit)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}