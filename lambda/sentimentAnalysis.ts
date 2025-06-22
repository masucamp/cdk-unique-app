import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ComprehendClient, DetectSentimentCommand } from '@aws-sdk/client-comprehend';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const comprehendClient = new ComprehendClient({});

export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const journalEntryId = event.arguments.journalEntryId;
    const tableName = process.env.JOURNAL_TABLE;

    if (!tableName) {
      throw new Error('JOURNAL_TABLE environment variable is not set');
    }

    // Get the journal entry from DynamoDB
    const getResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id: journalEntryId },
      })
    );

    if (!getResult.Item) {
      throw new Error(`Journal entry with ID ${journalEntryId} not found`);
    }

    const journalEntry = getResult.Item;
    const content = journalEntry.content;

    // Analyze sentiment using AWS Comprehend
    const detectSentimentResult = await comprehendClient.send(
      new DetectSentimentCommand({
        Text: content,
        LanguageCode: 'en',
      })
    );

    const sentiment = {
      sentiment: detectSentimentResult.Sentiment,
      positive: detectSentimentResult.SentimentScore?.Positive,
      negative: detectSentimentResult.SentimentScore?.Negative,
      neutral: detectSentimentResult.SentimentScore?.Neutral,
      mixed: detectSentimentResult.SentimentScore?.Mixed,
    };

    // Update the journal entry with sentiment analysis
    const updateResult = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: journalEntryId, createdAt: journalEntry.createdAt },
        UpdateExpression: 'set sentiment = :sentiment, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':sentiment': sentiment,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return updateResult.Attributes;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};