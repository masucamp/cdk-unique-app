import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';

interface VoiceSentinelAppSyncStackProps extends cdk.StackProps {
  textToSpeechFunction: lambda.Function;
  sentimentAnalysisFunction: lambda.Function;
  timeseriesDataFunction: lambda.Function;
}

export class VoiceSentinelAppSyncStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: VoiceSentinelAppSyncStackProps) {
    super(scope, id, props);

    // Create the AppSync GraphQL API
    this.api = new appsync.GraphqlApi(this, 'VoiceSentinelApi', {
      name: 'voice-sentinel-api',
      schema: appsync.SchemaFile.fromAsset(
        './graphql/schema.graphql'
      ),
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

    // Create Lambda data sources
    const textToSpeechDataSource = this.api.addLambdaDataSource(
      'TextToSpeechDataSource',
      props.textToSpeechFunction
    );

    const sentimentAnalysisDataSource = this.api.addLambdaDataSource(
      'SentimentAnalysisDataSource',
      props.sentimentAnalysisFunction
    );

    const timeseriesDataDataSource = this.api.addLambdaDataSource(
      'TimeseriesDataDataSource',
      props.timeseriesDataFunction
    );

    // Create resolvers
    textToSpeechDataSource.createResolver('ConvertTextToSpeechResolver', {
      typeName: 'Mutation',
      fieldName: 'convertTextToSpeech',
    });

    sentimentAnalysisDataSource.createResolver('AnalyzeSentimentResolver', {
      typeName: 'Mutation',
      fieldName: 'analyzeSentiment',
    });

    timeseriesDataDataSource.createResolver('StoreSentimentDataResolver', {
      typeName: 'Mutation',
      fieldName: 'storeSentimentData',
    });

    timeseriesDataDataSource.createResolver('GetSentimentHistoryResolver', {
      typeName: 'Query',
      fieldName: 'getSentimentHistory',
    });

    // Output the API URL and API Key
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.api.graphqlUrl,
      description: 'URL of the GraphQL API',
      exportName: 'VoiceSentinelGraphQLApiUrl',
    });

    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: this.api.apiKey || '',
      description: 'API Key for the GraphQL API',
      exportName: 'VoiceSentinelGraphQLApiKey',
    });
  }
}