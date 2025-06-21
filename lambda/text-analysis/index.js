const AWS = require('aws-sdk');
const gremlin = require('gremlin');
const { v4: uuidv4 } = require('uuid');

const comprehend = new AWS.Comprehend();
const { DriverRemoteConnection } = gremlin.driver;
const { Graph } = gremlin.structure;

// Neptune connection
const createNeptuneConnection = () => {
  const endpoint = process.env.NEPTUNE_ENDPOINT;
  const port = process.env.NEPTUNE_PORT || '8182';
  const url = `wss://${endpoint}:${port}/gremlin`;
  
  return new DriverRemoteConnection(url, {
    mimeType: 'application/vnd.gremlin-v2.0+json',
    pingEnabled: false,
    connectTimeout: 20000,
  });
};

// Detect entities using AWS Comprehend
const detectEntities = async (text) => {
  const params = {
    Text: text,
    LanguageCode: 'en',
  };
  
  try {
    const result = await comprehend.detectEntities(params).promise();
    return result.Entities;
  } catch (error) {
    console.error('Error detecting entities:', error);
    throw error;
  }
};

// Detect sentiment using AWS Comprehend
const detectSentiment = async (text) => {
  const params = {
    Text: text,
    LanguageCode: 'en',
  };
  
  try {
    const result = await comprehend.detectSentiment(params).promise();
    return {
      sentiment: result.Sentiment,
      sentimentScore: result.SentimentScore,
    };
  } catch (error) {
    console.error('Error detecting sentiment:', error);
    throw error;
  }
};

// Store analysis results in Neptune
const storeInNeptune = async (analysisId, text, entities, sentiment) => {
  const connection = createNeptuneConnection();
  const g = new Graph().traversal().withRemote(connection);
  
  try {
    // Add analysis vertex
    await g.addV('analysis')
      .property('id', analysisId)
      .property('text', text)
      .property('timestamp', new Date().toISOString())
      .property('sentiment', sentiment.sentiment)
      .property('sentimentPositive', sentiment.sentimentScore.Positive)
      .property('sentimentNegative', sentiment.sentimentScore.Negative)
      .property('sentimentNeutral', sentiment.sentimentScore.Neutral)
      .property('sentimentMixed', sentiment.sentimentScore.Mixed)
      .next();
    
    // Add entity vertices and connect to analysis
    for (const entity of entities) {
      const entityId = uuidv4();
      await g.addV('entity')
        .property('id', entityId)
        .property('text', entity.Text)
        .property('type', entity.Type)
        .property('score', entity.Score)
        .next();
      
      // Connect entity to analysis
      await g.V().has('id', entityId)
        .addE('foundIn')
        .to(g.V().has('id', analysisId))
        .next();
    }
    
    return true;
  } catch (error) {
    console.error('Error storing in Neptune:', error);
    throw error;
  } finally {
    connection.close();
  }
};

// Get recommendations based on entity type
const getRecommendations = async (entityType, limit = 5) => {
  const connection = createNeptuneConnection();
  const g = new Graph().traversal().withRemote(connection);
  
  try {
    // Find analyses that contain entities of the specified type
    const results = await g.V().hasLabel('entity').has('type', entityType)
      .inE('foundIn').outV().hasLabel('analysis')
      .dedup()
      .project('id', 'text', 'sentiment', 'score')
      .by('id')
      .by('text')
      .by('sentiment')
      .by(g.V().hasLabel('entity').has('type', entityType).values('score').mean())
      .order().by('score', gremlin.process.order.desc)
      .limit(limit)
      .toList();
    
    return results.map(result => ({
      id: result.get('id'),
      text: result.get('text'),
      score: result.get('score'),
      reason: `Contains ${entityType} entities with high relevance`,
    }));
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw error;
  } finally {
    connection.close();
  }
};

// Get analysis result by ID
const getAnalysisResult = async (analysisId) => {
  const connection = createNeptuneConnection();
  const g = new Graph().traversal().withRemote(connection);
  
  try {
    // Get analysis vertex
    const analysis = await g.V().has('id', analysisId).project(
      'id', 'text', 'timestamp', 'sentiment', 
      'sentimentPositive', 'sentimentNegative', 'sentimentNeutral', 'sentimentMixed'
    )
    .by('id')
    .by('text')
    .by('timestamp')
    .by('sentiment')
    .by('sentimentPositive')
    .by('sentimentNegative')
    .by('sentimentNeutral')
    .by('sentimentMixed')
    .next();
    
    if (!analysis.value) {
      return null;
    }
    
    // Get entities connected to this analysis
    const entities = await g.V().has('id', analysisId)
      .in_('foundIn')
      .hasLabel('entity')
      .project('id', 'text', 'type', 'score')
      .by('id')
      .by('text')
      .by('type')
      .by('score')
      .toList();
    
    const result = analysis.value;
    
    return {
      id: result.id,
      text: result.text,
      timestamp: result.timestamp,
      sentiment: {
        positive: result.sentimentPositive,
        negative: result.sentimentNegative,
        neutral: result.sentimentNeutral,
        mixed: result.sentimentMixed,
        overall: result.sentiment,
      },
      entities: entities.map(e => ({
        id: e.get('id'),
        text: e.get('text'),
        type: e.get('type'),
        score: e.get('score'),
      })),
    };
  } catch (error) {
    console.error('Error getting analysis result:', error);
    throw error;
  } finally {
    connection.close();
  }
};

// Main handler
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Handle AppSync requests
    if (event.info) {
      const { fieldName } = event.info;
      const args = event.arguments;
      
      switch (fieldName) {
        case 'analyzeText': {
          const { text } = args;
          const analysisId = uuidv4();
          
          // Analyze text using Comprehend
          const [entities, sentimentResult] = await Promise.all([
            detectEntities(text),
            detectSentiment(text),
          ]);
          
          // Store results in Neptune
          await storeInNeptune(analysisId, text, entities, sentimentResult);
          
          // Return analysis result
          return {
            id: analysisId,
            text,
            entities: entities.map(e => ({
              id: uuidv4(),
              text: e.Text,
              type: e.Type,
              score: e.Score,
            })),
            sentiment: {
              positive: sentimentResult.sentimentScore.Positive,
              negative: sentimentResult.sentimentScore.Negative,
              neutral: sentimentResult.sentimentScore.Neutral,
              mixed: sentimentResult.sentimentScore.Mixed,
              overall: sentimentResult.sentiment,
            },
            timestamp: new Date().toISOString(),
          };
        }
        
        case 'getRecommendations': {
          const { entityType, limit } = args;
          return await getRecommendations(entityType, limit);
        }
        
        case 'getAnalysisResult': {
          const { id } = args;
          return await getAnalysisResult(id);
        }
        
        default:
          throw new Error(`Unknown field: ${fieldName}`);
      }
    }
    
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};