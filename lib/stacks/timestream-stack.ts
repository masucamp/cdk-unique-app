import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as timestream from 'aws-cdk-lib/aws-timestream';

export class TimestreamStack extends Construct {
  public readonly timestreamDatabase: timestream.CfnDatabase;
  public readonly timestreamTable: timestream.CfnTable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a Timestream database
    this.timestreamDatabase = new timestream.CfnDatabase(this, 'VoiceVoyageDatabase', {
      databaseName: 'VoiceVoyageDB',
    });

    // Create a Timestream table
    this.timestreamTable = new timestream.CfnTable(this, 'VoiceVoyageTable', {
      databaseName: this.timestreamDatabase.databaseName,
      tableName: 'TravelEvents',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7',
      },
    });

    // Add dependency to ensure the database is created before the table
    this.timestreamTable.addDependency(this.timestreamDatabase);

    // Create an IAM role for Lambda to access Timestream
    const timestreamAccessRole = new iam.Role(this, 'TimestreamAccessRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Add Timestream permissions to the role
    timestreamAccessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'timestream:WriteRecords',
          'timestream:Select',
          'timestream:DescribeTable',
          'timestream:ListMeasures',
        ],
        resources: [
          this.timestreamTable.attrArn,
          `${this.timestreamDatabase.attrArn}/*`,
        ],
      })
    );

    timestreamAccessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'timestream:DescribeEndpoints',
          'timestream:SelectValues',
          'timestream:CancelQuery',
        ],
        resources: ['*'],
      })
    );

    // Output the database and table names
    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: this.timestreamDatabase.databaseName,
    });

    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: this.timestreamTable.tableName,
    });
  }
}