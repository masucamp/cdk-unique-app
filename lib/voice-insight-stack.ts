import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';

export class VoiceInsightStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Timestream database and table for storing analysis results
    const timestreamDatabase = new timestream.CfnDatabase(this, 'VoiceInsightDatabase', {
      databaseName: 'voice-insight-db',
    });

    const timestreamTable = new timestream.CfnTable(this, 'VoiceInsightTable', {
      databaseName: timestreamDatabase.databaseName!,
      tableName: 'voice-analysis-results',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7',
      },
    });
    timestreamTable.addDependency(timestreamDatabase);

    // Create an AppSync API
    const api = new appsync.GraphqlApi(this, 'VoiceInsightAPI', {
      name: 'voice-insight-api',
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, '../graphql/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
      xrayEnabled: true,
    });

    // Create a Lambda function for text processing
    const textProcessingFunction = new lambda.Function(this, 'TextProcessingFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/text-processing')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        TIMESTREAM_DATABASE_NAME: timestreamDatabase.databaseName!,
        TIMESTREAM_TABLE_NAME: timestreamTable.tableName!,
      },
    });

    // Grant permissions to the Lambda function
    textProcessingFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'polly:SynthesizeSpeech',
        'comprehend:DetectSentiment',
        'comprehend:DetectKeyPhrases',
      ],
      resources: ['*'],
    }));

    textProcessingFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'timestream:WriteRecords',
        'timestream:DescribeEndpoints',
      ],
      resources: ['*'],
    }));

    // Create a Lambda data source for AppSync
    const lambdaDataSource = api.addLambdaDataSource(
      'LambdaDataSource',
      textProcessingFunction
    );

    // Create resolvers for GraphQL operations
    lambdaDataSource.createResolver('ProcessTextResolver', {
      typeName: 'Mutation',
      fieldName: 'processText',
    });

    lambdaDataSource.createResolver('GetAnalysisResultsResolver', {
      typeName: 'Query',
      fieldName: 'getAnalysisResults',
    });

    // Create an S3 bucket for the React app
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution for the website
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Deploy the React app to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend/build'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Output the API URL and CloudFront URL
    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: api.graphqlUrl,
    });

    new cdk.CfnOutput(this, 'GraphQLAPIKey', {
      value: api.apiKey || '',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}