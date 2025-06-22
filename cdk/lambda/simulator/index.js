const AWS = require('aws-sdk');
const https = require('https');
const url = require('url');

// Get the IoT endpoint from environment variables
const IOT_ENDPOINT = process.env.IOT_ENDPOINT;

// Define device types and their movement patterns
const DEVICE_TYPES = {
  CAR: {
    speed: { min: 20, max: 60 }, // km/h
    updateInterval: 5, // seconds
  },
  BICYCLE: {
    speed: { min: 5, max: 20 }, // km/h
    updateInterval: 10, // seconds
  },
  PEDESTRIAN: {
    speed: { min: 2, max: 6 }, // km/h
    updateInterval: 15, // seconds
  },
};

// Define simulated devices
const DEVICES = [
  { id: 'car-001', name: 'Car 1', type: 'CAR' },
  { id: 'car-002', name: 'Car 2', type: 'CAR' },
  { id: 'bicycle-001', name: 'Bicycle 1', type: 'BICYCLE' },
  { id: 'pedestrian-001', name: 'Pedestrian 1', type: 'PEDESTRIAN' },
];

// Define starting locations (Tokyo area)
const STARTING_LOCATIONS = [
  { latitude: 35.6812, longitude: 139.7671 }, // Tokyo Station
  { latitude: 35.6586, longitude: 139.7454 }, // Roppongi
  { latitude: 35.6598, longitude: 139.7003 }, // Shibuya
  { latitude: 35.7101, longitude: 139.8107 }, // Akihabara
];

// Helper function to calculate new position based on current position, heading, and speed
function calculateNewPosition(latitude, longitude, heading, speed, timeElapsedSeconds) {
  // Convert speed from km/h to meters per second
  const speedMps = speed * (1000 / 3600);
  
  // Calculate distance traveled in meters
  const distanceMeters = speedMps * timeElapsedSeconds;
  
  // Convert heading from degrees to radians
  const headingRadians = (heading * Math.PI) / 180;
  
  // Earth's radius in meters
  const earthRadius = 6371000;
  
  // Convert latitude and longitude to radians
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;
  
  // Calculate new latitude
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceMeters / earthRadius) +
    Math.cos(latRad) * Math.sin(distanceMeters / earthRadius) * Math.cos(headingRadians)
  );
  
  // Calculate new longitude
  const newLonRad = lonRad + Math.atan2(
    Math.sin(headingRadians) * Math.sin(distanceMeters / earthRadius) * Math.cos(latRad),
    Math.cos(distanceMeters / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  // Convert back to degrees
  const newLatitude = (newLatRad * 180) / Math.PI;
  const newLongitude = (newLonRad * 180) / Math.PI;
  
  return { latitude: newLatitude, longitude: newLongitude };
}

// Helper function to get a random number between min and max
function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

// Helper function to get a random heading (0-359 degrees)
function getRandomHeading() {
  return Math.floor(Math.random() * 360);
}

// Helper function to publish a message to IoT Core
async function publishToIoT(topic, message) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(IOT_ENDPOINT);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: `/topics/${topic}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(message)),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify(message));
    req.end();
  });
}

// Main simulation function
exports.handler = async (event) => {
  console.log('Starting device simulation');
  
  try {
    // Initialize device states
    const deviceStates = DEVICES.map((device, index) => {
      const startingLocation = STARTING_LOCATIONS[index % STARTING_LOCATIONS.length];
      const deviceType = DEVICE_TYPES[device.type];
      
      return {
        ...device,
        latitude: startingLocation.latitude,
        longitude: startingLocation.longitude,
        heading: getRandomHeading(),
        speed: getRandomNumber(deviceType.speed.min, deviceType.speed.max),
        updateInterval: deviceType.updateInterval,
        lastUpdate: Date.now(),
      };
    });
    
    // Run simulation for 15 minutes (or until Lambda times out)
    const endTime = Date.now() + 15 * 60 * 1000;
    
    while (Date.now() < endTime) {
      for (const device of deviceStates) {
        const currentTime = Date.now();
        const timeElapsed = (currentTime - device.lastUpdate) / 1000;
        
        if (timeElapsed >= device.updateInterval) {
          // Update device position
          const newPosition = calculateNewPosition(
            device.latitude,
            device.longitude,
            device.heading,
            device.speed,
            timeElapsed
          );
          
          device.latitude = newPosition.latitude;
          device.longitude = newPosition.longitude;
          
          // Occasionally change heading and speed
          if (Math.random() < 0.2) {
            device.heading = (device.heading + getRandomNumber(-30, 30)) % 360;
            if (device.heading < 0) device.heading += 360;
            
            const deviceType = DEVICE_TYPES[device.type];
            device.speed = getRandomNumber(deviceType.speed.min, deviceType.speed.max);
          }
          
          // Prepare message
          const message = {
            deviceId: device.id,
            name: device.name,
            type: device.type,
            latitude: device.latitude,
            longitude: device.longitude,
            heading: device.heading,
            speed: device.speed,
            accuracy: 5.0, // Simulated accuracy in meters
            timestamp: new Date().toISOString(),
          };
          
          // Publish to IoT Core
          const topic = `devices/${device.id}/location`;
          await publishToIoT(topic, message);
          console.log(`Published location update for ${device.id}:`, message);
          
          // Update last update time
          device.lastUpdate = currentTime;
        }
      }
      
      // Sleep for a short time to avoid consuming too much CPU
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      statusCode: 200,
      body: 'Simulation completed successfully',
    };
  } catch (error) {
    console.error('Error in simulation:', error);
    return {
      statusCode: 500,
      body: `Simulation failed: ${error.message}`,
    };
  }
};