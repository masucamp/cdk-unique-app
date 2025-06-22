import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const pollyClient = new PollyClient({});
const s3Client = new S3Client({});

export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const journalEntryId = event.arguments.journalEntryId;
    const tableName = process.env.JOURNAL_TABLE;
    const bucketName = process.env.AUDIO_BUCKET;

    if (!tableName || !bucketName) {
      throw new Error('Required environment variables are not set');
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
    const title = journalEntry.title;

    // Convert text to speech using AWS Polly
    const synthesizeSpeechResult = await pollyClient.send(
      new SynthesizeSpeechCommand({
        Text: `${title}. ${content}`,
        OutputFormat: 'mp3',
        VoiceId: 'Joanna',
        Engine: 'neural',
      })
    );

    if (!synthesizeSpeechResult.AudioStream) {
      throw new Error('Failed to synthesize speech');
    }

    // Convert AudioStream to Buffer
    const chunks: Buffer[] = [];
    const audioStream = synthesizeSpeechResult.AudioStream as Readable;
    
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const audioBuffer = Buffer.concat(chunks);

    // Upload audio to S3
    const key = `journal-entries/${journalEntryId}.mp3`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: audioBuffer,
        ContentType: 'audio/mpeg',
      })
    );

    const audioUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;

    // Update the journal entry with audio URL
    const updateResult = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: journalEntryId, createdAt: journalEntry.createdAt },
        UpdateExpression: 'set audioUrl = :audioUrl, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':audioUrl': audioUrl,
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