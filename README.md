# VoiceSentinel

VoiceSentinel is a React application that leverages unique AWS services to provide voice sentiment analysis capabilities. This project demonstrates how to combine several specialized AWS services to create a useful application.

## Overview

VoiceSentinel allows users to:
1. Input text that will be converted to speech using AWS Polly
2. Analyze the sentiment of the text using AWS Comprehend
3. Store the analysis results with timestamps in AWS Timestream
4. Use AWS AppSync with GraphQL to fetch and display the data in real-time on a dashboard

## Architecture

![VoiceSentinel Architecture](./docs/architecture.svg)

## AWS Services Used

This project intentionally uses less common AWS services to explore their capabilities:

### AWS Polly
**What it is:** A service that turns text into lifelike speech using advanced deep learning technologies.

**Why it's unique:** While text-to-speech is not new, Polly offers neural voices and SSML support that provides remarkably natural-sounding speech with various accents and languages. It's less commonly used compared to core AWS services but offers powerful capabilities for voice applications.

**How we use it:** VoiceSentinel uses Polly to convert user-entered text into speech that can be played back, allowing users to hear how their text sounds while also seeing its sentiment analysis.

### AWS Comprehend
**What it is:** A natural language processing (NLP) service that uses machine learning to find insights and relationships in text.

**Why it's unique:** Comprehend is a specialized service focused on understanding text content, which is less commonly integrated into standard applications compared to storage or compute services. It provides sophisticated sentiment analysis without requiring ML expertise.

**How we use it:** We use Comprehend to analyze the sentiment (positive, negative, neutral, or mixed) of the text entered by users, providing insights into the emotional tone of the content.

### AWS Timestream
**What it is:** A fast, scalable, fully managed time series database service for IoT and operational applications.

**Why it's unique:** Timestream is specifically designed for time series data, making it a niche service compared to general-purpose databases like DynamoDB or RDS. It's optimized for time-based queries that would be inefficient in traditional databases.

**How we use it:** VoiceSentinel stores sentiment analysis results with timestamps in Timestream, allowing users to track how sentiment changes over time and perform time-based analysis.

### AWS AppSync
**What it is:** A fully managed service that makes it easy to develop GraphQL APIs.

**Why it's unique:** While API Gateway is commonly used for REST APIs, AppSync specializes in GraphQL, which is less widely adopted but offers powerful capabilities for flexible data fetching. It also provides real-time data synchronization.

**How we use it:** We use AppSync to create a GraphQL API that connects the React frontend to our backend services, enabling real-time updates and efficient data fetching.

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK installed (`npm install -g aws-cdk`)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/VoiceSentinel.git
cd VoiceSentinel
```

2. Install dependencies
```bash
# Install CDK dependencies
cd infrastructure
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Deploy the infrastructure
```bash
cd ../infrastructure
cdk deploy
```

4. Start the React application
```bash
cd ../frontend
npm start
```

## Project Structure

```
VoiceSentinel/
├── infrastructure/       # CDK code for AWS resources
│   ├── bin/              # CDK app entry point
│   ├── lib/              # CDK stacks and constructs
│   └── test/             # CDK tests
├── frontend/             # React application
│   ├── public/           # Static assets
│   ├── src/              # React components and logic
│   └── package.json      # Frontend dependencies
├── shared/               # Shared code between frontend and backend
└── docs/                 # Documentation and diagrams
```

## Benefits and Challenges

### Benefits
- Real-time sentiment analysis of text content
- Historical tracking of sentiment over time
- Natural-sounding speech synthesis
- Scalable architecture for growing usage

### Challenges
- Integrating multiple specialized AWS services requires careful permission management
- Time series data modeling requires different thinking than traditional databases
- GraphQL learning curve for developers familiar only with REST

## Future Enhancements
- Add user authentication with Amazon Cognito
- Implement custom lexicons for AWS Polly to handle domain-specific terminology
- Add entity recognition using AWS Comprehend to identify key entities in text
- Implement anomaly detection for sentiment patterns using AWS Lookout for Metrics

## License
This project is licensed under the MIT License - see the LICENSE file for details.