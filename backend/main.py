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
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        # Combine all the lines into one big text block
        full_text = " ".join([t['text'] for t in transcript_list])
        return full_text
    except Exception as e:
        print(f"Error getting YT transcript: {e}")
        return None

def get_instagram_details(url):
    """Fetches the full caption, author, and description from an Instagram Reel."""
    ydl_opts = {
        'quiet': True,
        'skip_download': True, # We only want text, not the video file
        'no_warnings': True,
        'ignoreerrors': True
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info:
                description = info.get('description', '')
                uploader = info.get('uploader', 'Unknown')
                title = info.get('title', '')
                return f"Reel by {uploader}: {title}\n\nCaption: {description}"
    except Exception as e:
        print(f"Error getting IG details: {e}")
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
        vid_id = extract_video_id(log.url)
        if vid_id:
            transcript = get_youtube_transcript(vid_id)
            if transcript:
                # We combine the Title + Transcript for maximum searchability
                final_content = f"VIDEO TITLE: {log.title}\nTRANSCRIPT: {transcript[:4000]}" # Limit to 4000 chars to save DB space
                print("   ✅ YouTube Transcript attached.")

    # 2. INSTAGRAM / TIKTOK STRATEGY
    elif "instagram.com/reel" in log.url or "tiktok.com" in log.url:
        ig_details = get_instagram_details(log.url)
        if ig_details:
            final_content = f"SOCIAL POST: {log.title}\nDETAILS: {ig_details}"
            print("   ✅ Instagram Context attached.")

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
                "content": final_content[:2000], # Store readable text for the UI
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
