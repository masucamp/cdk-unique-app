import React, { useState, useEffect, useRef } from 'react';
import { Auth, API, graphqlOperation } from 'aws-amplify';
import { MapView, LocationSearch } from '@aws-amplify/ui-react';
import { Marker, Popup } from 'react-map-gl';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { onLocationUpdate } from '../graphql/subscriptions';
import { getDeviceLocations, getDeviceHistory } from '../graphql/queries';

function Dashboard({ setIsAuthenticated }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [viewState, setViewState] = useState({
    longitude: 139.7671,
    latitude: 35.6812,
    zoom: 13
  });
  const [popupInfo, setPopupInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date()
  });
  
  const subscriptionRef = useRef(null);
  
  // Load initial device locations
  useEffect(() => {
    fetchDeviceLocations();
    
    // Subscribe to real-time updates
    subscribeToLocationUpdates();
    
    return () => {
      // Clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);
  
  // Fetch device history when selected device changes
  useEffect(() => {
    if (selectedDevice) {
      fetchDeviceHistory(selectedDevice.device.deviceId, timeRange.start, timeRange.end);
    }
  }, [selectedDevice, timeRange]);
  
  // Handle playback
  useEffect(() => {
    let interval;
    
    if (isPlaying && deviceHistory.length > 0) {
      interval = setInterval(() => {
        setCurrentTimeIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= deviceHistory.length) {
            setIsPlaying(false);
            return prevIndex;
          }
          return nextIndex;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, deviceHistory]);
  
  const fetchDeviceLocations = async () => {
    try {
      const response = await API.graphql(graphqlOperation(getDeviceLocations, { limit: 10 }));
      setDevices(response.data.getDeviceLocations);
    } catch (error) {
      console.error('Error fetching device locations:', error);
    }
  };
  
  const fetchDeviceHistory = async (deviceId, startTime, endTime) => {
    try {
      const response = await API.graphql(graphqlOperation(getDeviceHistory, {
        deviceId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }));
      
      setDeviceHistory(response.data.getDeviceHistory.locations);
      setCurrentTimeIndex(0);
    } catch (error) {
      console.error('Error fetching device history:', error);
    }
  };
  
  const subscribeToLocationUpdates = () => {
    subscriptionRef.current = API.graphql(graphqlOperation(onLocationUpdate))
      .subscribe({
        next: ({ value }) => {
          const newLocation = value.data.onLocationUpdate;
          
          setDevices(prevDevices => {
            // Check if this device already exists in our list
            const deviceIndex = prevDevices.findIndex(
              d => d.device.deviceId === newLocation.device.deviceId
            );
            
            if (deviceIndex >= 0) {
              // Update existing device
              const updatedDevices = [...prevDevices];
              updatedDevices[deviceIndex] = newLocation;
              return updatedDevices;
            } else {
              // Add new device
              return [...prevDevices, newLocation];
            }
          });
          
          // If this update is for the selected device, add it to history
          if (selectedDevice && selectedDevice.device.deviceId === newLocation.device.deviceId) {
            setDeviceHistory(prevHistory => [...prevHistory, newLocation.location]);
          }
        },
        error: error => console.error('Subscription error:', error)
      });
  };
  
  const handleSignOut = async () => {
    try {
      await Auth.signOut();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setViewState({
      ...viewState,
      longitude: device.location.longitude,
      latitude: device.location.latitude
    });
  };
  
  const handleMarkerClick = (device) => {
    setPopupInfo(device);
  };
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleTimeRangeChange = (hours) => {
    setTimeRange({
      start: new Date(Date.now() - hours * 3600000),
      end: new Date()
    });
  };
  
  const formatChartData = () => {
    return deviceHistory.map((location, index) => ({
      time: new Date(location.timestamp).toLocaleTimeString(),
      speed: location.speed || 0,
      index
    }));
  };
  
  return (
    <div className="app-container">
      <header className="header">
        <h1>GeoTimeTracker</h1>
        <button onClick={handleSignOut}>Sign Out</button>
      </header>
      
      <div className="main-content">
        <div className="sidebar">
          <h2>Devices</h2>
          <ul className="device-list">
            {devices.map(device => (
              <li
                key={device.device.deviceId}
                className={`device-item ${selectedDevice && selectedDevice.device.deviceId === device.device.deviceId ? 'active' : ''}`}
                onClick={() => handleDeviceClick(device)}
              >
                <div>{device.device.name}</div>
                <div>Type: {device.device.type}</div>
                <div>Speed: {device.location.speed ? `${device.location.speed.toFixed(1)} km/h` : 'N/A'}</div>
              </li>
            ))}
          </ul>
          
          {selectedDevice && (
            <div className="controls">
              <h3>History Controls</h3>
              <div>
                <button onClick={() => handleTimeRangeChange(1)}>Last Hour</button>
                <button onClick={() => handleTimeRangeChange(6)}>Last 6 Hours</button>
                <button onClick={() => handleTimeRangeChange(24)}>Last 24 Hours</button>
              </div>
              
              {deviceHistory.length > 0 && (
                <>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={formatChartData()}>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="speed" stroke="#2196f3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="time-controls">
                    <button onClick={handlePlayPause}>
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={deviceHistory.length - 1}
                      value={currentTimeIndex}
                      onChange={(e) => setCurrentTimeIndex(parseInt(e.target.value))}
                      className="time-slider"
                    />
                    <span>
                      {deviceHistory[currentTimeIndex] && 
                        new Date(deviceHistory[currentTimeIndex].timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="map-container">
          <MapView
            initialViewState={viewState}
            onMove={evt => setViewState(evt.viewState)}
          >
            {devices.map(device => (
              <Marker
                key={device.device.deviceId}
                longitude={device.location.longitude}
                latitude={device.location.latitude}
                onClick={() => handleMarkerClick(device)}
              >
                <div className={`device-marker ${device.device.type.toLowerCase()}`} />
              </Marker>
            ))}
            
            {selectedDevice && deviceHistory.length > 0 && (
              <Marker
                longitude={deviceHistory[currentTimeIndex].longitude}
                latitude={deviceHistory[currentTimeIndex].latitude}
              >
                <div className={`device-marker ${selectedDevice.device.type.toLowerCase()}`} />
              </Marker>
            )}
            
            {popupInfo && (
              <Popup
                longitude={popupInfo.location.longitude}
                latitude={popupInfo.location.latitude}
                anchor="bottom"
                onClose={() => setPopupInfo(null)}
              >
                <div className="popup">
                  <h3>{popupInfo.device.name}</h3>
                  <p>Type: {popupInfo.device.type}</p>
                  <p>Speed: {popupInfo.location.speed ? `${popupInfo.location.speed.toFixed(1)} km/h` : 'N/A'}</p>
                  <p>Heading: {popupInfo.location.heading ? `${popupInfo.location.heading.toFixed(0)}°` : 'N/A'}</p>
                  <p>Last Update: {new Date(popupInfo.location.timestamp).toLocaleTimeString()}</p>
                </div>
              </Popup>
            )}
          </MapView>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;