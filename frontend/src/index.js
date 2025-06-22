import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { BrowserRouter } from 'react-router-dom';

// Configure Amplify
Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_APPSYNC_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  },
  API: {
    graphql_endpoint: process.env.REACT_APP_APPSYNC_URL,
    graphql_headers: async () => ({
      Authorization: (await Amplify.Auth.currentSession()).getIdToken().getJwtToken(),
    }),
  },
  geo: {
    AmazonLocationService: {
      maps: {
        items: {
          'main-map': {
            style: 'VectorEsriStreets',
          },
        },
        default: 'main-map',
      },
      region: process.env.REACT_APP_APPSYNC_REGION,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);