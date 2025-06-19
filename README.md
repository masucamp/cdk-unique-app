# AWS珍サービス活用アプリケーション

This project demonstrates the use of uncommon AWS services to build a time series data collection and analysis system.

## Architecture

This application combines the following uncommon AWS services:

1. **AWS AppSync** - A fully managed service that makes it easy to develop GraphQL APIs
2. **Amazon Timestream** - A fast, scalable, fully managed time series database service
3. **AWS X-Ray** - For distributed tracing and analysis of applications

## Use Case: Time Series Data Collection System

The application provides a time series data collection system that:
- Uses AppSync to provide a GraphQL API for data ingestion and querying
- Stores time series data in Amazon Timestream for efficient storage and querying
- Uses X-Ray for tracing and monitoring of the entire system

## Architecture Diagram

```
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐
│   Client    │────▶│  AWS AppSync  │────▶│ Lambda Function │
└─────────────┘     └───────────────┘     └─────────────────┘
                           │                      │
                           ▼                      ▼
                    ┌─────────────┐      ┌────────────────┐
                    │   AWS X-Ray │      │    Amazon      │
                    │             │◀─────│   Timestream   │
                    └─────────────┘      └────────────────┘
```

## Why These Services?

### AWS AppSync
AppSync is a powerful but less commonly used service that provides a GraphQL interface, real-time data synchronization, and offline programming capabilities. It's a great alternative to building REST APIs with API Gateway and Lambda.

### Amazon Timestream
Timestream is a specialized time series database that's optimized for storing and analyzing time-stamped data. Unlike general-purpose databases, it's designed specifically for IoT applications, monitoring, and analytics use cases.

### AWS X-Ray
X-Ray provides distributed tracing capabilities that help developers analyze and debug applications, especially in microservices architectures. It's a powerful tool that's often overlooked in favor of simpler logging solutions.

## Benefits

- **Serverless GraphQL API**: AppSync provides a fully managed GraphQL endpoint without server management
- **Optimized Time Series Storage**: Timestream offers cost-effective storage with automatic data tiering
- **Advanced Query Capabilities**: Timestream provides time series-specific query functions
- **Comprehensive Monitoring**: X-Ray offers insights into application performance and bottlenecks

## Deployment

This project is deployed using AWS CDK. To deploy:

```
npm install
cdk deploy
```

## Testing

After deployment, you can test the application by sending GraphQL queries to the AppSync endpoint:

```graphql
# Add a measurement
mutation AddMeasurement {
  addMeasurement(input: {
    sensorId: "sensor-001"
    value: 25.5
  }) {
    id
    sensorId
    value
    timestamp
  }
}

# Query measurements
query GetMeasurements {
  getMeasurements(sensorId: "sensor-001") {
    id
    sensorId
    value
    timestamp
  }
}
```