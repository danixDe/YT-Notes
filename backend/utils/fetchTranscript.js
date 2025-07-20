import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const fetchTranscript = async (url) => {
  try {
    const videoId = new URL(url).searchParams.get('v');

    const response = await axios.get('https://youtube-transcripts.p.rapidapi.com/youtube/transcript', {
      params: {
        url: url,
        videoId: videoId,
        chunkSize: '500',
        text: 'false',
        lang: 'en'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'youtube-transcripts.p.rapidapi.com'
      },
      timeout: 20000
    });
    console.log(response.data);
    const transcriptChunks = response.data?.content;
    if (!Array.isArray(transcriptChunks)) {
      throw new Error('Invalid transcript format from API');
    }

    const fullTranscript = transcriptChunks.map(chunk => chunk.text).join(' ');
    return fullTranscript;

  } catch (error) {
    console.error(' Transcript fetch failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    throw new Error('Could not fetch transcript. Check if the URL is valid and the video is supported.');
  }
};

export default fetchTranscript;
