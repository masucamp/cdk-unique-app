import React, { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// GraphQL mutations and queries
const CONVERT_TEXT_TO_SPEECH = gql`
  mutation ConvertTextToSpeech($input: TextToSpeechInput!) {
    convertTextToSpeech(input: $input) {
      audioUrl
      requestId
    }
  }
`;

const ANALYZE_SENTIMENT = gql`
  mutation AnalyzeSentiment($input: SentimentAnalysisInput!) {
    analyzeSentiment(input: $input) {
      sentiment
      sentimentScores {
        positive
        negative
        neutral
        mixed
      }
      requestId
    }
  }
`;

const STORE_SENTIMENT_DATA = gql`
  mutation StoreSentimentData($input: StoreSentimentInput!) {
    storeSentimentData(input: $input) {
      success
      recordId
    }
  }
`;

const GET_SENTIMENT_HISTORY = gql`
  query GetSentimentHistory($timeRange: TimeRangeInput!) {
    getSentimentHistory(timeRange: $timeRange) {
      recordId
      text
      sentiment
      sentimentScores {
        positive
        negative
        neutral
        mixed
      }
      timestamp
    }
  }
`;

function App() {
  const [text, setText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set up time range for sentiment history query (last 24 hours)
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

  // GraphQL mutations
  const [convertTextToSpeech] = useMutation(CONVERT_TEXT_TO_SPEECH);
  const [analyzeSentiment] = useMutation(ANALYZE_SENTIMENT);
  const [storeSentimentData] = useMutation(STORE_SENTIMENT_DATA);

  // GraphQL query for sentiment history
  const { data: historyData, loading: historyLoading } = useQuery(GET_SENTIMENT_HISTORY, {
    variables: {
      timeRange: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    },
    fetchPolicy: 'network-only',
  });

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Step 1: Analyze sentiment
      const sentimentResponse = await analyzeSentiment({
        variables: {
          input: {
            text,
            languageCode: 'en',
          },
        },
      });
      
      const sentimentData = sentimentResponse.data.analyzeSentiment;
      setSentimentResult(sentimentData);
      
      // Step 2: Convert text to speech
      const speechResponse = await convertTextToSpeech({
        variables: {
          input: {
            text,
            voiceId: 'Joanna',
            outputFormat: 'mp3',
          },
        },
      });
      
      setAudioUrl(speechResponse.data.convertTextToSpeech.audioUrl);
      
      // Step 3: Store sentiment data
      await storeSentimentData({
        variables: {
          input: {
            text,
            sentiment: sentimentData.sentiment,
            sentimentScores: sentimentData.sentimentScores,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Format sentiment history data for chart
  const chartData = historyData?.getSentimentHistory.map(record => ({
    timestamp: new Date(record.timestamp).toLocaleTimeString(),
    positive: record.sentimentScores.positive,
    negative: record.sentimentScores.negative,
    neutral: record.sentimentScores.neutral,
    mixed: record.sentimentScores.mixed,
    text: record.text,
  })) || [];

  // Get sentiment color class
  const getSentimentColorClass = (sentiment) => {
    if (!sentiment) return '';
    return `sentiment-${sentiment.toLowerCase()}`;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>VoiceSentinel</h1>
        <p>Text-to-Speech and Sentiment Analysis</p>
      </div>
      
      <div className="card">
        <h2>Enter Text</h2>
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="text">Text to analyze:</label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows="5"
              placeholder="Enter text to analyze sentiment and convert to speech..."
              disabled={loading}
            />
          </div>
          
          <button type="submit" disabled={loading || !text.trim()}>
            {loading ? 'Processing...' : 'Analyze & Convert'}
          </button>
        </form>
      </div>
      
      {sentimentResult && (
        <div className="card">
          <h2>Sentiment Analysis Results</h2>
          <p>
            <strong>Overall Sentiment:</strong>{' '}
            <span className={getSentimentColorClass(sentimentResult.sentiment)}>
              {sentimentResult.sentiment}
            </span>
          </p>
          
          <h3>Sentiment Scores:</h3>
          <ul>
            <li className="sentiment-positive">
              Positive: {(sentimentResult.sentimentScores.positive * 100).toFixed(2)}%
            </li>
            <li className="sentiment-negative">
              Negative: {(sentimentResult.sentimentScores.negative * 100).toFixed(2)}%
            </li>
            <li className="sentiment-neutral">
              Neutral: {(sentimentResult.sentimentScores.neutral * 100).toFixed(2)}%
            </li>
            <li className="sentiment-mixed">
              Mixed: {(sentimentResult.sentimentScores.mixed * 100).toFixed(2)}%
            </li>
          </ul>
        </div>
      )}
      
      {audioUrl && (
        <div className="card">
          <h2>Text-to-Speech Result</h2>
          <audio controls className="audio-player" src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
      
      <div className="card">
        <h2>Sentiment History</h2>
        {historyLoading ? (
          <div className="loading">Loading history...</div>
        ) : chartData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke="#4CAF50" name="Positive" />
                <Line type="monotone" dataKey="negative" stroke="#f44336" name="Negative" />
                <Line type="monotone" dataKey="neutral" stroke="#2196F3" name="Neutral" />
                <Line type="monotone" dataKey="mixed" stroke="#FF9800" name="Mixed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>No sentiment history available. Analyze some text to see results here.</p>
        )}
      </div>
    </div>
  );
}

export default App;