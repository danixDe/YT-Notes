import { fetchTranscript as fetchYTTranscript } from 'youtube-transcript-plus';

const fetchTranscript = async (url) => {
  const videoId = new URL(url).searchParams.get('v');
  console.log(videoId);
  if (!videoId) throw new Error('thappu youthoob url');

  const transcript = await fetchYTTranscript(videoId);
  console.log(transcript);

  return transcript.map(t => t.text).join(' ');
};

export default fetchTranscript;
