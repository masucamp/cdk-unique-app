const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const polly = new AWS.Polly();
const comprehend = new AWS.Comprehend();
const timestreamWrite = new AWS.TimestreamWrite();

// Environment variables
const DATABASE_NAME = process.env.TIMESTREAM_DATABASE_NAME;
const TABLE_NAME = process.env.TIMESTREAM_TABLE_NAME;

exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Handle different AppSync operations
    if (event.info.fieldName === 'processText') {
      return await processText(event.arguments.text);
    } else if (event.info.fieldName === 'getAnalysisResults') {
      return await getAnalysisResults(event.arguments.startTime, event.arguments.endTime);
    } else {
      throw new Error(`Unknown field name: ${event.info.fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

async function processText(text) {
  // Generate a unique ID for this analysis
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Analyze sentiment using AWS Comprehend
  const sentimentResult = await comprehend.detectSentiment({
    Text: text,
    LanguageCode: 'en'
  }).promise();
  
  // Extract key phrases using AWS Comprehend
  const keyPhrasesResult = await comprehend.detectKeyPhrases({
    Text: text,
    LanguageCode: 'en'
  }).promise();
  
  // Convert text to speech using AWS Polly
  const pollyResult = await polly.synthesizeSpeech({
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Joanna'
  }).promise();
  
  // In a real application, you would upload the audio to S3 and return the URL
  // For this demo, we'll just acknowledge that we got audio data
  const audioUrl = `https://example.com/audio/${id}.mp3`;
  
  // Prepare the analysis result
  const analysisResult = {
    id,
    text,
    sentiment: {
      sentiment: sentimentResult.Sentiment,
      positive: sentimentResult.SentimentScore.Positive,
      negative: sentimentResult.SentimentScore.Negative,
      neutral: sentimentResult.SentimentScore.Neutral,
      mixed: sentimentResult.SentimentScore.Mixed
    },
    keyPhrases: keyPhrasesResult.KeyPhrases.map(kp => kp.Text),
    audioUrl,
    timestamp
  };
  
  // Store the result in Timestream
  await storeAnalysisResult(analysisResult);
  
  return analysisResult;
}

async function storeAnalysisResult(result) {
  // First, ensure we have the Timestream endpoints
  await timestreamWrite.describeEndpoints().promise();
  
  // Prepare records for Timestream
  const records = [
    {
      Dimensions: [
        { Name: 'id', Value: result.id },
        { Name: 'sentiment', Value: result.sentiment.sentiment }
      ],
      MeasureName: 'text_analysis',
      MeasureValue: JSON.stringify({
        text: result.text,
        sentiment: result.sentiment,
        keyPhrases: result.keyPhrases,
        audioUrl: result.audioUrl
      }),
      MeasureValueType: 'VARCHAR',
      Time: Date.now().toString(),
      TimeUnit: 'MILLISECONDS'
    }
  ];
  
  // Write records to Timestream
  const params = {
    DatabaseName: DATABASE_NAME,
    TableName: TABLE_NAME,
    Records: records
  };
  
  await timestreamWrite.writeRecords(params).promise();
}

async function getAnalysisResults(startTime, endTime) {
  // In a real application, you would query Timestream for results
  // For this demo, we'll return mock data
  return [
    {
      id: '123',
      text: 'This is a sample text',
      sentiment: {
        sentiment: 'POSITIVE',
        positive: 0.9,
        negative: 0.01,
        neutral: 0.09,
        mixed: 0.0
      },
      keyPhrases: ['sample text'],
      audioUrl: 'https://example.com/audio/123.mp3',
      timestamp: '2023-07-01T12:00:00Z'
    }
  ];
}