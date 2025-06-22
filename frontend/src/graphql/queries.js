export const getDeviceLocations = `
  query GetDeviceLocations($limit: Int) {
    getDeviceLocations(limit: $limit) {
      device {
        deviceId
        name
        type
      }
      location {
        latitude
        longitude
        timestamp
        accuracy
        speed
        heading
      }
    }
  }
`;

export const getDeviceHistory = `
  query GetDeviceHistory($deviceId: ID!, $startTime: AWSDateTime!, $endTime: AWSDateTime!) {
    getDeviceHistory(deviceId: $deviceId, startTime: $startTime, endTime: $endTime) {
      deviceId
      locations {
        latitude
        longitude
        timestamp
        accuracy
        speed
        heading
      }
      startTime
      endTime
    }
  }
`;