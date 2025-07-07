import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const summarize = async (text) => {
  const prompt = `Summarize the following YouTube transcript into concise, easy-to-read bullet-point notes:\n\n${text}`;

  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  return res.data.choices[0].message.content;
};

export default summarize;
