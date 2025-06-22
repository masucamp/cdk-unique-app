import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as location from 'aws-cdk-lib/aws-location';

export interface LocationStackProps {
  userPool: cognito.UserPool;
  identityPool: cognito.CfnIdentityPool;
}

export class LocationStack extends Construct {
  public readonly locationClient: any; // This is a placeholder
  public readonly mapName: string;
  public readonly placeIndexName: string;

  constructor(scope: Construct, id: string, props: LocationStackProps) {
    super(scope, id);

    // Create an AWS Location Service map
    const map = new location.CfnMap(this, 'VoiceVoyageMap', {
      mapName: 'VoiceVoyageMap',
      configuration: {
        style: 'VectorEsriNavigation', // You can choose different styles
      },
      description: 'Map for VoiceVoyage application',
    });

    this.mapName = map.mapName;

    // Create a place index for geocoding
    const placeIndex = new location.CfnPlaceIndex(this, 'VoiceVoyagePlaceIndex', {
      dataSource: 'Esri',
      indexName: 'VoiceVoyagePlaceIndex',
      description: 'Place index for VoiceVoyage application',
    });

    this.placeIndexName = placeIndex.indexName;

    // Grant authenticated users access to Location Service
    const authenticatedRole = iam.Role.fromRoleArn(
      this,
      'ImportedAuthRole',
      cdk.Fn.importValue('AuthenticatedRoleArn')
    );

    // Add Location Service permissions to the authenticated role
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'geo:GetMap*',
          'geo:SearchPlaceIndexForText',
          'geo:SearchPlaceIndexForPosition',
        ],
        resources: [
          map.attrArn,
          placeIndex.attrArn,
        ],
      })
    );

    // Output the map name and place index name
    new cdk.CfnOutput(this, 'MapName', {
      value: this.mapName,
    });

    new cdk.CfnOutput(this, 'PlaceIndexName', {
      value: this.placeIndexName,
    });
  }
}