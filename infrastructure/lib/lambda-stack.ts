import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as path from 'path';

interface VoiceSentinelLambdaStackProps extends cdk.StackProps {
  iamRole: iam.Role;
  timestreamDatabase: timestream.CfnDatabase;
  timestreamTable: timestream.CfnTable;
}

export class VoiceSentinelLambdaStack extends cdk.Stack {
  public readonly textToSpeechFunction: lambda.Function;
  public readonly sentimentAnalysisFunction: lambda.Function;
  public readonly timeseriesDataFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: VoiceSentinelLambdaStackProps) {
    super(scope, id, props);

    // Create Lambda function for text-to-speech conversion using AWS Polly
    this.textToSpeechFunction = new lambda.Function(this, 'TextToSpeechFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'text-to-speech.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/text-to-speech')),
      role: props.iamRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        VOICE_ID: 'Joanna', // Default voice ID
        OUTPUT_FORMAT: 'mp3',
      },
      description: 'Converts text to speech using AWS Polly',
    });

    // Create Lambda function for sentiment analysis using AWS Comprehend
    this.sentimentAnalysisFunction = new lambda.Function(this, 'SentimentAnalysisFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'sentiment-analysis.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/sentiment-analysis')),
      role: props.iamRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        LANGUAGE_CODE: 'en', // Default language code
      },
      description: 'Analyzes sentiment of text using AWS Comprehend',
    });

    // Create Lambda function for storing and retrieving time-series data using AWS Timestream
    this.timeseriesDataFunction = new lambda.Function(this, 'TimeseriesDataFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'timeseries-data.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/timeseries-data')),
      role: props.iamRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        DATABASE_NAME: props.timestreamDatabase.databaseName!,
        TABLE_NAME: props.timestreamTable.tableName!,
      },
      description: 'Stores and retrieves time-series data using AWS Timestream',
    });

    // Output the Lambda function ARNs
    new cdk.CfnOutput(this, 'TextToSpeechFunctionArn', {
      value: this.textToSpeechFunction.functionArn,
      description: 'ARN of the text-to-speech Lambda function',
      exportName: 'VoiceSentinelTextToSpeechFunctionArn',
    });

    new cdk.CfnOutput(this, 'SentimentAnalysisFunctionArn', {
      value: this.sentimentAnalysisFunction.functionArn,
      description: 'ARN of the sentiment analysis Lambda function',
      exportName: 'VoiceSentinelSentimentAnalysisFunctionArn',
    });

    new cdk.CfnOutput(this, 'TimeseriesDataFunctionArn', {
      value: this.timeseriesDataFunction.functionArn,
      description: 'ARN of the time-series data Lambda function',
      exportName: 'VoiceSentinelTimeseriesDataFunctionArn',
    });
  }
}