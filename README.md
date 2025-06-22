# VoiceTravel Journal

A unique travel journal application that leverages uncommon AWS services to provide an enhanced journaling experience.

## Features

- Write journal entries about your travels
- Automatic sentiment analysis of your entries
- Interactive map display of your travel locations
- Listen to your journal entries with text-to-speech conversion

## AWS Services Used

This application demonstrates the use of several uncommon AWS services:

- **AWS Polly**: Converts journal entries to lifelike speech
- **AWS Comprehend**: Analyzes the sentiment of journal entries
- **AWS Location Service**: Provides mapping and location search functionality

Additional AWS services used:
- AWS Amplify (hosting)
- AWS AppSync (GraphQL API)
- Amazon DynamoDB (database)
- Amazon Cognito (authentication)
- Amazon S3 (storage for audio files)

## Architecture

The application follows a serverless architecture pattern:
- React frontend hosted on AWS Amplify
- GraphQL API using AWS AppSync
- Data storage in DynamoDB
- Authentication via Amazon Cognito
- Sentiment analysis with AWS Comprehend
- Text-to-speech conversion with AWS Polly
- Map rendering with AWS Location Service

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- AWS CLI configured with appropriate permissions
- AWS CDK installed (`npm install -g aws-cdk`)

### Deployment

1. Clone this repository
2. Install dependencies: `npm install`
3. Bootstrap CDK (if not already done): `cdk bootstrap`
4. Deploy the application: `cdk deploy`

## Project Structure

- `/cdk` - CDK infrastructure code
- `/frontend` - React application code