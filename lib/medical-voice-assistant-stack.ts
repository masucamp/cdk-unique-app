import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';

export class MedicalVoiceAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Buckets for input medical text files and output audio files
    const inputBucket = new s3.Bucket(this, 'MedicalTextInputBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const outputBucket = new s3.Bucket(this, 'MedicalAudioOutputBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda function for medical text analysis using Comprehend Medical
    const analyzeTextFunction = new lambda.Function(this, 'AnalyzeMedicalTextFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/analyze-text')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        OUTPUT_BUCKET: outputBucket.bucketName,
      },
    });

    // Grant permissions to use Comprehend Medical
    analyzeTextFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['comprehendmedical:DetectEntitiesV2'],
      resources: ['*'],
    }));

    // Grant permissions to read from input bucket
    inputBucket.grantRead(analyzeTextFunction);
    outputBucket.grantWrite(analyzeTextFunction);

    // Lambda function for text-to-speech conversion using Polly
    const textToSpeechFunction = new lambda.Function(this, 'TextToSpeechFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/text-to-speech')),
      timeout: cdk.Duration.seconds(60),
      environment: {
        OUTPUT_BUCKET: outputBucket.bucketName,
      },
    });

    // Grant permissions to use Polly
    textToSpeechFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['polly:SynthesizeSpeech'],
      resources: ['*'],
    }));

    // Grant permissions to write to output bucket
    outputBucket.grantWrite(textToSpeechFunction);

    // Step Functions workflow definition
    const analyzeTextTask = new tasks.LambdaInvoke(this, 'AnalyzeMedicalText', {
      lambdaFunction: analyzeTextFunction,
      outputPath: '$.Payload',
    });

    const textToSpeechTask = new tasks.LambdaInvoke(this, 'ConvertTextToSpeech', {
      lambdaFunction: textToSpeechFunction,
      outputPath: '$.Payload',
    });

    // Create the workflow
    const workflow = new sfn.StateMachine(this, 'MedicalVoiceAssistantWorkflow', {
      definition: analyzeTextTask.next(textToSpeechTask),
      timeout: cdk.Duration.minutes(5),
    });

    // Lambda function to start the Step Functions workflow when a file is uploaded
    const triggerWorkflowFunction = new lambda.Function(this, 'TriggerWorkflowFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/trigger-workflow')),
      environment: {
        STATE_MACHINE_ARN: workflow.stateMachineArn,
      },
    });

    // Grant permission to start execution of the state machine
    workflow.grantStartExecution(triggerWorkflowFunction);
    inputBucket.grantRead(triggerWorkflowFunction);

    // Configure S3 event notification to trigger the workflow
    inputBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(triggerWorkflowFunction)
    );

    // Output the bucket names
    new cdk.CfnOutput(this, 'InputBucketName', {
      value: inputBucket.bucketName,
      description: 'The name of the bucket where medical text files should be uploaded',
    });

    new cdk.CfnOutput(this, 'OutputBucketName', {
      value: outputBucket.bucketName,
      description: 'The name of the bucket where audio files will be stored',
    });
  }
}