import React, { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Map from './components/Map';
import TravelHistory from './components/TravelHistory';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState<'map' | 'history'>('map');

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app-container">
          <header className="header">
            <h1>VoiceGuide</h1>
            <div className="nav-links">
              <button 
                className={`nav-button ${activePage === 'map' ? 'active' : ''}`}
                onClick={() => setActivePage('map')}
              >
                Map
              </button>
              <button 
                className={`nav-button ${activePage === 'history' ? 'active' : ''}`}
                onClick={() => setActivePage('history')}
              >
                Travel History
              </button>
              <button onClick={signOut} className="sign-out-button">Sign Out</button>
            </div>
          </header>

          <main className="main-content">
            {activePage === 'map' ? (
              <Map userId={user?.username || ''} />
            ) : (
              <TravelHistory userId={user?.username || ''} />
            )}
          </main>
        </div>
      )}
    </Authenticator>
  );
}

export default App;