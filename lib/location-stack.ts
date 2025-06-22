import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as appsync from 'aws-cdk-lib/aws-appsync';

interface LocationStackProps extends cdk.StackProps {
  api: appsync.GraphqlApi;
}

export class LocationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LocationStackProps) {
    super(scope, id, props);

    // Create an AWS Location Service map resource
    const cfnMap = new cdk.aws_location.CfnMap(this, 'VoiceTrailMap', {
      mapName: 'voice-trail-map',
      configuration: {
        style: 'VectorEsriNavigation',
      },
      description: 'Map for VoiceTrail application',
    });

    // Create an AWS Location Service route calculator
    const cfnRouteCalculator = new cdk.aws_location.CfnRouteCalculator(this, 'VoiceTrailRouteCalculator', {
      calculatorName: 'voice-trail-route-calculator',
      description: 'Route calculator for VoiceTrail application',
    });

    // Create a Lambda function to interact with AWS Location Service and Polly
    const locationPollyLambda = new lambda.Function(this, 'LocationPollyHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/location-polly'),
      environment: {
        MAP_NAME: cfnMap.mapName!,
        ROUTE_CALCULATOR_NAME: cfnRouteCalculator.calculatorName!,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant the Lambda function permissions to access AWS Location Service
    locationPollyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'geo:GetMap*',
          'geo:SearchPlaceIndexForPosition',
          'geo:SearchPlaceIndexForText',
          'geo:CalculateRoute',
        ],
        resources: ['*'],
      })
    );

    // Grant the Lambda function permissions to access AWS Polly
    locationPollyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'polly:SynthesizeSpeech',
          'polly:DescribeVoices',
        ],
        resources: ['*'],
      })
    );

    // Create a Lambda data source for AppSync
    const lambdaDataSource = props.api.addLambdaDataSource(
      'LocationPollyDataSource',
      locationPollyLambda
    );

    // Create resolvers for the GraphQL API
    lambdaDataSource.createResolver('GetRouteResolver', {
      typeName: 'Query',
      fieldName: 'getRoute',
    });

    lambdaDataSource.createResolver('GetVoiceInstructionsResolver', {
      typeName: 'Query',
      fieldName: 'getVoiceInstructions',
    });

    lambdaDataSource.createResolver('SearchPlacesResolver', {
      typeName: 'Query',
      fieldName: 'searchPlaces',
    });

    // Output the map name and route calculator name
    new cdk.CfnOutput(this, 'MapName', {
      value: cfnMap.mapName!,
      description: 'The name of the AWS Location Service map',
      exportName: 'VoiceTrailMapName',
    });

    new cdk.CfnOutput(this, 'RouteCalculatorName', {
      value: cfnRouteCalculator.calculatorName!,
      description: 'The name of the AWS Location Service route calculator',
      exportName: 'VoiceTrailRouteCalculatorName',
    });
  }
}