import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';

export interface FrontendStackProps {
  apiEndpoint: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  identityPool: cognito.CfnIdentityPool;
  mapName: string;
}

export class FrontendStack extends Construct {
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id);

    // Create an S3 bucket to host the React application
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only, use RETAIN for production
      autoDeleteObjects: true, // For development only
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Create a CloudFront distribution to serve the website
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
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

    // Store the distribution domain name
    this.distributionDomainName = distribution.distributionDomainName;

    // Create a config.js file with environment variables for the React app
    const configContent = `
window.REACT_APP_API_ENDPOINT = '${props.apiEndpoint}';
window.REACT_APP_USER_POOL_ID = '${props.userPool.userPoolId}';
window.REACT_APP_USER_POOL_CLIENT_ID = '${props.userPoolClient.userPoolClientId}';
window.REACT_APP_IDENTITY_POOL_ID = '${props.identityPool.ref}';
window.REACT_APP_AWS_REGION = '${cdk.Aws.REGION}';
window.REACT_APP_MAP_NAME = '${props.mapName}';
`;

    // Deploy the React application to the S3 bucket
    // Note: In a real project, you would build the React app first
    // For this example, we're just deploying a placeholder
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../frontend/build')),
        s3deploy.Source.data('config.js', configContent),
      ],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The URL of the VoiceVoyage application',
    });
  }
}