import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const MODEL_CONFIG = {
  'llama3-70b-8192': {
    max_tokens: 8000,
    temperature: 0.7,
    chunkSize: 6000
  },
  'mixtral-8x7b-32768': {
    max_tokens: 30000,
    temperature: 0.5,
    chunkSize: 20000
  },
  'llama3-8b-8192': {
    max_tokens: 8000,
    temperature: 0.7,
    chunkSize: 6000
  }
};

const summarize = async (text, options = {}) => {
  const {
    model = 'llama3-70b-8192',
    retries = 3,
    timeout = 45000,
    verbose = true,
    consolidate = true,
    saveToFile = false,
  } = options;

  try {
    const chunkText = (text, maxLength) => {
      const chunks = [];
      while (text.length > 0) {
        let chunk = text.substring(0, maxLength);
        const lastPeriod = chunk.lastIndexOf('. ');
        if (lastPeriod > 0) chunk = chunk.substring(0, lastPeriod + 1);
        chunks.push(chunk);
        text = text.substring(chunk.length);
      }
      return chunks;
    };

    const chunks = chunkText(text, MODEL_CONFIG[model].chunkSize);
    if (verbose) console.log(`Splitting transcript into ${chunks.length} chunks...`);

    let fullSummary = '';

    for (let i = 0; i < chunks.length; i++) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const prompt = `Summarize this section of a YouTube transcript (part ${i + 1}/${chunks.length}):
Focus on key ideas, clear bullet points (if needed), and be accurate without fluff.

Transcript:
${chunks[i]}`;

          const startTime = Date.now();
          const res = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model,
              messages: [
                {
                  role: 'system',
                  content: 'You are a concise, high-quality summarizer for YouTube transcripts.'
                },
                { role: 'user', content: prompt }
              ],
              temperature: MODEL_CONFIG[model].temperature,
              max_tokens: MODEL_CONFIG[model].max_tokens
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
              },
              timeout
            }
          );

          const chunkSummary = res.data.choices[0].message.content;
          fullSummary += `\n\n${chunkSummary}`;

          if (verbose) {
            console.log(`Chunk ${i + 1} done in ${(Date.now() - startTime) / 1000}s`);
          }
          break;

        } catch (error) {
          if (attempt === retries) throw error;
          const wait = attempt * 4000;
          if (verbose) {
            console.warn(`⚠️ Retry ${attempt}/${retries} for chunk ${i + 1}... waiting ${wait / 1000}s`);
            console.warn(error.message);
          }
          await new Promise(res => setTimeout(res, wait));
        }
      }
    }

    if (chunks.length > 1 && consolidate) {
      if (verbose) console.log('🔗 Combining multiple chunk summaries...');
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a skilled editor. Combine these summaries into a single clear, structured summary.'
            },
            {
              role: 'user',
              content: `Summaries:\n\n${fullSummary}`
            }
          ],
          temperature: 0.3,
          max_tokens: MODEL_CONFIG[model].max_tokens
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout
        }
      );
      fullSummary = res.data.choices[0].message.content;
    }

    if (saveToFile) {
      const fs = await import('fs');
      fs.writeFileSync('summary.txt', fullSummary.trim());
      if (verbose) console.log('Summary saved to summary.txt');
    }

    return fullSummary.trim();

  } catch (error) {
    console.error('Summarization failed:');
    if (axios.isAxiosError(error)) {
      console.error(`API Status: ${error.response?.status}`);
      console.error(`Data: ${JSON.stringify(error.response?.data || {})}`);
    }
    throw new Error(`Summarization failed: ${error.message}`);
  }
};

export default summarize;
