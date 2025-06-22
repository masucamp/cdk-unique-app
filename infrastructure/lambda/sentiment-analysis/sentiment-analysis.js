const AWS = require('aws-sdk');
const comprehend = new AWS.Comprehend();

// Environment variables
const LANGUAGE_CODE = process.env.LANGUAGE_CODE || 'en';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from the event
    const { text, languageCode } = event.arguments.input;
    
    // Prepare parameters for Comprehend
    const params = {
      Text: text,
      LanguageCode: languageCode || LANGUAGE_CODE,
    };
    
    console.log('Comprehend params:', params);
    
    // Call Comprehend to detect sentiment
    const result = await comprehend.detectSentiment(params).promise();
    console.log('Comprehend result:', result);
    
    return {
      sentiment: result.Sentiment,
      sentimentScores: {
        positive: result.SentimentScore.Positive,
        negative: result.SentimentScore.Negative,
        neutral: result.SentimentScore.Neutral,
        mixed: result.SentimentScore.Mixed,
      },
      requestId: result.$response.requestId,
    };
  } catch (error) {
    console.error('Error:', error);
    throw new Error(`Error analyzing sentiment: ${error.message}`);
  }
};