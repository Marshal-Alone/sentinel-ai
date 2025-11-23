import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import KnowledgePanel from './components/KnowledgePanel';
import { SentinelMode, MemoryItem, ChatMessage } from './types';
import { generateSentinelResponse } from './services/geminiService';
import { brainService } from './services/brainService';
import { Send, Shield, Brain } from './components/Icons';

// Helper to format Markdown-like text simply
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split('\n');

  const renderLine = (line: string, idx: number) => {
    // Check for markdown links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const partsWithLinks = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        partsWithLinks.push(line.substring(lastIndex, match.index));
      }
      partsWithLinks.push(
        <a key={`${idx}-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          {match[1]}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }
    if (lastIndex < line.length) {
      partsWithLinks.push(line.substring(lastIndex));
    }

    const content = partsWithLinks.length > 0 ? partsWithLinks : [line];

    if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-white">{line.replace('### ', '')}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={idx} className="font-bold mb-2">{line.replace(/\*\*/g, '')}</p>;
    if (line.startsWith('- ')) return <li key={idx} className="ml-4 mb-1">{content}</li>;
    return <p key={idx} className="mb-2 min-h-[1.2em]">{content}</p>;
  };

  return (
    <div className="markdown-body text-sm md:text-base leading-relaxed break-words">
      {parts.map((line, idx) => renderLine(line, idx))}
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = useState<SentinelMode>('STUDY');

  // Data Persistence using LocalStorage
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('sentinel_memories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return [] }
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Brain Status
  const [brainOnline, setBrainOnline] = useState(false);

  // Check for Python Backend on mount AND fetch memories
  useEffect(() => {
    const checkBrain = async () => {
      const isOnline = await brainService.checkHealth();
      setBrainOnline(isOnline);

      if (isOnline) {
        // Fetch all memories from the cloud to populate the sidebar
        const cloudMemories = await brainService.fetchAll();
        if (cloudMemories.length > 0) {
          const mappedCloudMemories: MemoryItem[] = cloudMemories.map((bm, idx) => ({
            id: bm.metadata?.url || `cloud-${idx}`, // Use URL as ID to dedupe
            type: 'VIDEO_LOG',
            title: bm.metadata.title,
            content: bm.content,
            timestamp: new Date(bm.metadata.time).getTime(),
            metadata: {
              url: bm.metadata.url,
              platform: bm.metadata.url.includes('youtube') ? 'YOUTUBE' : 'OTHER',
              description: bm.content.substring(0, 100)
            }
          }));

          setMemories(prev => {
            const existingIds = new Set(prev.map(m => m.metadata?.url || m.id));
            const newMemories = mappedCloudMemories.filter(bm => !existingIds.has(bm.metadata?.url));
            return [...newMemories, ...prev];
          });
        }
      }
    };
    checkBrain();
    const interval = setInterval(checkBrain, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  // Save memories whenever they change
  useEffect(() => {
    localStorage.setItem('sentinel_memories', JSON.stringify(memories));
  }, [memories]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleAddMemory = (memory: MemoryItem) => {
    setMemories(prev => [memory, ...prev]);
  };

  const handleRemoveMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let activeMemories = memories;

      // If in LIFE mode, try to fetch relevant memories from Python Brain
      if (mode === 'LIFE' && brainOnline) {
        console.log("Fetching from Brain...");
        const brainMemories = await brainService.recall(userMsg.text);
        // Map Brain Memory to App MemoryItem
        const mappedBrainMemories: MemoryItem[] = brainMemories.map((bm, idx) => ({
          id: `brain-${idx}-${Date.now()}`,
          type: 'VIDEO_LOG',
          title: bm.metadata.title,
          content: bm.content,
          timestamp: new Date(bm.metadata.time).getTime(),
          metadata: {
            url: bm.metadata.url,
            platform: bm.metadata.url.includes('youtube') ? 'YOUTUBE' : 'OTHER',
            description: bm.content.substring(0, 100)
          }
        }));

        // Combine local manual logs with brain results
        const localLogs = memories.filter(m => m.type !== 'PDF'); // Keep manual logs
        activeMemories = [...localLogs, ...mappedBrainMemories];

        // VISUALIZE: Add Brain memories to the Sidebar so the user can see them
        setMemories(prev => {
          const existingIds = new Set(prev.map(m => m.metadata?.url || m.id));
          const newMemories = mappedBrainMemories.filter(bm => !existingIds.has(bm.metadata?.url));
          return [...newMemories, ...prev];
        });

        // DEBUG: Notify user of brain activity
        setChatHistory(prev => [...prev, {
          id: Date.now().toString() + '-debug',
          role: 'model',
          text: `*System Debug:* Found ${mappedBrainMemories.length} relevant memories in the Brain. Added them to your sidebar.`,
          timestamp: Date.now()
        }]);
      }

      const responseText = await generateSentinelResponse(
        userMsg.text,
        chatHistory,
        mode,
        activeMemories
      );

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "My systems encountered a critical error. Please try again.",
        timestamp: Date.now(),
        isError: true
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const modeColor = mode === 'STUDY' ? 'text-sentinel-primary' : 'text-sentinel-secondary';
  const modeBg = mode === 'STUDY' ? 'bg-sentinel-primary' : 'bg-sentinel-secondary';

  return (
    <div className="flex h-screen bg-sentinel-dark overflow-hidden">
      <Sidebar
        currentMode={mode}
        setMode={setMode}
        onClearChat={handleClearChat}
        memories={memories}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-sentinel-dark/95 backdrop-blur z-10 shrink-0">
          <div>
            <h2 className={`text-lg font-bold ${modeColor} tracking-wide flex items-center gap-2`}>
              {mode} SENTINEL <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-normal">Active</span>
            </h2>
            <p className="text-xs text-gray-500">
              {mode === 'STUDY' ? 'Connected to Knowledge Base' : 'Monitoring Activity Logs'}
            </p>
          </div>

          {mode === 'LIFE' && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${brainOnline ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-gray-600 bg-gray-800 text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${brainOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-xs font-medium uppercase tracking-wider">
                {brainOnline ? 'Brain Online' : 'Local Storage'}
              </span>
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
              {mode === 'STUDY' ? <Shield className="w-16 h-16 mb-4 text-blue-900" /> : <Brain className="w-16 h-16 mb-4 text-purple-900" />}
              <h3 className="text-xl font-medium text-gray-400">
                Sentinel Systems Online
              </h3>
              <p className="max-w-md text-center mt-2 text-sm">
                {mode === 'STUDY'
                  ? "Upload your PDFs and Notes on the right. Ask me to explain concepts, summarize, or solve PYQs."
                  : brainOnline
                    ? "I am connected to your Python Brain (ChromaDB). I can search your YouTube transcripts and watch history deep memory."
                    : "I am using your browser's local storage. Import logs on the right or run the Python backend for deep search."}
              </p>
            </div>
          ) : (
            chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-lg ${msg.role === 'user'
                    ? `${modeBg} text-white rounded-br-none`
                    : 'bg-sentinel-card border border-gray-700 text-gray-200 rounded-bl-none'
                    }`}
                >
                  <SimpleMarkdown text={msg.text} />
                  {msg.isError && <span className="text-red-300 text-xs mt-2 block">System Failure</span>}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-sentinel-card border border-gray-700 rounded-2xl p-4 rounded-bl-none flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${modeBg} animate-bounce`}></div>
                <div className={`w-2 h-2 rounded-full ${modeBg} animate-bounce delay-75`}></div>
                <div className={`w-2 h-2 rounded-full ${modeBg} animate-bounce delay-150`}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-sentinel-dark border-t border-gray-700 shrink-0">
          <div className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${mode === 'STUDY' ? 'about your documents...' : 'about your history...'}`}
              className="w-full bg-sentinel-card text-white pl-4 pr-12 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 border border-gray-700 placeholder-gray-500 shadow-xl transition-all focus:ring-sentinel-primary"
              style={{
                borderColor: mode === 'STUDY' ? '#3b82f640' : '#8b5cf640'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className={`absolute right-2 top-2 p-2 rounded-lg transition-colors ${input.trim()
                ? `${mode === 'STUDY' ? 'text-blue-400 hover:bg-blue-900/30' : 'text-purple-400 hover:bg-purple-900/30'}`
                : 'text-gray-600'
                }`}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-2">
            Sentinel AI {mode === 'LIFE' && brainOnline ? '+ ChromaDB ' : ''}may display inaccurate info.
          </p>
        </div>
      </div>

      {/* Right Panel (Knowledge Base) */}
      <KnowledgePanel
        mode={mode}
        memories={memories}
        onAddMemory={handleAddMemory}
        onRemoveMemory={handleRemoveMemory}
      />
    </div>
  );
};

export default App;