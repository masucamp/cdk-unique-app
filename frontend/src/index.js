import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Configure Amplify
// Note: In a real application, you would get these values from your deployed CDK stack
Amplify.configure({
  aws_appsync_graphqlEndpoint: process.env.REACT_APP_APPSYNC_ENDPOINT || 'https://example.appsync-api.region.amazonaws.com/graphql',
  aws_appsync_region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  aws_appsync_authenticationType: 'API_KEY',
  aws_appsync_apiKey: process.env.REACT_APP_APPSYNC_API_KEY || 'your-api-key',
});

// Configure Apollo Client
const httpLink = createHttpLink({
  uri: process.env.REACT_APP_APPSYNC_ENDPOINT || 'https://example.appsync-api.region.amazonaws.com/graphql',
  headers: {
    'x-api-key': process.env.REACT_APP_APPSYNC_API_KEY || 'your-api-key',
  },
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);