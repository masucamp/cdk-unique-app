const AWS = require('aws-sdk');
const polly = new AWS.Polly();
const s3 = new AWS.S3();

// Environment variables
const VOICE_ID = process.env.VOICE_ID || 'Joanna';
const OUTPUT_FORMAT = process.env.OUTPUT_FORMAT || 'mp3';
const BUCKET_NAME = process.env.BUCKET_NAME || 'voice-sentinel-audio';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from the event
    const { text, voiceId, outputFormat } = event.arguments.input;
    
    // Prepare parameters for Polly
    const params = {
      Text: text,
      VoiceId: voiceId || VOICE_ID,
      OutputFormat: outputFormat || OUTPUT_FORMAT,
      Engine: 'neural', // Use neural engine for better quality
    };
    
    console.log('Polly params:', params);
    
    // Call Polly to synthesize speech
    const result = await polly.synthesizeSpeech(params).promise();
    console.log('Polly result:', { requestId: result.$response.requestId });
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const filename = `${timestamp}-${params.VoiceId}.${params.OutputFormat}`;
    
    // Upload the audio to S3
    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: result.AudioStream,
      ContentType: `audio/${params.OutputFormat}`,
      ACL: 'public-read',
    };
    
    // This is a mock implementation since we're not actually creating an S3 bucket in this example
    // In a real implementation, you would upload the file to S3 and return the URL
    // const s3Result = await s3.putObject(s3Params).promise();
    
    // For this example, we'll just return a mock URL
    const audioUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${filename}`;
    
    return {
      audioUrl,
      requestId: result.$response.requestId,
    };
  } catch (error) {
    console.error('Error:', error);
    throw new Error(`Error converting text to speech: ${error.message}`);
  }
};