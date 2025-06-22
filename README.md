# VoiceTrack - Voice-Guided Location Tracker

## Overview

VoiceTrack is a demo React application that leverages minor AWS services to create a voice-guided location tracking experience. The application allows users to track their location, receive voice guidance, and view their location history.

## Selected AWS Services

This application uses the following minor AWS services:

1. **AWS Location Service** - Provides location-based functionality including maps and tracking
2. **AWS Polly** - Text-to-speech service for voice guidance
3. **AWS Timestream** - Time-series database for storing historical location data
4. **AWS AppSync** - GraphQL service to connect the frontend with backend services

## Architecture

The application follows a serverless architecture pattern, with the frontend hosted on AWS Amplify and backend services managed through AWS AppSync and AWS Lambda.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- AWS CDK (v2)
- AWS CLI configured with appropriate permissions

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Deploy the CDK stack:
   ```
   cd cdk
   npm install
   cdk deploy
   ```
4. Start the React application:
   ```
   cd frontend
   npm install
   npm start
   ```

## Project Structure

- `/cdk` - CDK infrastructure code
- `/frontend` - React application code
- `/docs` - Documentation including architecture diagrams

## License

This project is licensed under the MIT License - see the LICENSE file for details.