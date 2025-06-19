import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export class UncommonServicesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Timestream database and table
    const database = new timestream.CfnDatabase(this, 'TimestreamDB', {
      databaseName: 'sensor-data-db'
    });

    const table = new timestream.CfnTable(this, 'TimestreamTable', {
      databaseName: database.databaseName,
      tableName: 'sensor-measurements'
    });
    
    // Make sure the table is created after the database
    table.addDependsOn(database);

    // Create AppSync API
    const api = new appsync.GraphqlApi(this, 'SensorDataApi', {
      name: 'SensorDataApi',
      schema: appsync.SchemaFile.fromAsset('schema.graphql'),
      xrayEnabled: true, // Enable X-Ray tracing
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365))
          }
        }
      }
    });

    // Create Lambda function for AppSync resolver
    const resolverFunction = new lambda.Function(this, 'ResolverFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Event:', JSON.stringify(event));
          
          // This is a mock implementation
          // In a real app, we would interact with Timestream here
          
          if (event.info.fieldName === 'addMeasurement') {
            return {
              id: 'measurement-' + Date.now(),
              sensorId: event.arguments.input.sensorId,
              value: event.arguments.input.value,
              timestamp: new Date().toISOString()
            };
          }
          
          if (event.info.fieldName === 'getMeasurements') {
            return [
              {
                id: 'measurement-1',
                sensorId: event.arguments.sensorId,
                value: 25.5,
                timestamp: new Date().toISOString()
              },
              {
                id: 'measurement-2',
                sensorId: event.arguments.sensorId,
                value: 26.2,
                timestamp: new Date(Date.now() - 60000).toISOString()
              }
            ];
          }
          
          return null;
        }
      `)
    });

    // Grant Lambda permissions to access Timestream
    resolverFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'timestream:WriteRecords',
        'timestream:Select',
        'timestream:DescribeTable',
        'timestream:ListMeasures'
      ],
      resources: [table.attrArn]
    }));

    // Create AppSync data source
    const lambdaDataSource = api.addLambdaDataSource(
      'LambdaDataSource',
      resolverFunction
    );

    // Create resolvers
    lambdaDataSource.createResolver('AddMeasurementResolver', {
      typeName: 'Mutation',
      fieldName: 'addMeasurement'
    });

    lambdaDataSource.createResolver('GetMeasurementsResolver', {
      typeName: 'Query',
      fieldName: 'getMeasurements'
    });

    // Output values
    new cdk.CfnOutput(this, 'GraphQLApiURL', {
      value: api.graphqlUrl
    });

    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: api.apiKey || ''
    });

    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: database.databaseName
    });

    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: table.tableName
    });
  }
}