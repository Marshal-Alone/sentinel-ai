import os
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
import uuid
from datetime import datetime

app = FastAPI()

# 1. CORS - Allow your extension to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, verify this matches your Extension ID
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Setup Pinecone (Cloud Database)
# We expect these secrets to be set in your Cloud Environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY") 
if not PINECONE_API_KEY:
    print("WARNING: Pinecone API Key not found. App will crash on request if not set.")

# Initialize Pinecone only if key is present to avoid immediate crash on local start without key
if PINECONE_API_KEY:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index("sentinel-memory")
else:
    index = None

# 3. Setup Embedding Model
# We load this once when the server starts. 
# Note: On free cloud tiers, this might be slow.
model = SentenceTransformer('all-MiniLM-L6-v2')

class ActivityLog(BaseModel):
    title: str
    url: str
    content: str
    timestamp: str

class Query(BaseModel):
    text: str

def get_youtube_transcript(video_id):
    """Fetches the full spoken transcript of a YouTube video."""
    try:
        # New API: instantiate YouTubeTranscriptApi and call fetch()
        from youtube_transcript_api import YouTubeTranscriptApi
        
        ytt_api = YouTubeTranscriptApi()
        fetched_transcript = ytt_api.fetch(video_id)
        
        # Convert to raw data (list of dicts)
        transcript_data = fetched_transcript.to_raw_data()
        
        # Combine all text segments
        full_text = " ".join([entry['text'] for entry in transcript_data])
        return full_text
        
    except Exception as e:
        print(f"Error getting YT transcript: {e}")
        return None

def get_instagram_details(url):
    """Fetches captions, subtitles, and metadata from Instagram/TikTok videos."""
    ydl_opts = {
        'quiet': False,  # Enable output for debugging
        'skip_download': True,
        'no_warnings': False,  # Show warnings for debugging
        'ignoreerrors': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'en-US'],
        'verbose': True,  # Enable verbose mode
    }
    try:
        print(f"   Attempting to fetch from: {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info:
                # Basic metadata
                description = info.get('description', '')
                uploader = info.get('uploader', 'Unknown')
                title = info.get('title', '')
                
                print(f"   Extracted - Title: {title[:50]}, Uploader: {uploader}")
                
                # Try to get subtitles/captions
                subtitles = info.get('subtitles', {})
                automatic_captions = info.get('automatic_captions', {})
                
                subtitle_text = ""
                # Check for manual subtitles first
                if subtitles:
                    for lang, subs in subtitles.items():
                        if subs and len(subs) > 0:
                            subtitle_text = f"[Subtitles available in {lang}]"
                            break
                
                # Check for auto-generated captions
                if not subtitle_text and automatic_captions:
                    for lang, subs in automatic_captions.items():
                        if subs and len(subs) > 0:
                            subtitle_text = f"[Auto-captions available in {lang}]"
                            break
                
                # Combine all available text
                full_context = f"Reel by {uploader}: {title}\n\nCaption/Description:\n{description}"
                if subtitle_text:
                    full_context += f"\n\n{subtitle_text}"
                
                return full_context
            else:
                print("   No info returned from yt-dlp")
    except Exception as e:
        import traceback
        print(f"Error getting Instagram/TikTok details: {e}")
        print(f"Full traceback:\n{traceback.format_exc()}")
    return None

def extract_video_id(url):
    """Finds the ID from a YouTube URL."""
    if "v=" in url:
        return url.split("v=")[1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[1]
    return None

@app.get("/")
def health_check():
    return {"status": "Sentinel Cloud Brain is Online"}

@app.post("/ingest")
async def ingest_activity(log: ActivityLog):
    if not index:
         raise HTTPException(status_code=500, detail="Pinecone API Key not configured")

    print(f"🧠 Processing: {log.url}")
    
    final_content = log.content # Start with what the browser sent
    
    # --- INTELLIGENT CONTEXT EXPANSION ---
    
    # 1. YOUTUBE STRATEGY
    if "youtube.com" in log.url or "youtu.be" in log.url:
        print(f"   🎥 YouTube detected.")
        
        # Note: HF Spaces cannot access YouTube due to network restrictions
        # We rely on the extension to scrape title/description/transcript
        if log.content and len(log.content) > 100:
            final_content = f"VIDEO: {log.title}\n\nCONTENT:\n{log.content}"
            print(f"   ✅ Using video data from extension. Length: {len(log.content)} chars")
        else:
            print(f"   ⚠️ No video data from extension. Using title only.")
            final_content = f"VIDEO TITLE: {log.title}\nURL: {log.url}"

    # 2. INSTAGRAM / TIKTOK STRATEGY
    elif "instagram.com/reel" in log.url or "tiktok.com" in log.url:
        platform = "Instagram" if "instagram" in log.url else "TikTok"
        print(f"   📱 {platform} detected.")
        
        # Note: HF Spaces cannot access Instagram due to network restrictions
        # We rely on the extension to scrape the caption before sending
        if log.content and len(log.content) > 50:
            final_content = f"SOCIAL POST: {log.title}\n\nCONTENT:\n{log.content}"
            print(f"   ✅ Using caption from extension. Length: {len(log.content)} chars")
        else:
            print(f"   ⚠️ No caption from extension. Using title only.")
            final_content = f"SOCIAL POST: {log.title}\nURL: {log.url}"

    # 3. INSTAGRAM DM (Private) -> TRUST THE EXTENSION
    elif "instagram.com/direct" in log.url:
        print("   💬 Private Chat detected. Using text from Extension.")
        final_content = f"PRIVATE CHAT LOG:\n{log.content}"

    # 3. Create the Memory (Embedding)
    vector = model.encode(final_content).tolist()

    # 4. Store in Cloud Memory (Pinecone)
    index.upsert(
        vectors=[{
            "id": str(uuid.uuid4()),
            "values": vector,
            "metadata": {
                "title": log.title,
                "url": log.url,
                "content": final_content[:10000], # Store up to 10k chars for full context
                "timestamp": log.timestamp
            }
        }]
    )
    return {"status": "saved", "content_preview": final_content[:50]}

@app.post("/recall")
async def recall_memory(query: Query):
    if not index:
         raise HTTPException(status_code=500, detail="Pinecone API Key not configured")

    # Convert query to vector
    query_vector = model.encode(query.text).tolist()

    # Search Pinecone
    results = index.query(
        vector=query_vector,
        top_k=5,
        include_metadata=True
    )

    memories = []
    for match in results['matches']:
        memories.append({
            "content": match['metadata']['content'],
            "metadata": {
                "title": match['metadata']['title'],
                "url": match['metadata']['url'],
                "time": match['metadata']['timestamp']
            },
            "score": match['score']
        })
            
    return {"memories": memories}

@app.get("/memories")
async def get_all_memories():
    if not index:
         raise HTTPException(status_code=500, detail="Pinecone API Key not configured")

    # Create a generic "neutral" vector to match everything (or as much as possible)
    # We use a vector of small non-zero values to avoid zero-vector issues
    dummy_vector = [0.01] * 384

    # Fetch top 100 most recent/relevant items
    results = index.query(
        vector=dummy_vector,
        top_k=100,
        include_metadata=True
    )

    memories = []
    for match in results['matches']:
        # Safety check for metadata
        meta = match.get('metadata', {})
        memories.append({
            "id": match['id'],
            "content": meta.get('content', 'No content'),
            "metadata": {
                "title": meta.get('title', 'Unknown Title'),
                "url": meta.get('url', '#'),
                "time": meta.get('timestamp', datetime.now().isoformat()),
                "platform": "YOUTUBE" if "youtube" in meta.get('url', '') else "OTHER"
            },
            "score": match['score']
        })
            
    return {"memories": memories}

class DeleteRequest(BaseModel):
    ids: list[str] = []
    delete_all: bool = False

@app.delete("/memories")
async def delete_memories(req: DeleteRequest):
    if not index:
         raise HTTPException(status_code=500, detail="Pinecone API Key not configured")

    if req.delete_all:
        # Delete everything in the namespace (or index if no namespace)
        # Note: Pinecone delete_all=True is deprecated in some clients, but delete(delete_all=True) works
        try:
            index.delete(delete_all=True)
            return {"status": "All memories deleted"}
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Failed to delete all: {str(e)}")
    
    if req.ids:
        try:
            index.delete(ids=req.ids)
            return {"status": f"Deleted {len(req.ids)} memories"}
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Failed to delete IDs: {str(e)}")

    return {"status": "No action taken"}

if __name__ == "__main__":
    import uvicorn
    # Change port to 7860
    uvicorn.run(app, host="0.0.0.0", port=7860)
