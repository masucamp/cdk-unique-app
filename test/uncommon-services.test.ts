import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UncommonServicesStack } from '../lib/uncommon-services-stack';

test('AppSync API Created', () => {
  const app = new cdk.App();
  const stack = new UncommonServicesStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  // Verify AppSync API is created
  template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  template.resourceCountIs('AWS::AppSync::ApiKey', 1);
  template.resourceCountIs('AWS::AppSync::DataSource', 1);
  template.resourceCountIs('AWS::AppSync::Resolver', 2);
});

test('Timestream Resources Created', () => {
  const app = new cdk.App();
  const stack = new UncommonServicesStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  // Verify Timestream resources are created
  template.resourceCountIs('AWS::Timestream::Database', 1);
  template.resourceCountIs('AWS::Timestream::Table', 1);
});

test('Lambda Function Created', () => {
  const app = new cdk.App();
  const stack = new UncommonServicesStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  // Verify Lambda function is created
  template.resourceCountIs('AWS::Lambda::Function', 1);
  
  // Verify Lambda has permissions to access Timestream
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "timestream:WriteRecords",
            "timestream:Select",
            "timestream:DescribeTable",
            "timestream:ListMeasures"
          ],
          Effect: "Allow"
        }
      ]
    }
  });
});