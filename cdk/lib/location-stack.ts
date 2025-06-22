import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as location from 'aws-cdk-lib/aws-location';

export class LocationStack extends Construct {
  public readonly map: location.CfnMap;
  public readonly placeIndex: location.CfnPlaceIndex;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create an AWS Location Service Map
    this.map = new location.CfnMap(this, 'Map', {
      mapName: 'VoiceGuideMap',
      configuration: {
        style: 'VectorEsriNavigation', // Using Esri's navigation map style
      },
      description: 'Map for VoiceGuide application',
      pricingPlan: 'RequestBasedUsage', // Pay per request
    });

    // Create an AWS Location Service Place Index for geocoding and search
    this.placeIndex = new location.CfnPlaceIndex(this, 'PlaceIndex', {
      dataSource: 'Esri',
      indexName: 'VoiceGuidePlaceIndex',
      description: 'Place index for VoiceGuide application',
      pricingPlan: 'RequestBasedUsage', // Pay per request
    });
  }
}