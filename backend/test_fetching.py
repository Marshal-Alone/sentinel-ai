#!/usr/bin/env python3
"""
Debug script to test YouTube and Instagram/TikTok content fetching
Run this to verify that transcript/caption extraction is working properly
"""

from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp

def test_youtube(video_url='https://www.youtube.com/watch?v=tkJdbRDtktk'):
    """Test YouTube transcript fetching"""
    print("\n" + "="*70)
    print("🎥 TESTING YOUTUBE TRANSCRIPT FETCHING")
    print("="*70)
    print(f"URL: {video_url}")
    
    # Extract video ID
    def get_video_id(url):
        if "v=" in url:
            return url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            return url.split("youtu.be/")[1]
        return None
    
    vid_id = get_video_id(video_url)
    print(f"Video ID: {vid_id}")
    
    if not vid_id:
        print("❌ Failed to extract video ID")
        return
    
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        # Use new API
        ytt_api = YouTubeTranscriptApi()
        fetched_transcript = ytt_api.fetch(vid_id)
        transcript_data = fetched_transcript.to_raw_data()
        full_text = " ".join([t['text'] for t in transcript_data])
        
        print(f"\n✅ SUCCESS!")
        print(f"Transcript segments: {len(transcript_data)}")
        print(f"Total characters: {len(full_text)}")
        print(f"\nFirst 500 characters:")
        print("-" * 70)
        print(full_text[:500])
        print("-" * 70)
        
        return full_text
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("Possible reasons:")
        print("  - Video has no subtitles/captions")
        print("  - Subtitles are disabled")
        print("  - Video is private/deleted")
        return None


def test_instagram(media_url='https://www.instagram.com/reels/DRUa-h_kkQ1/'):
    """Test Instagram/TikTok metadata fetching"""
    print("\n" + "="*70)
    print("📱 TESTING INSTAGRAM/TIKTOK FETCHING")
    print("="*70)
    print(f"URL: {media_url}")
    
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'no_warnings': True,
        'ignoreerrors': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'en-US'],
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("\nFetching metadata...")
            info = ydl.extract_info(media_url, download=False)
            
            if not info:
                print("❌ No info returned")
                return None
            
            print(f"\n✅ SUCCESS!")
            
            # Extract all relevant fields
            title = info.get('title', 'N/A')
            uploader = info.get('uploader', 'N/A')
            description = info.get('description', 'N/A')
            duration = info.get('duration', 'N/A')
            subtitles = info.get('subtitles', {})
            auto_captions = info.get('automatic_captions', {})
            
            print(f"\nUploader: {uploader}")
            print(f"Title: {title}")
            print(f"Duration: {duration}s")
            print(f"\nDescription/Caption:")
            print("-" * 70)
            print(description[:500] if description else "(No description)")
            print("-" * 70)
            
            print(f"\nSubtitles available: {list(subtitles.keys()) if subtitles else 'None'}")
            print(f"Auto-captions available: {list(auto_captions.keys()) if auto_captions else 'None'}")
            
            # Build full context
            full_context = f"Reel by {uploader}: {title}\n\nCaption/Description:\n{description}"
            
            if subtitles or auto_captions:
                print("\n📝 Note: Subtitles detected but not downloaded (requires extra parsing)")
            
            return full_context
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("Possible reasons:")
        print("  - Video is private")
        print("  - URL format not supported")
        print("  - Network/rate limiting issue")
        return None


if __name__ == "__main__":
    print("\n" + "="*70)
    print("SENTINEL AI - CONTENT FETCHING DEBUG TOOL")
    print("="*70)
    
    # Test YouTube
    print("\n1️⃣  TESTING YOUTUBE")
    youtube_test_url = input("Enter a YouTube URL (or press Enter to skip): ").strip()
    
    if youtube_test_url:
        test_youtube(youtube_test_url)
    else:
        print("Skipped YouTube test")
    
    # Test Instagram
    print("\n\n2️⃣  TESTING INSTAGRAM")
    insta_test_url = input("Enter an Instagram Reel  URL (or press Enter to skip): ").strip()
    
    if insta_test_url:
        test_instagram(insta_test_url)
    else:
        print("Skipped Instagram/TikTok test")
    
    print("\n" + "="*70)
    print("TESTING COMPLETE")
    print("="*70)
    print("\nIf you see errors, make sure you have installed:")
    print("  pip install youtube-transcript-api yt-dlp")
    print("\n")
