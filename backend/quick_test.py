from youtube_transcript_api import YouTubeTranscriptApi

# Test the API with a popular video (Rick Roll - always has captions)
try:
    api = YouTubeTranscriptApi()
    result = api.fetch('dQw4w9WgXcQ')
    data = result.to_raw_data()
    
    print(f"✅ SUCCESS! YouTube Transcript API is working!")
    print(f"Got {len(data)} transcript segments")
    print(f"First segment: {data[0]['text']}")
    print(f"\nTotal text length: {len(' '.join([d['text'] for d in data]))} characters")
    
except Exception as e:
    print(f"❌ FAILED: {e}")
