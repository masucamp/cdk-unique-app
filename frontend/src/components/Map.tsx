import React, { useState, useEffect, useRef } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { MapView, LocationSearch } from '@aws-amplify/ui-react';
import VoiceGuide from './VoiceGuide';
import { recordInteraction } from '../graphql/mutations';
import { searchPlaces, getPlace } from '../graphql/queries';

interface MapProps {
  userId: string;
}

interface Place {
  placeId: string;
  label: string;
  address?: string;
  position: [number, number];
  country?: string;
  region?: string;
  municipality?: string;
}

const Map: React.FC<MapProps> = ({ userId }) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-122.4194, 37.7749]); // Default: San Francisco
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<any>(null);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Search for places
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    
    setIsSearching(true);
    try {
      const result: any = await API.graphql(
        graphqlOperation(searchPlaces, { searchText: searchText })
      );
      
      const places = result.data.searchPlaces || [];
      setSearchResults(places);
      
      // Record the search interaction
      await API.graphql(
        graphqlOperation(recordInteraction, {
          input: {
            userId,
            interactionType: 'SEARCH',
            details: { searchText }
          }
        })
      );
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle place selection
  const handlePlaceSelect = async (place: Place) => {
    setSelectedPlace(place);
    setMapCenter(place.position);
    
    try {
      // Get detailed place information
      const result: any = await API.graphql(
        graphqlOperation(getPlace, { placeId: place.placeId })
      );
      
      const detailedPlace = result.data.getPlace;
      if (detailedPlace) {
        setSelectedPlace(detailedPlace);
      }
      
      // Record the place selection interaction
      await API.graphql(
        graphqlOperation(recordInteraction, {
          input: {
            userId,
            interactionType: 'PLACE_SELECTED',
            locationId: place.placeId,
            details: { placeName: place.label }
          }
        })
      );
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="map-container">
      <MapView
        ref={mapRef}
        initialViewState={{
          longitude: mapCenter[0],
          latitude: mapCenter[1],
          zoom: 12
        }}
        style={{ width: '100%', height: '100%' }}
      />
      
      <div className="search-container">
        <div className="search-input-container">
          <input
            type="text"
            value={searchText}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
            placeholder="Search for a place..."
            className="search-input"
          />
          <button 
            onClick={handleSearch} 
            disabled={isSearching || !searchText.trim()}
            className="search-button"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((place) => (
              <div
                key={place.placeId}
                className="search-result-item"
                onClick={() => handlePlaceSelect(place)}
              >
                <div className="place-name">{place.label}</div>
                {place.address && <div className="place-address">{place.address}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="sidebar">
        {selectedPlace ? (
          <div className="place-details">
            <h2>{selectedPlace.label}</h2>
            {selectedPlace.address && <p>{selectedPlace.address}</p>}
            {selectedPlace.municipality && (
              <p>
                {selectedPlace.municipality}, {selectedPlace.region}, {selectedPlace.country}
              </p>
            )}
            
            <VoiceGuide 
              place={selectedPlace} 
              userId={userId} 
            />
          </div>
        ) : (
          <div className="no-selection">
            <h2>Welcome to VoiceGuide</h2>
            <p>Search for a location to get started.</p>
            <p>Select a place to hear information about it and track your travel interests.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;