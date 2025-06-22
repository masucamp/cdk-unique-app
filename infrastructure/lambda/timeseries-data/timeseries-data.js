const AWS = require('aws-sdk');
const timestream = new AWS.TimestreamWrite();
const timestreamQuery = new AWS.TimestreamQuery();
const { v4: uuidv4 } = require('uuid');

// Environment variables
const DATABASE_NAME = process.env.DATABASE_NAME || 'voice-sentinel-db';
const TABLE_NAME = process.env.TABLE_NAME || 'sentiment-analysis';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Determine which operation to perform based on the field name
  if (event.info.fieldName === 'storeSentimentData') {
    return await storeSentimentData(event);
  } else if (event.info.fieldName === 'getSentimentHistory') {
    return await getSentimentHistory(event);
  } else {
    throw new Error(`Unsupported field name: ${event.info.fieldName}`);
  }
};

async function storeSentimentData(event) {
  try {
    // Extract parameters from the event
    const { text, sentiment, sentimentScores, timestamp } = event.arguments.input;
    
    // Generate a unique record ID
    const recordId = uuidv4();
    
    // Prepare current time if timestamp is not provided
    const currentTime = timestamp ? new Date(timestamp).getTime() : new Date().getTime();
    
    // Prepare dimensions (metadata)
    const dimensions = [
      { Name: 'recordId', Value: recordId },
      { Name: 'text', Value: text },
      { Name: 'sentiment', Value: sentiment },
    ];
    
    // Prepare measures (values)
    const measures = [
      {
        Name: 'positive',
        Value: String(sentimentScores.positive),
        Type: 'DOUBLE',
      },
      {
        Name: 'negative',
        Value: String(sentimentScores.negative),
        Type: 'DOUBLE',
      },
      {
        Name: 'neutral',
        Value: String(sentimentScores.neutral),
        Type: 'DOUBLE',
      },
      {
        Name: 'mixed',
        Value: String(sentimentScores.mixed),
        Type: 'DOUBLE',
      },
    ];
    
    // Prepare the record
    const record = {
      Dimensions: dimensions,
      MeasureName: 'sentiment_scores',
      MeasureValues: measures,
      MeasureValueType: 'MULTI',
      Time: String(currentTime),
    };
    
    // Prepare parameters for Timestream
    const params = {
      DatabaseName: DATABASE_NAME,
      TableName: TABLE_NAME,
      Records: [record],
    };
    
    console.log('Timestream write params:', JSON.stringify(params, null, 2));
    
    // Write the record to Timestream
    const result = await timestream.writeRecords(params).promise();
    console.log('Timestream write result:', result);
    
    return {
      success: true,
      recordId,
    };
  } catch (error) {
    console.error('Error:', error);
    throw new Error(`Error storing sentiment data: ${error.message}`);
  }
}

async function getSentimentHistory(event) {
  try {
    // Extract parameters from the event
    const { startTime, endTime } = event.arguments.timeRange;
    
    // Convert timestamps to milliseconds
    const startTimeMs = new Date(startTime).getTime();
    const endTimeMs = new Date(endTime).getTime();
    
    // Prepare the query
    const query = `
      SELECT 
        time,
        measure_name,
        recordId,
        text,
        sentiment,
        positive,
        negative,
        neutral,
        mixed
      FROM "${DATABASE_NAME}"."${TABLE_NAME}"
      WHERE time BETWEEN FROM_MILLISECONDS(${startTimeMs}) AND FROM_MILLISECONDS(${endTimeMs})
      ORDER BY time DESC
    `;
    
    console.log('Timestream query:', query);
    
    // Execute the query
    const result = await timestreamQuery.query({ QueryString: query }).promise();
    console.log('Timestream query result:', JSON.stringify(result, null, 2));
    
    // Process the results
    const records = [];
    
    if (result.Rows && result.Rows.length > 0) {
      // Get column info
      const columnInfo = {};
      result.ColumnInfo.forEach((column, index) => {
        columnInfo[column.Name] = index;
      });
      
      // Process each row
      for (const row of result.Rows) {
        const data = row.Data;
        
        const record = {
          recordId: data[columnInfo.recordId].ScalarValue,
          text: data[columnInfo.text].ScalarValue,
          sentiment: data[columnInfo.sentiment].ScalarValue,
          timestamp: new Date(parseInt(data[columnInfo.time].ScalarValue)).toISOString(),
          sentimentScores: {
            positive: parseFloat(data[columnInfo.positive].ScalarValue),
            negative: parseFloat(data[columnInfo.negative].ScalarValue),
            neutral: parseFloat(data[columnInfo.neutral].ScalarValue),
            mixed: parseFloat(data[columnInfo.mixed].ScalarValue),
          },
        };
        
        records.push(record);
      }
    }
    
    return records;
  } catch (error) {
    console.error('Error:', error);
    throw new Error(`Error retrieving sentiment history: ${error.message}`);
  }
}