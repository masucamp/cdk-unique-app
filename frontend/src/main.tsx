import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Amplify } from 'aws-amplify'
import App from './App.tsx'
import './index.css'

// Configure Amplify
Amplify.configure({
  Auth: {
    region: import.meta.env.VITE_REGION || 'us-east-1',
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
  },
  API: {
    graphql_endpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT,
    graphql_headers: async () => ({
      Authorization: `Bearer ${(await Amplify.Auth.currentSession()).getIdToken().getJwtToken()}`,
    }),
  },
  geo: {
    AmazonLocationService: {
      maps: {
        items: {
          'voice-track-map': {
            style: 'VectorEsriStreets',
          },
        },
        default: 'voice-track-map',
      },
      region: import.meta.env.VITE_REGION || 'us-east-1',
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)