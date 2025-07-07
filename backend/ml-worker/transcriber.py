import sys
import os
import uuid
from faster_whisper import WhisperModel
import yt_dlp
import tempfile
import traceback
from datetime import datetime

# NEW: Configuration constants
MAX_DURATION = 3600  # 60 minute maximum duration (in seconds)
MODEL_SIZES = {
    'short': ('base', 'int8'),      # <10 mins
    'medium': ('small', 'int8'),    # 10-30 mins
    'long': ('medium', 'int8')      # >30 mins
}

def download_audio(url):
    """Enhanced download with duration check and better temp handling"""
    temp_dir = tempfile.gettempdir()
    base_filename = os.path.join(temp_dir, f"yt_{uuid.uuid4()}")
    
    # NEW: First get video duration without downloading
    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            duration = info.get('duration', 0)
            if duration > MAX_DURATION:
                raise ValueError(f"Video too long ({duration//60} mins > {MAX_DURATION//60} mins max)")
    except Exception as e:
        print(f"❌ Duration check failed: {str(e)}", file=sys.stderr)
        return None

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': base_filename,
        'quiet': False,
        'no_warnings': False,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
        }],
        'extractaudio': True,
        'audioformat': 'mp3',
    }

    try:
        print(f"ℹ️ [{datetime.now()}] Starting download for {url}", file=sys.stderr)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            # NEW: More robust file detection
            possible_extensions = ['.mp3', '.webm', '.m4a', '.mp4', '.mkv', '']
            for ext in possible_extensions:
                possible_file = base_filename + ext
                if os.path.exists(possible_file):
                    print(f"ℹ️ Found audio file: {possible_file}", file=sys.stderr)
                    return possible_file
            
            print("❌ No downloaded file found with any extension", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"❌ Download failed: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return None

def transcribe(url):
    """Enhanced transcription with model scaling"""
    audio_path = None
    try:
        print(f"ℹ️ [{datetime.now()}] Starting transcription for {url}", file=sys.stderr)
        audio_path = download_audio(url)
        
        if not audio_path or not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found at {audio_path}")

        # NEW: Dynamic model selection based on duration
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            duration = info.get('duration', 0)
            
            if duration > 1800:  # >30 mins
                model_size, compute_type = MODEL_SIZES['long']
            elif duration > 600:  # >10 mins
                model_size, compute_type = MODEL_SIZES['medium']
            else:
                model_size, compute_type = MODEL_SIZES['short']
                
        print(f"ℹ️ Using model: {model_size} (duration: {duration//60}m)", file=sys.stderr)
        model = WhisperModel(model_size, compute_type=compute_type)

        # NEW: Progress reporting for long transcripts
        transcript_chunks = []
        segments, _ = model.transcribe(audio_path, vad_filter=True)
        
        for i, segment in enumerate(segments):
            transcript_chunks.append(segment.text)
            if i % 50 == 0:  # Print progress every 50 segments
                print(f"ℹ️ Transcribed {i} segments...", file=sys.stderr)
        
        transcript = " ".join(transcript_chunks)
        print(f"ℹ️ Transcription complete ({len(transcript.split())} words)", file=sys.stderr)

        return transcript.strip()
        
    except Exception as e:
        print(f"❌ Transcription failed: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        raise
    finally:
        # NEW: More reliable cleanup
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print("ℹ️ Cleaned up audio file", file=sys.stderr)
            except Exception as e:
                print(f"⚠️ Failed to clean up audio file: {str(e)}", file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 transcriber.py <YouTube_URL>", file=sys.stderr)
        sys.exit(1)

    try:
        url = sys.argv[1]
        print(transcribe(url))
    except Exception as e:
        print(f"❌ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)