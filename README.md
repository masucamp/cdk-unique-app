# VoiceGuide - Interactive Voice-Guided Travel Companion

## Overview

VoiceGuide is an interactive travel companion application that combines several uncommon AWS services to create a unique user experience. The application allows users to explore maps, search for points of interest, receive voice-guided information about locations, and track their travel history over time.

## Selected AWS Services

This application leverages the following uncommon AWS services:

### 1. AWS Location Service

**What it is:** A service that provides maps, points of interest, geocoding, and routing capabilities.

**Why it's uncommon:** AWS Location Service is a relatively new addition to the AWS ecosystem (launched in December 2020) and is not as widely adopted as core AWS services. It provides specialized location-based functionality that many developers aren't familiar with.

**How we use it:** VoiceGuide uses AWS Location Service to display interactive maps, search for points of interest, and provide location information to users.

### 2. AWS Polly

**What it is:** A service that turns text into lifelike speech using advanced deep learning technologies.

**Why it's uncommon:** While text-to-speech is a well-known technology, AWS Polly is a specialized service that isn't part of the core infrastructure components most developers use regularly. It represents a niche use case for voice synthesis.

**How we use it:** VoiceGuide converts information about selected locations into natural-sounding speech, providing users with an audio guide to their chosen destinations.

### 3. AWS Timestream

**What it is:** A fast, scalable, fully managed time series database service for IoT and operational applications.

**Why it's uncommon:** AWS Timestream is a specialized database designed specifically for time-series data, which makes it less commonly used than general-purpose databases like DynamoDB or RDS. Many developers aren't familiar with its unique capabilities for time-based analytics.

**How we use it:** VoiceGuide stores user interaction data, including location searches, selections, and travel patterns, allowing users to view their historical travel data and analytics.

## Application Use Case

VoiceGuide serves as a travel companion that enhances the exploration experience:

1. Users can view an interactive map and search for locations or points of interest
2. When a user selects a location, the app fetches information about it and converts it to speech using AWS Polly
3. The app tracks user interactions, searches, and visited locations in AWS Timestream
4. Users can view analytics about their travel patterns and history over time

This combination creates a unique application that would be difficult to achieve with more common AWS services, demonstrating the power of specialized AWS offerings.

## Architecture

The application architecture combines frontend and backend components:

- **Frontend:** React application hosted on AWS Amplify
- **Backend:** AWS AppSync GraphQL API to coordinate between services
- **Authentication:** Amazon Cognito for user authentication
- **Maps and Location:** AWS Location Service
- **Voice Synthesis:** AWS Polly
- **Time-Series Data:** AWS Timestream

### Architecture Diagram

![VoiceGuide Architecture](./docs/architecture.drawio.svg)

## Setup and Deployment

### Prerequisites

- Node.js 14.x or later
- AWS CLI configured with appropriate permissions
- AWS CDK v2 installed globally

### Deployment Steps

1. Clone this repository
2. Install dependencies:
   ```
   cd cdk
   npm install
   cd ../frontend
   npm install
   ```
3. Deploy the CDK stacks:
   ```
   cd ../cdk
   cdk deploy --all
   ```
4. After deployment, the console will output the URL of your deployed application

## Development

### CDK Infrastructure

The CDK code is organized into separate stacks for each AWS service:

- `amplify-stack.ts`: Configures AWS Amplify hosting for the React application
- `appsync-stack.ts`: Sets up the GraphQL API with AWS AppSync
- `auth-stack.ts`: Implements Amazon Cognito for authentication
- `location-stack.ts`: Configures AWS Location Service resources
- `polly-stack.ts`: Sets up AWS Polly for text-to-speech
- `timestream-stack.ts`: Creates AWS Timestream database and tables
- `main-stack.ts`: Combines all stacks into a complete application

### React Application

The React application is structured with components for:

- Map display and interaction
- Voice guidance using AWS Polly
- Travel history visualization

## Evaluation

### Benefits of Using These Uncommon Services

- **Specialized Functionality:** Each service provides best-in-class capabilities for its specific domain
- **Managed Services:** Reduces operational overhead compared to self-managed alternatives
- **Seamless Integration:** AWS services work together through well-defined APIs and IAM permissions
- **Scalability:** All services can scale to handle growing user bases and data volumes

### Challenges and Considerations

- **Learning Curve:** Less common services have fewer examples and community resources
- **Documentation:** Some services have less comprehensive documentation than core AWS services
- **Cost Management:** Understanding the pricing models for specialized services requires careful analysis
- **Service Maturity:** Newer services may have fewer features or regional availability than established ones

## Future Enhancements

- Add route planning and navigation capabilities
- Implement offline mode for maps and basic functionality
- Enhance voice guidance with multiple languages and voices
- Expand analytics capabilities for travel patterns
- Add social features to share travel experiences