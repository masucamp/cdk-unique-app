import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as MedicalVoiceAssistant from '../lib/medical-voice-assistant-stack';

test('Medical Voice Assistant Stack Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new MedicalVoiceAssistant.MedicalVoiceAssistantStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);

  // Verify S3 buckets are created
  template.resourceCountIs('AWS::S3::Bucket', 2);
  
  // Verify Lambda functions are created
  template.resourceCountIs('AWS::Lambda::Function', 3);
  
  // Verify Step Functions state machine is created
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
  
  // Verify IAM roles with appropriate permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 'comprehendmedical:DetectEntitiesV2',
          Effect: 'Allow',
          Resource: '*'
        }
      ]
    }
  });
  
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 'polly:SynthesizeSpeech',
          Effect: 'Allow',
          Resource: '*'
        }
      ]
    }
  });
});