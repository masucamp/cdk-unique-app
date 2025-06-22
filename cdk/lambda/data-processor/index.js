const AWS = require('aws-sdk');

// Initialize the Timestream client
const timestreamWrite = new AWS.TimestreamWrite();

// Get environment variables
const DATABASE_NAME = process.env.TIMESTREAM_DATABASE_NAME;
const TABLE_NAME = process.env.TIMESTREAM_TABLE_NAME;

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // For IoT Rule invocation
    if (event.deviceId) {
      await processDeviceData(event);
      return { statusCode: 200, body: 'Data processed successfully' };
    }
    
    // For AppSync resolver invocations
    if (event.field) {
      return handleAppSyncRequest(event);
    }
    
    return {
      statusCode: 400,
      body: 'Invalid event format',
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: `Error processing data: ${error.message}`,
    };
  }
};

// Process device location data and store in Timestream
async function processDeviceData(data) {
  const { deviceId, latitude, longitude, timestamp, accuracy, speed, heading, type, name } = data;
  
  const currentTime = new Date().getTime();
  const recordTime = timestamp ? new Date(timestamp).getTime() : currentTime;
  
  const dimensions = [
    { Name: 'deviceId', Value: deviceId },
  ];
  
  if (type) {
    dimensions.push({ Name: 'type', Value: type });
  }
  
  if (name) {
    dimensions.push({ Name: 'name', Value: name });
  }
  
  const records = [
    {
      Dimensions: dimensions,
      MeasureName: 'location',
      MeasureValue: `${latitude},${longitude}`,
      MeasureValueType: 'VARCHAR',
      Time: recordTime.toString(),
    },
  ];
  
  // Add optional measures if they exist
  if (accuracy !== undefined) {
    records.push({
      Dimensions: dimensions,
      MeasureName: 'accuracy',
      MeasureValue: accuracy.toString(),
      MeasureValueType: 'DOUBLE',
      Time: recordTime.toString(),
    });
  }
  
  if (speed !== undefined) {
    records.push({
      Dimensions: dimensions,
      MeasureName: 'speed',
      MeasureValue: speed.toString(),
      MeasureValueType: 'DOUBLE',
      Time: recordTime.toString(),
    });
  }
  
  if (heading !== undefined) {
    records.push({
      Dimensions: dimensions,
      MeasureName: 'heading',
      MeasureValue: heading.toString(),
      MeasureValueType: 'DOUBLE',
      Time: recordTime.toString(),
    });
  }
  
  const params = {
    DatabaseName: DATABASE_NAME,
    TableName: TABLE_NAME,
    Records: records,
  };
  
  console.log('Writing records to Timestream:', JSON.stringify(params, null, 2));
  await timestreamWrite.writeRecords(params).promise();
  console.log('Records written successfully');
}

// Handle AppSync GraphQL API requests
async function handleAppSyncRequest(event) {
  const { field, arguments: args } = event;
  
  switch (field) {
    case 'getDeviceLocations':
      return await getDeviceLocations(args.limit || 10);
    case 'getDeviceHistory':
      return await getDeviceHistory(args.deviceId, args.startTime, args.endTime);
    default:
      throw new Error(`Unsupported field: ${field}`);
  }
}

// Query the latest device locations
async function getDeviceLocations(limit) {
  // Initialize the Timestream query client
  const timestreamQuery = new AWS.TimestreamQuery();
  
  const query = `
    SELECT DISTINCT deviceId, 
           LAST_VALUE(measure_value::varchar) OVER (PARTITION BY deviceId ORDER BY time) as location,
           LAST_VALUE(time) OVER (PARTITION BY deviceId ORDER BY time) as timestamp,
           LAST_VALUE(name::varchar) OVER (PARTITION BY deviceId ORDER BY time) as name,
           LAST_VALUE(type::varchar) OVER (PARTITION BY deviceId ORDER BY time) as type,
           LAST_VALUE(accuracy::double) OVER (PARTITION BY deviceId ORDER BY time) as accuracy,
           LAST_VALUE(speed::double) OVER (PARTITION BY deviceId ORDER BY time) as speed,
           LAST_VALUE(heading::double) OVER (PARTITION BY deviceId ORDER BY time) as heading
    FROM "${DATABASE_NAME}"."${TABLE_NAME}"
    WHERE measure_name = 'location'
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  
  console.log('Executing query:', query);
  const result = await timestreamQuery.query({ QueryString: query }).promise();
  
  return formatDeviceLocations(result);
}

// Query the location history for a specific device
async function getDeviceHistory(deviceId, startTime, endTime) {
  // Initialize the Timestream query client
  const timestreamQuery = new AWS.TimestreamQuery();
  
  const startTimeStr = new Date(startTime).toISOString();
  const endTimeStr = new Date(endTime).toISOString();
  
  const query = `
    SELECT time, measure_value::varchar as location,
           accuracy::double, speed::double, heading::double
    FROM "${DATABASE_NAME}"."${TABLE_NAME}"
    WHERE deviceId = '${deviceId}'
      AND measure_name = 'location'
      AND time BETWEEN '${startTimeStr}' AND '${endTimeStr}'
    ORDER BY time ASC
  `;
  
  console.log('Executing query:', query);
  const result = await timestreamQuery.query({ QueryString: query }).promise();
  
  return {
    deviceId,
    locations: formatLocationHistory(result),
    startTime,
    endTime,
  };
}

// Format device locations for GraphQL response
function formatDeviceLocations(queryResult) {
  return queryResult.Rows.map(row => {
    const data = {};
    row.Data.forEach((cell, index) => {
      const columnName = queryResult.ColumnInfo[index].Name;
      data[columnName] = cell.ScalarValue;
    });
    
    const [latitude, longitude] = data.location.split(',').map(Number);
    
    return {
      device: {
        deviceId: data.deviceId,
        name: data.name || data.deviceId,
        type: data.type || 'unknown',
      },
      location: {
        latitude,
        longitude,
        timestamp: data.timestamp,
        accuracy: data.accuracy ? Number(data.accuracy) : null,
        speed: data.speed ? Number(data.speed) : null,
        heading: data.heading ? Number(data.heading) : null,
      },
    };
  });
}

// Format location history for GraphQL response
function formatLocationHistory(queryResult) {
  return queryResult.Rows.map(row => {
    const data = {};
    row.Data.forEach((cell, index) => {
      const columnName = queryResult.ColumnInfo[index].Name;
      data[columnName] = cell.ScalarValue;
    });
    
    const [latitude, longitude] = data.location.split(',').map(Number);
    
    return {
      latitude,
      longitude,
      timestamp: data.time,
      accuracy: data.accuracy ? Number(data.accuracy) : null,
      speed: data.speed ? Number(data.speed) : null,
      heading: data.heading ? Number(data.heading) : null,
    };
  });
}