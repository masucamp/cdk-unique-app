import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class PollyStack extends Construct {
  public readonly pollyRole: iam.Role;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create an IAM role for AWS Polly access
    this.pollyRole = new iam.Role(this, 'PollyRole', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      description: 'Role for AWS Polly text-to-speech synthesis',
    });

    // Grant permissions to use AWS Polly
    this.pollyRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'polly:SynthesizeSpeech',
          'polly:DescribeVoices',
        ],
        resources: ['*'],
      })
    );
  }
}