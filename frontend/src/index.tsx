import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { AmplifyProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Configure Amplify
Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
  },
  API: {
    graphql_endpoint: process.env.REACT_APP_GRAPHQL_API_URL,
    graphql_headers: async () => ({
      Authorization: (await Amplify.Auth.currentSession()).getIdToken().getJwtToken(),
    }),
  },
  geo: {
    AmazonLocationService: {
      maps: {
        items: {
          'VoiceGuideMap': {
            style: 'VectorEsriNavigation',
          },
        },
        default: 'VoiceGuideMap',
      },
      search_indices: {
        items: ['VoiceGuidePlaceIndex'],
        default: 'VoiceGuidePlaceIndex',
      },
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AmplifyProvider>
      <App />
    </AmplifyProvider>
  </React.StrictMode>
);