# AWS Maniac Services Web Application

This project demonstrates the use of uncommon AWS services to build a content recommendation system. The application analyzes text content, extracts entities and sentiment, stores relationships in a graph database, and provides recommendations via a GraphQL API.

## Uncommon AWS Services Used

1. **AWS Neptune** - A fully managed graph database service that makes it easy to build and run applications that work with highly connected datasets.
2. **AWS Comprehend** - A natural language processing (NLP) service that uses machine learning to find insights and relationships in text.
3. **AWS AppSync** - A fully managed service that makes it easy to develop GraphQL APIs by handling the heavy lifting of securely connecting to data sources.

## Architecture

The application uses the following architecture:

1. Users submit text content through a web interface
2. AWS Comprehend analyzes the text to extract entities and sentiment
3. The extracted data is stored in AWS Neptune as a graph database
4. AWS AppSync provides a GraphQL API to query the data and get recommendations
5. A simple web frontend allows users to interact with the system

For more details, see the [Architecture Diagram](docs/architecture.md) and [Data Flow Diagram](docs/data-flow.md).

## Documentation

- [Service Selection and Rationale](docs/service-selection.md) - Explains why we chose these uncommon AWS services
- [Architecture Diagram](docs/architecture.md) - Visual representation of the system architecture
- [Data Flow Diagram](docs/data-flow.md) - Detailed flow of data through the system
- [Deployment Guide](docs/deployment-guide.md) - Step-by-step instructions for deploying the application
- [Evaluation Report](docs/evaluation-report.md) - Assessment of benefits, challenges, and lessons learned

## Getting Started

### Prerequisites

- Node.js 14.x or later
- AWS CDK v2
- AWS CLI configured with appropriate credentials

### Deployment

```bash
# Install dependencies
npm install

# Bootstrap CDK (if not already done)
cdk bootstrap

# Deploy the stack
cdk deploy
```

For detailed deployment instructions, see the [Deployment Guide](docs/deployment-guide.md).

## Usage

After deployment, you can access the web interface at the URL provided in the CDK output.

## Project Structure

```
.
├── bin/                  # CDK app entry point
├── lib/                  # CDK stack definition
├── lambda/               # Lambda function code
│   └── text-analysis/    # Text analysis function
├── graphql/              # GraphQL schema
├── website/              # Web frontend
├── docs/                 # Documentation
└── test/                 # Tests
```

## Evaluation

### Benefits
- Leverages powerful AI capabilities without managing ML infrastructure
- Graph database provides efficient querying of complex relationships
- GraphQL API allows flexible and efficient data retrieval

### Challenges
- Neptune requires VPC setup which adds complexity
- Integration between services requires careful IAM configuration
- Cost management for these services requires attention

For a detailed evaluation, see the [Evaluation Report](docs/evaluation-report.md).

## Future Enhancements
- Add AWS QLDB for immutable audit logging
- Implement AWS Personalize for more advanced recommendations
- Add real-time updates using AppSync subscriptions