import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as timestream from 'aws-cdk-lib/aws-timestream';

export class VoiceSentinelTimestreamStack extends cdk.Stack {
  public readonly database: timestream.CfnDatabase;
  public readonly table: timestream.CfnTable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Timestream database
    this.database = new timestream.CfnDatabase(this, 'VoiceSentinelDatabase', {
      databaseName: 'voice-sentinel-db',
    });

    // Create a Timestream table
    this.table = new timestream.CfnTable(this, 'SentimentAnalysisTable', {
      databaseName: this.database.databaseName!,
      tableName: 'sentiment-analysis',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7',
      },
    });

    // Add dependency to ensure the database is created before the table
    this.table.addDependency(this.database);

    // Output the database and table names
    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: this.database.databaseName!,
      description: 'Name of the Timestream database',
      exportName: 'VoiceSentinelTimestreamDatabaseName',
    });

    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: this.table.tableName!,
      description: 'Name of the Timestream table',
      exportName: 'VoiceSentinelTimestreamTableName',
    });
  }
}