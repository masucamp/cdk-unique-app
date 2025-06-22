import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as VoiceTrack from '../lib/voice-track-stack';
import * as Auth from '../lib/auth-stack';
import * as cognito from 'aws-cdk-lib/aws-cognito';

describe('VoiceTrack Stack', () => {
  let app: cdk.App;
  let authStack: Auth.AuthStack;
  let stack: VoiceTrack.VoiceTrackStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    
    // Create the auth stack first
    authStack = new Auth.AuthStack(app, 'TestAuthStack');
    
    // Create the main stack with references to the auth stack
    stack = new VoiceTrack.VoiceTrackStack(app, 'TestVoiceTrackStack', {
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
      identityPool: authStack.identityPool,
    });
    
    // Prepare the CloudFormation template for assertions
    template = Template.fromStack(stack);
  });

  test('AWS Location Service Map Created', () => {
    template.hasResourceProperties('AWS::Location::Map', {
      MapName: 'voice-track-map',
      Configuration: {
        Style: 'VectorEsriStreets',
      },
    });
  });

  test('AWS Location Service Tracker Created', () => {
    template.hasResourceProperties('AWS::Location::Tracker', {
      TrackerName: 'voice-track-tracker',
      PositionFiltering: 'AccuracyBased',
    });
  });

  test('AWS Location Service Geofence Collection Created', () => {
    template.hasResourceProperties('AWS::Location::GeofenceCollection', {
      CollectionName: 'voice-track-geofences',
    });
  });

  test('AWS Timestream Database Created', () => {
    template.hasResourceProperties('AWS::Timestream::Database', {
      DatabaseName: 'voicetrackdb',
    });
  });

  test('AWS Timestream Table Created', () => {
    template.hasResourceProperties('AWS::Timestream::Table', {
      DatabaseName: {
        Ref: expect.stringMatching(/VoiceTrackTimestreamDB/),
      },
      TableName: 'locationhistory',
    });
  });

  test('AppSync API Created', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'VoiceTrackAPI',
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
    });
  });

  test('Lambda Functions Created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 2);
  });

  test('Lambda Functions Have Correct Permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Action: expect.arrayContaining([
              'geo:GetMap*',
              'geo:SearchPlaceIndex*',
            ]),
            Effect: 'Allow',
          }),
        ]),
      },
    });

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Action: expect.arrayContaining([
              'polly:SynthesizeSpeech',
            ]),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});