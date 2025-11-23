---
title: Sentinel Brain
emoji: 🛡️
colorFrom: gray
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Sentinel AI - Brain 🧠

This is the backend for **Sentinel AI**, a "Life Sentinel" that tracks your digital activity and allows you to search your history using semantic search.

It uses:
- **FastAPI**: For the API.
- **Pinecone**: For vector storage (Cloud).
- **Sentence Transformers**: For generating embeddings.
- **YouTube Transcript API**: For fetching video dialogue.

## Deployment
This Space is designed to be deployed as a **Docker** Space.

### Environment Variables
You must set the following **Secret** in your Space settings:
- `PINECONE_API_KEY`: Your Pinecone API Key.

## API Endpoints
- `POST /ingest`: Save a new activity log.
- `POST /recall`: Search for memories.
- `GET /`: Health check.
