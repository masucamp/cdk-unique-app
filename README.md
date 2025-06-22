# VoiceVoyage

A travel memory journal application that brings your travel experiences to life using uncommon AWS services.

## Overview

VoiceVoyage is a React application that allows users to create journal entries about their travels. The application leverages several uncommon AWS services to provide a unique experience:

- **AWS Polly**: Converts journal entries to lifelike speech so users can listen to their memories
- **AWS Comprehend**: Analyzes the sentiment and extracts key entities (locations, landmarks, etc.) from journal text
- **AWS Location Service**: Plots visited locations on a map
- **AWS Timestream**: Stores time-series data about when users visited different locations

## Architecture

The application uses AWS CDK to provision all necessary infrastructure as code.

## Prerequisites

- Node.js 14.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK v2 installed globally (`npm install -g aws-cdk`)

## Deployment

1. Clone this repository
2. Install dependencies: `npm install`
3. Bootstrap CDK (if not already done): `cdk bootstrap`
4. Deploy the application: `cdk deploy`

## Local Development

1. Install dependencies: `npm install`
2. Start the React development server: `npm start`

## Project Structure

- `/lib` - CDK infrastructure code
- `/frontend` - React application code
- `/lambda` - Lambda function code

## Selected AWS Services

### AWS Polly
AWS Polly is a service that turns text into lifelike speech. In VoiceVoyage, it's used to convert journal entries into audio that users can listen to, providing a more immersive way to revisit memories.

### AWS Comprehend
AWS Comprehend is a natural language processing (NLP) service that uses machine learning to find insights and relationships in text. VoiceVoyage uses it to analyze journal entries for sentiment and to extract key entities like locations, landmarks, and activities.

### AWS Location Service
AWS Location Service provides location-based functionality including maps, points of interest, geocoding, and tracking. VoiceVoyage uses it to visualize travel locations on a map and to provide geographic context to journal entries.

### AWS Timestream
AWS Timestream is a fast, scalable, fully managed time series database service. VoiceVoyage uses it to store and query time-series data about user travels, enabling timeline views and temporal analysis of travel patterns.

## Why These Services?

These services were selected because they are less commonly used in typical web applications but offer powerful capabilities when combined. They demonstrate AWS's breadth of specialized services beyond the core offerings like EC2, S3, and Lambda.