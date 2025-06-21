# Data Flow Diagram

This diagram illustrates the flow of data through the Content Recommendation System.

```
┌───────────────┐
│               │
│  User Input   │  1. User submits text content
│  (Text)       │
│               │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│               │  2. GraphQL mutation
│  AppSync API  │     analyzeText(text)
│               │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│               │  3. Lambda processes
│  Lambda       │     request
│  Function     │
│               │
└─┬─────────┬───┘
  │         │
  ▼         │
┌───────────────┐
│               │  4. Extract entities
│  AWS          │     and sentiment
│  Comprehend   │
│               │
└───────┬───────┘
        │
        │
        ▼
┌───────────────┐  5. Store analysis results
│               │     - Content as vertex
│  AWS Neptune  │     - Entities as vertices
│  Graph DB     │     - Relationships as edges
│               │
└───────┬───────┘
        │
        │
        ▼
┌───────────────┐  6. Return analysis results
│               │     to client
│  Client       │
│  Browser      │
│               │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│               │  7. User requests
│  User Request │     recommendations
│  (Entity Type)│
│               │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│               │  8. GraphQL query
│  AppSync API  │     getRecommendations(entityType)
│               │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│               │  9. Lambda processes
│  Lambda       │     request
│  Function     │
│               │
└───────┬───────┘
        │
        ▼
┌───────────────┐  10. Query graph for content
│               │      with similar entities
│  AWS Neptune  │
│  Graph DB     │
│               │
└───────┬───────┘
        │
        ▼
┌───────────────┐  11. Return recommendations
│               │      to client
│  Client       │
│  Browser      │
│               │
└───────────────┘
```

## Text Analysis Flow (Steps 1-6)

1. **User Input**: User enters text content in the web interface
2. **GraphQL API Call**: Frontend makes a GraphQL mutation call to AppSync
3. **Lambda Processing**: AppSync invokes the Lambda function
4. **Text Analysis**: Lambda calls AWS Comprehend to extract entities and sentiment
5. **Data Storage**: Lambda stores the analysis results in Neptune graph database
6. **Result Display**: Analysis results are returned to the client and displayed

## Recommendation Flow (Steps 7-11)

7. **User Request**: User selects an entity type for recommendations
8. **GraphQL API Call**: Frontend makes a GraphQL query to AppSync
9. **Lambda Processing**: AppSync invokes the Lambda function
10. **Graph Query**: Lambda queries Neptune to find content with similar entities
11. **Result Display**: Recommendations are returned to the client and displayed

## Data Model in Neptune

```
(Content) -[:CONTAINS]-> (Entity)
   |
   v
(Sentiment)
```

- **Content Vertex**: Represents analyzed text with properties:
  - id
  - text
  - timestamp
  - sentiment scores

- **Entity Vertex**: Represents entities found in content with properties:
  - id
  - text
  - type (PERSON, LOCATION, ORGANIZATION, etc.)
  - score (confidence)

- **CONTAINS Edge**: Connects content to entities it contains

This graph structure allows for efficient queries like:
- "Find all content that mentions this entity"
- "Find content with similar entities to this content"
- "Find the most frequently mentioned entities of type X"