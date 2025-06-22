import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as location from 'aws-cdk-lib/aws-location';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';

export class GeoTimeTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Timestream database and table for storing location data
    const timestreamDatabase = new timestream.CfnDatabase(this, 'LocationDatabase', {
      databaseName: 'location_history',
    });

    const timestreamTable = new timestream.CfnTable(this, 'LocationTable', {
      databaseName: timestreamDatabase.databaseName!,
      tableName: 'device_locations',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7',
      },
    });
    timestreamTable.addDependency(timestreamDatabase);

    // Create an AWS Location Service map
    const map = new location.CfnMap(this, 'DeviceTrackingMap', {
      mapName: 'device-tracking-map',
      configuration: {
        style: 'VectorEsriStreets',
      },
      pricingPlan: 'RequestBasedUsage',
    });

    // Create a tracker for device positions
    const tracker = new location.CfnTracker(this, 'DeviceTracker', {
      trackerName: 'device-tracker',
      pricingPlan: 'RequestBasedUsage',
      positionFiltering: 'AccuracyBased',
    });

    // Create a Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'GeoTimeTrackerUserPool', {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
    });

    const userPoolClient = userPool.addClient('GeoTimeTrackerClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Create an AppSync GraphQL API
    const api = new appsync.GraphqlApi(this, 'GeoTimeTrackerApi', {
      name: 'GeoTimeTrackerApi',
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
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              name: 'default',
              description: 'Default API Key',
              expires: cdk.Expiration.after(cdk.Duration.days(365)),
            },
          },
        ],
      },
    });

    // Create a Lambda function to process device data
    const dataProcessorFunction = new lambda.Function(this, 'DataProcessorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/data-processor')),
      environment: {
        TIMESTREAM_DATABASE_NAME: timestreamDatabase.databaseName!,
        TIMESTREAM_TABLE_NAME: timestreamTable.tableName!,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function permissions to write to Timestream
    dataProcessorFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'timestream:WriteRecords',
        'timestream:DescribeEndpoints',
      ],
      resources: [timestreamTable.attrArn],
    }));

    // Create an IoT rule to route device data to the Lambda function
    const iotRule = new iot.CfnTopicRule(this, 'DeviceLocationRule', {
      ruleName: 'DeviceLocationRule',
      topicRulePayload: {
        sql: "SELECT * FROM 'devices/+/location'",
        actions: [
          {
            lambda: {
              functionArn: dataProcessorFunction.functionArn,
            },
          },
        ],
      },
    });

    // Grant IoT permission to invoke the Lambda function
    dataProcessorFunction.addPermission('InvokeByIoT', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: iotRule.attrArn,
    });

    // Create Lambda data sources for AppSync
    const locationDataSource = api.addLambdaDataSource(
      'LocationDataSource',
      dataProcessorFunction
    );

    // Create resolvers for GraphQL operations
    locationDataSource.createResolver('QueryGetDeviceLocationsResolver', {
      typeName: 'Query',
      fieldName: 'getDeviceLocations',
    });

    locationDataSource.createResolver('QueryGetDeviceHistoryResolver', {
      typeName: 'Query',
      fieldName: 'getDeviceHistory',
    });

    locationDataSource.createResolver('SubscriptionOnLocationUpdateResolver', {
      typeName: 'Subscription',
      fieldName: 'onLocationUpdate',
    });

    // Create a simulator Lambda function to generate device data
    const simulatorFunction = new lambda.Function(this, 'SimulatorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/simulator')),
      environment: {
        IOT_ENDPOINT: cdk.Fn.join('', [
          'https://',
          cdk.Fn.getAtt('IoTEndpoint', 'endpointAddress'),
          '.iot.',
          cdk.Stack.of(this).region,
          '.amazonaws.com',
        ]),
      },
      timeout: cdk.Duration.minutes(15),
    });

    // Grant the simulator function permissions to publish to IoT
    simulatorFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['iot:Publish'],
      resources: [
        cdk.Fn.join('', [
          'arn:aws:iot:',
          cdk.Stack.of(this).region,
          ':',
          cdk.Stack.of(this).account,
          ':topic/devices/*/location',
        ]),
      ],
    }));

    // Create a custom resource to get the IoT endpoint
    const getIoTEndpoint = new lambda.Function(this, 'GetIoTEndpointFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const response = require('cfn-response');
        
        exports.handler = async (event, context) => {
          try {
            if (event.RequestType === 'Delete') {
              return response.send(event, context, response.SUCCESS);
            }
            
            const iot = new AWS.Iot();
            const data = await iot.describeEndpoint({ endpointType: 'iot:Data-ATS' }).promise();
            
            return response.send(event, context, response.SUCCESS, {
              endpointAddress: data.endpointAddress
            }, 'IoTEndpoint');
          } catch (error) {
            console.error(error);
            return response.send(event, context, response.FAILED);
          }
        };
      `),
    });

    getIoTEndpoint.addToRolePolicy(new iam.PolicyStatement({
      actions: ['iot:DescribeEndpoint'],
      resources: ['*'],
    }));

    const iotEndpointResource = new cdk.CustomResource(this, 'IoTEndpoint', {
      serviceToken: getIoTEndpoint.functionArn,
    });

    // Create an Amplify app for hosting the React frontend
    const amplifyApp = new amplify.CfnApp(this, 'GeoTimeTrackerApp', {
      name: 'GeoTimeTrackerApp',
      repository: 'https://github.com/yourusername/geo-time-tracker',
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: '1.0',
        frontend: {
          phases: {
            preBuild: {
              commands: [
                'npm ci',
              ],
            },
            build: {
              commands: [
                'npm run build',
              ],
            },
          },
          artifacts: {
            baseDirectory: 'build',
            files: [
              '**/*',
            ],
          },
          cache: {
            paths: [
              'node_modules/**/*',
            ],
          },
        },
      }).toBuildSpec(),
      environmentVariables: [
        {
          name: 'REACT_APP_APPSYNC_URL',
          value: api.graphqlUrl,
        },
        {
          name: 'REACT_APP_APPSYNC_REGION',
          value: cdk.Stack.of(this).region,
        },
        {
          name: 'REACT_APP_USER_POOL_ID',
          value: userPool.userPoolId,
        },
        {
          name: 'REACT_APP_USER_POOL_CLIENT_ID',
          value: userPoolClient.userPoolClientId,
        },
        {
          name: 'REACT_APP_MAP_NAME',
          value: map.mapName!,
        },
      ],
    });

    // Output important resources
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: api.graphqlUrl,
      description: 'The URL of the GraphQL API',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'The ID of the Cognito User Pool',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'The ID of the Cognito User Pool Client',
    });

    new cdk.CfnOutput(this, 'MapName', {
      value: map.mapName!,
      description: 'The name of the Location Service map',
    });

    new cdk.CfnOutput(this, 'TrackerName', {
      value: tracker.trackerName!,
      description: 'The name of the Location Service tracker',
    });
  }
}