import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface ComprehendStackProps {
  userPool: cognito.UserPool;
  identityPool: cognito.CfnIdentityPool;
}

export class ComprehendStack extends Construct {
  public readonly comprehendClient: any; // This is a placeholder as CDK doesn't have a direct Comprehend construct

  constructor(scope: Construct, id: string, props: ComprehendStackProps) {
    super(scope, id);

    // Grant authenticated users access to Comprehend
    const authenticatedRole = iam.Role.fromRoleArn(
      this,
      'ImportedAuthRole',
      cdk.Fn.importValue('AuthenticatedRoleArn')
    );

    // Add Comprehend permissions to the authenticated role
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'comprehend:DetectEntities',
          'comprehend:DetectKeyPhrases',
          'comprehend:DetectSentiment',
          'comprehend:DetectDominantLanguage',
        ],
        resources: ['*'],
      })
    );
  }
}