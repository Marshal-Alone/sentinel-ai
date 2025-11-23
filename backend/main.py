import os
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from youtube_transcript_api import YouTubeTranscriptApi
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

def get_video_id(url):
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

    print(f"📥 Signal: {log.title[:30]}...")
    
    final_content = log.content
    
    # YouTube Logic
    if "youtube.com" in log.url or "youtu.be" in log.url:
        vid_id = get_video_id(log.url)
        if vid_id:
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(vid_id)
                dialogue = " ".join([t['text'] for t in transcript_list])[:2000]
                final_content = f"VIDEO TITLE: {log.title} | DIALOGUE: {dialogue}"
            except Exception:
                pass

    # Generate Vector (Embedding)
    vector = model.encode(final_content).tolist()

    # Upload to Pinecone
    index.upsert(
        vectors=[{
            "id": str(uuid.uuid4()),
            "values": vector,
            "metadata": {
                "title": log.title,
                "url": log.url,
                "content": final_content[:1000], # Store text snippet for display
                "timestamp": log.timestamp
            }
        }]
    )
    return {"status": "stored"}

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

if __name__ == "__main__":
    # Use the PORT environment variable provided by the cloud host
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
