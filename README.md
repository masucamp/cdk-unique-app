# VoiceTrail - Voice-Guided Interactive Hiking Trail Explorer

## Overview

VoiceTrail is a unique hiking application that combines several specialized AWS services to provide an interactive, voice-guided hiking experience. The application allows users to explore hiking trails on a map, receive voice-guided navigation instructions, and track their hiking statistics over time.

## Architecture

```
+------------------+     +------------------+
|                  |     |                  |
|  React Frontend  |<--->|  AWS Amplify     |
|                  |     |  Hosting         |
+--------+---------+     +------------------+
         |
         v
+------------------+     +------------------+
|                  |     |                  |
|  AWS Cognito     |<--->|  User            |
|  Authentication  |     |  Management      |
+--------+---------+     +------------------+
         |
         v
+------------------+
|                  |
|  AWS AppSync     |
|  GraphQL API     |
|                  |
+--------+---------+
         |
         v
+--------+---------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  AWS Location    |     |  AWS Polly       |     |  AWS Timestream  |
|  Service         |     |  Text-to-Speech  |     |  Time Series DB  |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+

VoiceTrail Architecture - Using AWS Location Service, AWS Polly, AWS Timestream, and AWS AppSync
```

## AWS Services Used

This project demonstrates the use of several uncommon ("maniac") AWS services:

### 1. AWS Location Service

**What it is:** A service that provides maps, points of interest, geocoding, and routing capabilities.

**Why it's "maniac":** Many developers aren't aware that AWS offers location services and typically use Google Maps or Mapbox instead. AWS Location Service provides a cost-effective alternative with the security and compliance benefits of the AWS ecosystem.

**How we use it:** VoiceTrail uses AWS Location Service to display maps, hiking trails, and provide routing information for hikers.

### 2. AWS Polly

**What it is:** A text-to-speech service that converts text into lifelike speech.

**Why it's "maniac":** While text-to-speech technology exists in many places, integrating it directly into a web application for real-time guidance is uncommon. Most hiking apps rely on visual cues rather than voice guidance.

**How we use it:** VoiceTrail converts navigation instructions into natural-sounding voice guidance, allowing hikers to receive directions without looking at their screens.

### 3. AWS Timestream

**What it is:** A serverless time series database service for IoT and operational applications.

**Why it's "maniac":** Time series databases are specialized and not commonly used in typical web applications. Most developers would default to standard relational or NoSQL databases even for time-series data.

**How we use it:** VoiceTrail stores time-series hiking data (location, speed, elevation, timestamps) to provide insights and statistics about users' hiking activities.

### 4. AWS AppSync

**What it is:** A managed GraphQL service that simplifies application development.

**Why it's "maniac":** While gaining popularity, GraphQL is still considered an alternative to REST APIs, and AWS AppSync specifically is less commonly used than other API solutions.

**How we use it:** VoiceTrail uses AppSync to provide a flexible GraphQL API for querying trail information and user statistics.

## Features

- Interactive map display of hiking trails
- Voice-guided navigation along trails
- Real-time tracking of hiking statistics
- Historical view of past hikes and performance
- User authentication and personalized experiences

## Getting Started

### Prerequisites

- AWS Account
- Node.js (v14 or later)
- AWS CDK (v2)
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/voice-trail.git
   cd voice-trail
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Bootstrap your AWS environment (if not already done):
   ```
   cdk bootstrap
   ```

4. Deploy the application:
   ```
   cdk deploy --all
   ```

### Local Development

1. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

2. Start the local development server:
   ```
   npm start
   ```

## Evaluation of Maniac Services

### Benefits

- **AWS Location Service:** Provides cost-effective maps and routing with AWS security and compliance
- **AWS Polly:** Enables hands-free navigation with natural-sounding voices
- **AWS Timestream:** Efficiently stores and queries time-series data with automatic scaling
- **AWS AppSync:** Simplifies API development with GraphQL and real-time capabilities

### Challenges

- **AWS Location Service:** Limited customization compared to Google Maps
- **AWS Polly:** Requires careful handling of text input for natural pronunciation
- **AWS Timestream:** Learning curve for time-series data modeling
- **AWS AppSync:** GraphQL schema design requires careful planning

### Cost Considerations

Most services used in this project have generous free tiers:
- AWS Location Service: 250,000 free requests per month
- AWS Polly: 5 million characters per month free
- AWS Timestream: 30 GB of storage and 30 million write requests free
- AWS AppSync: 250,000 free queries per month

## Future Enhancements

- Offline mode for areas with poor connectivity
- Social features to share hikes with friends
- Integration with fitness trackers
- Machine learning to recommend trails based on user preferences

## License

This project is licensed under the MIT License - see the LICENSE file for details.