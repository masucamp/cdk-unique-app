import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as location from 'aws-cdk-lib/aws-location';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

interface VoiceTrackStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  identityPool: cognito.CfnIdentityPool;
}

export class VoiceTrackStack extends cdk.Stack {
  public readonly graphqlEndpoint: string;
  public readonly mapName: string;

  constructor(scope: Construct, id: string, props: VoiceTrackStackProps) {
    super(scope, id, props);

    // Create AWS Location Service Map
    const map = new location.CfnMap(this, 'VoiceTrackMap', {
      mapName: 'voice-track-map',
      configuration: {
        style: 'VectorEsriStreets',
      },
      description: 'Map for VoiceTrack application',
    });
    this.mapName = map.mapName;

    // Create AWS Location Service Tracker
    const tracker = new location.CfnTracker(this, 'VoiceTrackTracker', {
      trackerName: 'voice-track-tracker',
      description: 'Tracker for VoiceTrack application',
      positionFiltering: 'AccuracyBased',
    });

    // Create AWS Location Service Geofence Collection
    const geofenceCollection = new location.CfnGeofenceCollection(this, 'VoiceTrackGeofenceCollection', {
      collectionName: 'voice-track-geofences',
      description: 'Geofence collection for VoiceTrack application',
    });

    // Create Timestream Database and Table
    const timestreamDatabase = new timestream.CfnDatabase(this, 'VoiceTrackTimestreamDB', {
      databaseName: 'voicetrackdb',
    });

    const timestreamTable = new timestream.CfnTable(this, 'VoiceTrackTimestreamTable', {
      databaseName: timestreamDatabase.databaseName!,
      tableName: 'locationhistory',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7',
      },
    });
    timestreamTable.addDependency(timestreamDatabase);

    // Create AppSync API
    const api = new appsync.GraphqlApi(this, 'VoiceTrackAPI', {
      name: 'VoiceTrackAPI',
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, '../graphql/schema.graphql')),
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
    this.graphqlEndpoint = api.graphqlUrl;

    // Create Lambda functions for resolvers
    const locationLambda = new nodejs.NodejsFunction(this, 'LocationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/location.ts'),
      handler: 'handler',
      environment: {
        MAP_NAME: map.mapName,
        TRACKER_NAME: tracker.trackerName,
        GEOFENCE_COLLECTION_NAME: geofenceCollection.collectionName,
        TIMESTREAM_DATABASE_NAME: timestreamDatabase.databaseName!,
        TIMESTREAM_TABLE_NAME: timestreamTable.tableName!,
      },
      bundling: {
        externalModules: ['aws-sdk'],
      },
    });

    const pollyLambda = new nodejs.NodejsFunction(this, 'PollyFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/polly.ts'),
      handler: 'handler',
      bundling: {
        externalModules: ['aws-sdk'],
      },
    });

    // Grant permissions to Lambda functions
    locationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'geo:GetMap*',
          'geo:SearchPlaceIndex*',
          'geo:CalculateRoute*',
          'geo:BatchUpdateDevicePosition',
          'geo:GetDevicePosition*',
          'geo:ListDevicePositions',
          'geo:BatchEvaluateGeofences',
          'geo:PutGeofence',
          'geo:GetGeofence',
          'geo:ListGeofences',
          'geo:DeleteGeofence',
        ],
        resources: ['*'],
      })
    );

    locationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'timestream:WriteRecords',
          'timestream:Select',
          'timestream:DescribeTable',
          'timestream:ListMeasures',
        ],
        resources: [
          `arn:aws:timestream:${this.region}:${this.account}:database/${timestreamDatabase.databaseName}/table/${timestreamTable.tableName}`,
          `arn:aws:timestream:${this.region}:${this.account}:database/${timestreamDatabase.databaseName}`,
        ],
      })
    );

    pollyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'polly:SynthesizeSpeech',
          'polly:StartSpeechSynthesisTask',
          'polly:GetSpeechSynthesisTask',
        ],
        resources: ['*'],
      })
    );

    // Create AppSync data sources
    const locationDataSource = api.addLambdaDataSource('LocationDataSource', locationLambda);
    const pollyDataSource = api.addLambdaDataSource('PollyDataSource', pollyLambda);

    // Create resolvers
    locationDataSource.createResolver('GetCurrentLocationResolver', {
      typeName: 'Query',
      fieldName: 'getCurrentLocation',
    });

    locationDataSource.createResolver('GetLocationHistoryResolver', {
      typeName: 'Query',
      fieldName: 'getLocationHistory',
    });

    locationDataSource.createResolver('TrackLocationResolver', {
      typeName: 'Mutation',
      fieldName: 'trackLocation',
    });

    locationDataSource.createResolver('CreateGeofenceResolver', {
      typeName: 'Mutation',
      fieldName: 'createGeofence',
    });

    pollyDataSource.createResolver('SynthesizeSpeechResolver', {
      typeName: 'Mutation',
      fieldName: 'synthesizeSpeech',
    });

    // Grant authenticated users access to Location Service
    const authenticatedRole = iam.Role.fromRoleArn(
      this, 'ImportedAuthRole',
      cdk.Fn.importValue('AuthenticatedRoleArn')
    );

    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'geo:GetMap*',
          'geo:GetDevicePosition',
        ],
        resources: ['*'],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: api.graphqlUrl,
    });

    new cdk.CfnOutput(this, 'GraphQLAPIID', {
      value: api.apiId,
    });

    new cdk.CfnOutput(this, 'MapName', {
      value: map.mapName,
    });

    new cdk.CfnOutput(this, 'TrackerName', {
      value: tracker.trackerName,
    });

    new cdk.CfnOutput(this, 'GeofenceCollectionName', {
      value: geofenceCollection.collectionName,
    });

    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: timestreamDatabase.databaseName!,
    });

    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: timestreamTable.tableName!,
    });
  }
}