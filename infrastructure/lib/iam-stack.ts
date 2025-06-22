import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class VoiceSentinelIamStack extends cdk.Stack {
  public readonly lambdaRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a role for Lambda functions with permissions to access Polly, Comprehend, and Timestream
    this.lambdaRole = new iam.Role(this, 'VoiceSentinelLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for VoiceSentinel Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Add permissions for AWS Polly
    this.lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'polly:SynthesizeSpeech',
        'polly:DescribeVoices',
      ],
      resources: ['*'],
    }));

    // Add permissions for AWS Comprehend
    this.lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'comprehend:DetectSentiment',
        'comprehend:BatchDetectSentiment',
      ],
      resources: ['*'],
    }));

    // Add permissions for AWS Timestream
    this.lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'timestream:WriteRecords',
        'timestream:Select',
        'timestream:DescribeTable',
        'timestream:ListMeasures',
      ],
      resources: ['*'],
    }));

    // Output the role ARN
    new cdk.CfnOutput(this, 'LambdaRoleArn', {
      value: this.lambdaRole.roleArn,
      description: 'ARN of the Lambda execution role',
      exportName: 'VoiceSentinelLambdaRoleArn',
    });
  }
}