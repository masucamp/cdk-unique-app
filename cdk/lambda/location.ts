import { AppSyncResolverHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const location = new AWS.Location();
const timestream = new AWS.TimestreamWrite();

// Interface definitions
interface LocationEvent {
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

interface GeofenceEvent {
  geofenceName: string;
  latitude: number;
  longitude: number;
  radius: number;
  notificationMessage?: string;
}

interface LocationHistoryQuery {
  deviceId: string;
  startTime: string;
  endTime: string;
}

// Main handler function
export const handler: AppSyncResolverHandler<any, any> = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { fieldName } = event.info;
  const args = event.arguments;
  
  try {
    switch (fieldName) {
      case 'getCurrentLocation':
        return await getCurrentLocation(args.deviceId);
      
      case 'getLocationHistory':
        return await getLocationHistory(args as LocationHistoryQuery);
      
      case 'trackLocation':
        return await trackLocation(args as LocationEvent);
      
      case 'createGeofence':
        return await createGeofence(args as GeofenceEvent);
      
      case 'getGeofences':
        return await getGeofences();
      
      case 'getGeofence':
        return await getGeofence(args.geofenceId);
      
      case 'deleteGeofence':
        return await deleteGeofence(args.geofenceId);
      
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Get the current location of a device
async function getCurrentLocation(deviceId: string) {
  const params = {
    DeviceId: deviceId,
    TrackerName: process.env.TRACKER_NAME!,
  };
  
  try {
    const response = await location.getDevicePosition(params).promise();
    
    return {
      deviceId,
      latitude: response.Position?.[1],
      longitude: response.Position?.[0],
      timestamp: response.ReceivedTime,
      accuracy: response.Accuracy,
      heading: response.Heading,
      speed: response.Speed,
    };
  } catch (error) {
    console.error('Error getting device position:', error);
    throw error;
  }
}

// Get location history for a device within a time range
async function getLocationHistory(query: LocationHistoryQuery) {
  const { deviceId, startTime, endTime } = query;
  
  // Query Timestream for location history
  const queryString = `
    SELECT time, deviceId, measure_value::double as latitude, measure_value::double as longitude
    FROM "${process.env.TIMESTREAM_DATABASE_NAME}"."${process.env.TIMESTREAM_TABLE_NAME}"
    WHERE deviceId = '${deviceId}'
    AND time BETWEEN '${startTime}' AND '${endTime}'
    ORDER BY time DESC
  `;
  
  try {
    const timestreamQuery = new AWS.TimestreamQuery();
    const response = await timestreamQuery.query({ QueryString: queryString }).promise();
    
    if (!response.Rows || response.Rows.length === 0) {
      return [];
    }
    
    // Transform the query results into the expected format
    return response.Rows.map(row => {
      const data: any = {};
      
      row.Data?.forEach((value, index) => {
        const columnName = response.ColumnInfo?.[index].Name;
        if (columnName) {
          data[columnName] = value.ScalarValue;
        }
      });
      
      return {
        deviceId: data.deviceId,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timestamp: data.time,
      };
    });
  } catch (error) {
    console.error('Error querying location history:', error);
    throw error;
  }
}

// Track a new location for a device
async function trackLocation(locationEvent: LocationEvent) {
  const { deviceId, latitude, longitude, accuracy, heading, speed } = locationEvent;
  const timestamp = new Date().toISOString();
  
  // Update device position in Location Service
  const locationParams = {
    TrackerName: process.env.TRACKER_NAME!,
    Updates: [
      {
        DeviceId: deviceId,
        Position: [longitude, latitude],
        SampleTime: timestamp,
        Accuracy: accuracy !== undefined ? { Horizontal: accuracy } : undefined,
        PositionProperties: {
          Heading: heading?.toString(),
          Speed: speed?.toString(),
        },
      },
    ],
  };
  
  try {
    await location.batchUpdateDevicePosition(locationParams).promise();
    
    // Store location data in Timestream
    const timestreamParams = {
      DatabaseName: process.env.TIMESTREAM_DATABASE_NAME!,
      TableName: process.env.TIMESTREAM_TABLE_NAME!,
      Records: [
        {
          Dimensions: [
            { Name: 'deviceId', Value: deviceId },
          ],
          MeasureName: 'location',
          MeasureValues: [
            { Name: 'latitude', Value: latitude.toString(), Type: 'DOUBLE' },
            { Name: 'longitude', Value: longitude.toString(), Type: 'DOUBLE' },
          ],
          MeasureValueType: 'MULTI',
          Time: Date.now().toString(),
          TimeUnit: 'MILLISECONDS',
        },
      ],
    };
    
    await timestream.writeRecords(timestreamParams).promise();
    
    // Check if the device is within any geofences
    const geofenceParams = {
      CollectionName: process.env.GEOFENCE_COLLECTION_NAME!,
      DevicePositionUpdates: [
        {
          DeviceId: deviceId,
          Position: [longitude, latitude],
          SampleTime: timestamp,
        },
      ],
    };
    
    const geofenceResponse = await location.batchEvaluateGeofences(geofenceParams).promise();
    
    // Return the location data
    return {
      deviceId,
      latitude,
      longitude,
      timestamp,
      accuracy,
      heading,
      speed,
    };
  } catch (error) {
    console.error('Error tracking location:', error);
    throw error;
  }
}

// Create a new geofence
async function createGeofence(geofenceEvent: GeofenceEvent) {
  const { geofenceName, latitude, longitude, radius, notificationMessage } = geofenceEvent;
  const timestamp = new Date().toISOString();
  
  // Create a circular geofence
  const params = {
    CollectionName: process.env.GEOFENCE_COLLECTION_NAME!,
    GeofenceId: `geofence-${Date.now()}`,
    Geometry: {
      Circle: {
        Center: [longitude, latitude],
        Radius: radius,
      },
    },
    GeofenceProperties: {
      Name: geofenceName,
      NotificationMessage: notificationMessage || `You are near ${geofenceName}`,
    },
  };
  
  try {
    await location.putGeofence(params).promise();
    
    return {
      geofenceId: params.GeofenceId,
      geofenceName,
      latitude,
      longitude,
      radius,
      notificationMessage: params.GeofenceProperties.NotificationMessage,
      createdAt: timestamp,
    };
  } catch (error) {
    console.error('Error creating geofence:', error);
    throw error;
  }
}

// Get all geofences
async function getGeofences() {
  const params = {
    CollectionName: process.env.GEOFENCE_COLLECTION_NAME!,
  };
  
  try {
    const response = await location.listGeofences(params).promise();
    
    return response.Entries?.map(entry => {
      const circle = entry.Geometry?.Circle;
      
      return {
        geofenceId: entry.GeofenceId,
        geofenceName: entry.GeofenceProperties?.Name || entry.GeofenceId,
        latitude: circle?.Center?.[1] || 0,
        longitude: circle?.Center?.[0] || 0,
        radius: circle?.Radius || 0,
        notificationMessage: entry.GeofenceProperties?.NotificationMessage,
        createdAt: entry.CreateTime,
      };
    }) || [];
  } catch (error) {
    console.error('Error getting geofences:', error);
    throw error;
  }
}

// Get a specific geofence
async function getGeofence(geofenceId: string) {
  const params = {
    CollectionName: process.env.GEOFENCE_COLLECTION_NAME!,
    GeofenceId: geofenceId,
  };
  
  try {
    const response = await location.getGeofence(params).promise();
    const circle = response.Geometry?.Circle;
    
    return {
      geofenceId: response.GeofenceId,
      geofenceName: response.GeofenceProperties?.Name || response.GeofenceId,
      latitude: circle?.Center?.[1] || 0,
      longitude: circle?.Center?.[0] || 0,
      radius: circle?.Radius || 0,
      notificationMessage: response.GeofenceProperties?.NotificationMessage,
      createdAt: response.CreateTime,
    };
  } catch (error) {
    console.error('Error getting geofence:', error);
    throw error;
  }
}

// Delete a geofence
async function deleteGeofence(geofenceId: string) {
  const params = {
    CollectionName: process.env.GEOFENCE_COLLECTION_NAME!,
    GeofenceId: geofenceId,
  };
  
  try {
    await location.deleteGeofence(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting geofence:', error);
    throw error;
  }
}