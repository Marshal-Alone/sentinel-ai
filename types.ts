export type SentinelMode = 'STUDY' | 'LIFE';

export interface MemoryItem {
  id: string;
  type: 'PDF' | 'TEXT' | 'LINK' | 'VIDEO_LOG';
  title: string;
  content: string; // Base64 for PDF, plain text for others
  mimeType?: string;
  timestamp: number;
  metadata?: {
    platform?: 'YOUTUBE' | 'INSTAGRAM' | 'NETFLIX' | 'CRUNCHYROLL' | 'OTHER';
    url?: string;
    description?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface SentinelState {
  mode: SentinelMode;
  memories: MemoryItem[];
  chatHistory: ChatMessage[];
}