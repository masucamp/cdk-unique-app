import { AppSyncResolverHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const polly = new AWS.Polly();
const s3 = new AWS.S3();

// Interface definitions
interface SynthesizeSpeechInput {
  text: string;
  voiceId?: string;
  outputFormat?: string;
}

interface SynthesizeSpeechOutput {
  audioUrl: string;
  taskId?: string;
}

// Main handler function
export const handler: AppSyncResolverHandler<SynthesizeSpeechInput, SynthesizeSpeechOutput> = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { fieldName } = event.info;
  const args = event.arguments;
  
  try {
    if (fieldName === 'synthesizeSpeech') {
      return await synthesizeSpeech(args);
    } else {
      throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Synthesize speech from text
async function synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechOutput> {
  const { text, voiceId = 'Joanna', outputFormat = 'mp3' } = input;
  
  // For short text, use the synchronous API
  if (text.length < 3000) {
    return await synthesizeShortSpeech(text, voiceId, outputFormat);
  } 
  // For longer text, use the asynchronous API
  else {
    return await synthesizeLongSpeech(text, voiceId, outputFormat);
  }
}

// Synthesize short speech (synchronous)
async function synthesizeShortSpeech(text: string, voiceId: string, outputFormat: string): Promise<SynthesizeSpeechOutput> {
  const params = {
    Text: text,
    VoiceId: voiceId,
    OutputFormat: outputFormat,
    Engine: 'neural',
  };
  
  try {
    // Call Polly to synthesize speech
    const response = await polly.synthesizeSpeech(params).promise();
    
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `speech-${timestamp}.${outputFormat}`;
    const bucketName = process.env.AUDIO_BUCKET_NAME || 'voice-track-audio';
    
    // Upload the audio to S3
    if (response.AudioStream) {
      const uploadParams = {
        Bucket: bucketName,
        Key: filename,
        Body: response.AudioStream,
        ContentType: `audio/${outputFormat}`,
        ACL: 'public-read',
      };
      
      await s3.upload(uploadParams).promise();
      
      // Return the URL to the audio file
      const audioUrl = `https://${bucketName}.s3.amazonaws.com/${filename}`;
      return { audioUrl };
    } else {
      throw new Error('No audio stream returned from Polly');
    }
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
}

// Synthesize long speech (asynchronous)
async function synthesizeLongSpeech(text: string, voiceId: string, outputFormat: string): Promise<SynthesizeSpeechOutput> {
  const bucketName = process.env.AUDIO_BUCKET_NAME || 'voice-track-audio';
  const timestamp = Date.now();
  const filename = `speech-${timestamp}.${outputFormat}`;
  
  const params = {
    Text: text,
    VoiceId: voiceId,
    OutputFormat: outputFormat,
    Engine: 'neural',
    OutputS3BucketName: bucketName,
    OutputS3KeyPrefix: 'long-speech/',
  };
  
  try {
    // Start an asynchronous speech synthesis task
    const response = await polly.startSpeechSynthesisTask(params).promise();
    
    if (response.SynthesisTask) {
      const taskId = response.SynthesisTask.TaskId;
      const audioUrl = response.SynthesisTask.OutputUri;
      
      return {
        audioUrl,
        taskId,
      };
    } else {
      throw new Error('No synthesis task created');
    }
  } catch (error) {
    console.error('Error starting speech synthesis task:', error);
    throw error;
  }
}