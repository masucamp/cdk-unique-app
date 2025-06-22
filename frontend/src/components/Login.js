import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';

function Login({ setIsAuthenticated }) {
  const [error, setError] = useState('');

  const handleSignIn = async (formData) => {
    try {
      await Auth.signIn(formData.username, formData.password);
      setIsAuthenticated(true);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>GeoTimeTracker</h1>
        <p>Track and visualize location data in real-time</p>
        
        <Authenticator>
          {({ signOut, user }) => {
            setIsAuthenticated(true);
            return (
              <div>
                <h2>Welcome, {user.username}</h2>
                <button onClick={signOut}>Sign out</button>
              </div>
            );
          }}
        </Authenticator>
        
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default Login;