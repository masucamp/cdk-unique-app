# Architecture Diagram

```
┌─────────────────┐     ┌───────────────┐     ┌───────────────────┐
│                 │     │               │     │                   │
│  CloudFront     │────▶│  S3 Website   │     │  AWS AppSync      │
│  Distribution   │     │  Hosting      │     │  GraphQL API      │
│                 │     │               │     │                   │
└────────┬────────┘     └───────────────┘     └─────────┬─────────┘
         │                                              │
         │                                              │
         │                                              ▼
┌────────▼────────┐                          ┌───────────────────┐
│                 │                          │                   │
│  Web Browser    │                          │  Lambda Function  │
│  Client         │                          │  (Text Analysis)  │
│                 │                          │                   │
└────────┬────────┘                          └─────────┬─────────┘
         │                                              │
         │                                              │
         │                                              ▼
         │                                   ┌───────────────────┐
         │                                   │                   │
         │                                   │  AWS Comprehend   │
         │                                   │  (NLP Service)    │
         │                                   │                   │
         │                                   └─────────┬─────────┘
         │                                              │
         │                                              │
         │                                              ▼
         │                                   ┌───────────────────┐
         │                                   │                   │
         └───────────────────────────────────│  AWS Neptune      │
                                             │  (Graph Database) │
                                             │                   │
                                             └───────────────────┘
```

## Flow Description

1. **User Interaction**: Users access the web application hosted on S3 and delivered through CloudFront.

2. **Text Analysis**:
   - Users submit text content through the web interface
   - The frontend makes a GraphQL mutation call to the AppSync API
   - AppSync invokes the Lambda function

3. **Natural Language Processing**:
   - The Lambda function calls AWS Comprehend to:
     - Extract entities (people, places, organizations, etc.)
     - Analyze sentiment (positive, negative, neutral, mixed)

4. **Data Storage**:
   - The Lambda function stores the analysis results in Neptune graph database
   - Entities are stored as vertices
   - Relationships between entities and content are stored as edges

5. **Recommendations**:
   - Users can request recommendations based on entity types
   - The Lambda function queries the Neptune graph database to find related content
   - Results are returned through AppSync to the frontend

## Key Components

### AWS Neptune
- Fully managed graph database service
- Stores content, entities, and their relationships
- Enables complex relationship queries for recommendations

### AWS Comprehend
- Natural language processing service
- Extracts entities and sentiment from text
- Provides AI capabilities without managing ML infrastructure

### AWS AppSync
- Managed GraphQL service
- Provides API for frontend-backend communication
- Handles authentication and authorization

### Lambda Function
- Processes text analysis requests
- Integrates with Comprehend for NLP
- Stores and retrieves data from Neptune

### S3 and CloudFront
- Hosts and delivers the web frontend
- Provides global content delivery

## Security Considerations

- Neptune is deployed in a VPC for network isolation
- Lambda function has IAM roles with least privilege
- AppSync API uses API key authentication
- All data in transit is encrypted