import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

interface AmplifyStackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  identityPool: cognito.CfnIdentityPool;
  graphqlApi: appsync.GraphqlApi;
}

export class AmplifyStack extends Construct {
  public readonly app: amplify.CfnApp;
  public readonly appDomain: string;

  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id);

    // Create an Amplify app
    this.app = new amplify.CfnApp(this, 'App', {
      name: 'VoiceGuide',
      description: 'Interactive Voice-Guided Travel Companion',
      repository: 'https://github.com/yourusername/voice-guide', // Replace with your repository
      accessToken: '{{resolve:secretsmanager:AmplifyGitHubToken:SecretString}}', // Create this secret in AWS Secrets Manager
      environmentVariables: [
        {
          name: 'USER_POOL_ID',
          value: props.userPool.userPoolId,
        },
        {
          name: 'USER_POOL_CLIENT_ID',
          value: props.userPoolClient.userPoolClientId,
        },
        {
          name: 'IDENTITY_POOL_ID',
          value: props.identityPool.ref,
        },
        {
          name: 'GRAPHQL_API_URL',
          value: props.graphqlApi.graphqlUrl,
        },
        {
          name: 'GRAPHQL_API_KEY',
          value: props.graphqlApi.apiKey || '',
        },
        {
          name: 'REGION',
          value: cdk.Aws.REGION,
        },
      ],
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
      }).toString(),
      platform: 'WEB',
      iamServiceRole: this.createAmplifyServiceRole().roleArn,
    });

    // Create a branch for the main branch
    const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: this.app.attrAppId,
      branchName: 'main',
      enableAutoBuild: true,
      stage: 'PRODUCTION',
    });

    // Set the app domain
    this.appDomain = `${mainBranch.branchName}.${this.app.attrDefaultDomain}`;
  }

  private createAmplifyServiceRole(): iam.Role {
    const role = new iam.Role(this, 'AmplifyServiceRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      description: 'Role for Amplify to build and deploy the VoiceGuide application',
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'amplify:*',
          'cloudformation:*',
          'cloudfront:*',
          's3:*',
          'route53:*',
          'cognito-idp:*',
          'cognito-identity:*',
          'appsync:*',
        ],
        resources: ['*'],
      })
    );

    return role;
  }
}