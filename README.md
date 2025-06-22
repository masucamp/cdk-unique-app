# GeoTimeTracker

A unique AWS CDK project that combines several uncommon AWS services to create a real-time location tracking application with historical data visualization.

## Selected AWS Services

This project utilizes the following uncommon AWS services:

1. **AWS Location Service** - A relatively new service that provides maps, points of interest, geocoding, and tracking capabilities without relying on third-party providers like Google Maps.
   - *Why it's unique*: Less commonly used than mainstream mapping solutions, provides cost-effective location capabilities with built-in AWS integration.

2. **AWS Timestream** - A serverless time series database service for IoT and operational applications.
   - *Why it's unique*: Specialized for time-series data with automatic data lifecycle management, unlike traditional databases.

3. **AWS AppSync** - A managed GraphQL service with real-time data synchronization.
   - *Why it's unique*: Provides real-time capabilities through GraphQL subscriptions, less commonly used than REST APIs.

4. **AWS IoT Core** (for simulation) - To simulate IoT devices sending location data.
   - *Why it's unique*: While IoT Core itself is known, using it for location tracking simulation creates an interesting use case.

## Use Case

GeoTimeTracker is a real-time location tracking application that:
- Displays simulated IoT devices moving on a map
- Stores location history with timestamps in AWS Timestream
- Provides real-time updates through GraphQL subscriptions
- Allows historical playback of device movements
- Visualizes movement patterns and heatmaps

## Architecture

```
┌─────────────┐     ┌───────────┐     ┌───────────────┐
│ IoT Devices │────▶│ IoT Core  │────▶│ Lambda        │
│ (Simulated) │     │           │     │ (Processor)   │
└─────────────┘     └───────────┘     └───────┬───────┘
                                              │
                                              ▼
┌─────────────┐     ┌───────────┐     ┌───────────────┐
│ React App   │◀───▶│ AppSync   │◀───▶│ Timestream    │
│ (Amplify)   │     │ (GraphQL) │     │ (Time Series) │
└─────────────┘     └───────────┘     └───────────────┘
       │                                      
       ▼                                      
┌─────────────┐                               
│ Location    │                               
│ Service     │                               
└─────────────┘                               
```

## Features

- Real-time device tracking on interactive maps
- Historical data storage and retrieval
- Time-based playback of device movements
- Heatmap visualization of common routes
- GraphQL API for flexible data querying

## Implementation

The project is implemented using:
- AWS CDK for infrastructure as code
- React for the frontend application
- GraphQL for API interactions
- AWS Amplify for hosting and authentication

## Project Structure

```
.
├── README.md                 # Project documentation
├── cdk/                      # CDK infrastructure code
│   ├── bin/                  # CDK app entry point
│   ├── lib/                  # CDK stack definition
│   ├── lambda/               # Lambda function code
│   │   ├── data-processor/   # Data processing Lambda
│   │   └── simulator/        # Device simulator Lambda
│   └── test/                 # CDK tests
├── frontend/                 # React frontend application
│   ├── public/               # Static assets
│   └── src/                  # React source code
│       ├── components/       # React components
│       └── graphql/          # GraphQL queries and subscriptions
└── deploy.sh                 # Deployment script
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 14.x or later
- AWS CDK installed globally (`npm install -g aws-cdk`)

## Deployment Instructions

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/geo-time-tracker.git
   cd geo-time-tracker
   ```

2. Make the deployment script executable:
   ```
   chmod +x deploy.sh
   ```

3. Run the deployment script:
   ```
   ./deploy.sh
   ```

4. After deployment, you can access the application through the Amplify URL provided in the CDK outputs.

5. To run the device simulator, use the AWS Lambda console to invoke the `SimulatorFunction`.

## Cost Considerations

This project uses several AWS services that may incur costs:

- AWS Location Service: Uses request-based pricing, with a free tier of 250,000 requests per month
- AWS Timestream: Charges based on data ingestion, storage, and queries
- AWS AppSync: Charges based on API requests and real-time subscriptions
- AWS Lambda: Free tier includes 1M requests per month
- AWS Amplify: Free tier includes 1,000 build minutes per month

The application is designed to minimize costs by:
- Using request-based pricing for Location Service
- Setting short retention periods for Timestream data
- Optimizing GraphQL queries to reduce data transfer

## Evaluation

### Benefits of Using These Services

1. **AWS Location Service**:
   - Provides cost-effective mapping capabilities
   - Seamless integration with other AWS services
   - Privacy-focused compared to third-party mapping providers

2. **AWS Timestream**:
   - Optimized for time-series data with automatic data lifecycle management
   - High write throughput for IoT device data
   - Efficient querying of time-series data

3. **AWS AppSync**:
   - Real-time data synchronization with GraphQL subscriptions
   - Simplified client-side data fetching with GraphQL
   - Built-in authentication and authorization

### Challenges and Limitations

1. **AWS Location Service**:
   - Limited customization options compared to specialized mapping providers
   - Fewer points of interest and geocoding accuracy in some regions

2. **AWS Timestream**:
   - Higher cost for long-term data storage compared to standard databases
   - Limited query language features compared to SQL

3. **AWS AppSync**:
   - Learning curve for GraphQL if team is familiar with REST
   - Subscription connection management can be complex

### Future Improvements

1. Add geofencing capabilities using AWS Location Service
2. Implement anomaly detection for device movements
3. Add route optimization using AWS Location Service routing
4. Enhance the UI with more visualization options
5. Add user management and device ownership features

## License

This project is licensed under the MIT License - see the LICENSE file for details.