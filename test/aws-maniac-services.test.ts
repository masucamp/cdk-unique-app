import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as AwsManiacServices from '../lib/aws-maniac-services-stack';

describe('AWS Maniac Services Stack', () => {
  const app = new cdk.App();
  const stack = new AwsManiacServices.AwsManiacServicesStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  test('Neptune Cluster Created', () => {
    template.hasResourceProperties('AWS::Neptune::DBCluster', {
      DBClusterIdentifier: 'content-recommendation-db',
    });
  });

  test('Neptune Instance Created', () => {
    template.hasResourceProperties('AWS::Neptune::DBInstance', {
      DBInstanceClass: 'db.t3.medium',
    });
  });

  test('AppSync API Created', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'ContentRecommendationAPI',
      AuthenticationType: 'API_KEY',
    });
  });

  test('Lambda Function Created', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
      Handler: 'index.handler',
    });
  });

  test('S3 Bucket Created', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {});
  });

  test('CloudFront Distribution Created', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html',
      },
    });
  });
});