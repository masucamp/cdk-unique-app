import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';

interface FrontendStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  api: appsync.GraphqlApi;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Create an Amplify app
    const amplifyApp = new amplify.App(this, 'VoiceTrailAmplifyApp', {
      appName: 'voice-trail',
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: 'GITHUB_OWNER', // Replace with your GitHub username or organization
        repository: 'voice-trail',
        oauthToken: cdk.SecretValue.secretsManager('github-token'), // Create this secret in AWS Secrets Manager
      }),
      environmentVariables: {
        REACT_APP_REGION: this.region,
        REACT_APP_USER_POOL_ID: props.userPool.userPoolId,
        REACT_APP_USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        REACT_APP_API_URL: props.api.graphqlUrl,
      },
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
      }),
    });

    // Add a main branch
    const mainBranch = amplifyApp.addBranch('main', {
      autoBuild: true,
      stage: 'PRODUCTION',
    });

    // Create an IAM role for the Amplify app
    const amplifyRole = new iam.Role(this, 'AmplifyRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
    });

    // Grant the Amplify app permissions to access Cognito
    amplifyRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:DescribeUserPool',
          'cognito-idp:DescribeUserPoolClient',
        ],
        resources: [
          props.userPool.userPoolArn,
          `${props.userPool.userPoolArn}/client/${props.userPoolClient.userPoolClientId}`,
        ],
      })
    );

    // Grant the Amplify app permissions to access AppSync
    amplifyRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'appsync:GetGraphqlApi',
        ],
        resources: [props.api.arn],
      })
    );

    // Output the Amplify app ID and URL
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.appId,
      description: 'The ID of the Amplify app',
      exportName: 'VoiceTrailAmplifyAppId',
    });

    new cdk.CfnOutput(this, 'AmplifyAppURL', {
      value: `https://main.${amplifyApp.appId}.amplifyapp.com`,
      description: 'The URL of the Amplify app',
      exportName: 'VoiceTrailAmplifyAppURL',
    });
  }
}