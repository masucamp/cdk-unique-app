export const onLocationUpdate = `
  subscription OnLocationUpdate($deviceId: ID) {
    onLocationUpdate(deviceId: $deviceId) {
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