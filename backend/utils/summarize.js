import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// Enhanced Configuration
const MODEL_CONFIG = {
  'llama3-70b-8192': { 
    max_tokens: 8000,  // Conservative limit
    temperature: 0.7,
    chunkSize: 6000    // Characters per chunk
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
    verbose = true
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
    if (verbose) console.log(`ℹ️ Processing ${chunks.length} chunks`);

    let fullSummary = '';
    
    for (let i = 0; i < chunks.length; i++) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const prompt = `Continue summarizing this YouTube transcript (part ${i+1}/${chunks.length}):
Focus on key points, examples, and insights. Maintain consistent formatting.

Transcript Part:
${chunks[i]}`;

          const startTime = Date.now();
          const res = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model,
              messages: [
                { 
                  role: 'system', 
                  content: 'You are a professional content summarizer. Be concise yet thorough.' 
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
          fullSummary += '\n\n' + chunkSummary;

          if (verbose) {
            console.log(`✅ Chunk ${i+1} completed in ${(Date.now() - startTime)/1000}s`);
            console.log(`ℹ️ Tokens used: ${res.data.usage?.total_tokens || 'unknown'}`);
          }
          break; // Success, exit retry loop

        } catch (error) {
          if (attempt === retries) throw error;
          
          const waitTime = attempt * 5000;
          if (verbose) {
            console.warn(`⚠️ Chunk ${i+1} attempt ${attempt} failed, retrying in ${waitTime/1000}s...`);
            console.warn(error.message);
          }
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (chunks.length > 1) {
      if (verbose) console.log('ℹ️ Consolidating chunks...');
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages: [
            { 
              role: 'system', 
              content: 'You are an editor combining multiple summary sections into one cohesive summary.' 
            },
            { role: 'user', content: `Combine these summaries into one:\n\n${fullSummary}` }
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

    return fullSummary.trim();

  } catch (error) {
    console.error('❌ Summarization failed:');
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('API timeout - try again with shorter content');
      }
      console.error(`API Status: ${error.response?.status || 'No response'}`);
      console.error(`API Data: ${JSON.stringify(error.response?.data || {})}`);
    }
    
    throw new Error(`Failed after ${retries} retries: ${error.message}`);
  }
};

export default summarize;