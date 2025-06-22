import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as timestream from 'aws-cdk-lib/aws-timestream';

export class TimestreamStack extends Construct {
  public readonly database: timestream.CfnDatabase;
  public readonly table: timestream.CfnTable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a Timestream database
    this.database = new timestream.CfnDatabase(this, 'Database', {
      databaseName: 'VoiceGuideDB',
    });

    // Create a Timestream table for user interactions
    this.table = new timestream.CfnTable(this, 'Table', {
      databaseName: this.database.databaseName,
      tableName: 'UserInteractions',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '7',
      },
    });

    // Add dependency to ensure database is created before table
    this.table.addDependency(this.database);
  }
}