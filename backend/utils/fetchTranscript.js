import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NEW: Configuration constants
const MAX_RETRIES = 2;
const PROGRESS_INTERVAL = 30000; // 30 seconds

const fetchTranscript = async (url, options = {}) => {
  // NEW: Configurable options with defaults
  const {
    verbose = true,
    timeout = 1200000, // 20 minutes
    retries = MAX_RETRIES
  } = options;

  try {
    // Enhanced URL validation
    if (!url || !/youtube\.com|youtu\.be/.test(url)) {
      throw new Error('Invalid YouTube URL - must be from youtube.com or youtu.be');
    }

    const pythonScriptPath = path.resolve(__dirname, '../ml-worker/transcriber.py');
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

    if (!fs.existsSync(pythonScriptPath)) {
      throw new Error(`Transcriber script not found at ${pythonScriptPath}`);
    }

    // NEW: Video duration pre-check
    if (verbose) {
      console.log(`ℹ️ Starting transcription for: ${url}`);
      try {
        const durationCmd = `"${pythonExecutable}" -c "import yt_dlp; print(yt_dlp.YoutubeDL().extract_info('${url}', download=False)['duration'])"`;
        const duration = parseInt(execSync(durationCmd, { encoding: 'utf-8' }));
        console.log(`ℹ️ Video duration: ${Math.floor(duration/60)}m${duration%60}s`);
      } catch (e) {
        console.log('ℹ️ Could not determine video duration');
      }
    }

    // Enhanced execution environment
    const env = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUNBUFFERED: '1',
      // NEW: Add FFmpeg to PATH if not set
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin'
    };

    const execOptions = {
      cwd: path.dirname(pythonScriptPath),
      encoding: 'utf-8',
      timeout,
      killSignal: 'SIGKILL',
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    const command = `"${pythonExecutable}" "${pythonScriptPath}" "${url}"`;
    
    if (verbose) {
      console.log(`ℹ️ Executing: ${command}`);
      console.time('TranscriptionTime');
    }

    // NEW: Retry mechanism
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const output = execSync(command, execOptions);
        const transcript = output.trim();

        if (!transcript) {
          throw new Error('Empty transcript returned - possibly no audio found');
        }

        if (verbose) {
          console.timeEnd('TranscriptionTime');
          console.log(`✅ Transcription successful (${transcript.length} chars)`);
          console.log(`ℹ️ First 100 chars: ${transcript.substring(0, 100)}...`);
        }

        return transcript;

      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          const waitTime = attempt * 5000; // Exponential backoff
          console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;

  } catch (error) {
    console.error('❌ Transcript error:', error.message);
    
    // Enhanced error diagnostics
    if (error.stderr) {
      const pythonError = error.stderr.trim();
      console.error('Python error output:');
      console.error(pythonError);

      // NEW: Additional error pattern detection
      if (/FFmpeg|avconv/i.test(pythonError)) {
        throw new Error('FFmpeg not installed or not in PATH - required for audio conversion');
      }
      if (/Private|Members Only|Sign in/i.test(pythonError)) {
        throw new Error('Video is private or requires login');
      }
      if (/Unsupported URL/i.test(pythonError)) {
        throw new Error('Unsupported YouTube URL format');
      }
    }

    throw new Error(`Transcript failed after ${retries} attempts: ${error.message}`);
  }
};

export default fetchTranscript;