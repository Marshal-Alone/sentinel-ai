import React, { useState, useRef } from 'react';
import { SentinelMode, MemoryItem } from '../types';
import { Plus, Trash2, FileText, Youtube, Instagram, Clapperboard, Brain, Search } from './Icons';

interface KnowledgePanelProps {
  mode: SentinelMode;
  memories: MemoryItem[];
  onAddMemory: (memory: MemoryItem) => void;
  onRemoveMemory: (id: string) => void;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ mode, memories, onAddMemory, onRemoveMemory }) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'ADD'>('VIEW');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Form State for Life Log
  const [logTitle, setLogTitle] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logPlatform, setLogPlatform] = useState<any>('YOUTUBE');

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      const newMemory: MemoryItem = {
        id: Date.now().toString(),
        type: 'PDF',
        title: file.name,
        content: base64String,
        mimeType: file.type,
        timestamp: Date.now()
      };
      onAddMemory(newMemory);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // Assume it's from our extension
          let count = 0;
          json.forEach((item: any) => {
            if (item.title && item.url) {
              const newMemory: MemoryItem = {
                id: Date.now().toString() + Math.random().toString().slice(2),
                type: 'LINK',
                title: item.title,
                content: item.content || item.title,
                timestamp: item.timestamp || Date.now(),
                metadata: {
                  platform: item.platform?.includes('youtube') ? 'YOUTUBE' : 'OTHER',
                  url: item.url,
                  description: item.content
                }
              };
              onAddMemory(newMemory);
              count++;
            }
          });
          alert(`Successfully imported ${count} items from Sentinel Eye.`);
          setActiveTab('VIEW');
        }
      } catch (err) {
        alert("Failed to parse JSON. Make sure it's a valid Sentinel export.");
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const handleAddLog = () => {
    if (!logTitle.trim()) return;

    const newMemory: MemoryItem = {
      id: Date.now().toString(),
      type: 'VIDEO_LOG',
      title: logTitle,
      content: logDesc, // Description acts as searchable content
      timestamp: Date.now(),
      metadata: {
        platform: logPlatform,
        description: logDesc
      }
    };
    onAddMemory(newMemory);
    setLogTitle('');
    setLogDesc('');
    setActiveTab('VIEW');
  };

  const filteredMemories = memories.filter(m => 
    mode === 'STUDY' ? m.type === 'PDF' : m.type !== 'PDF'
  );

  return (
    <div className="w-80 bg-sentinel-card border-l border-gray-700 flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-sentinel-text font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-sentinel-primary" />
          {mode === 'STUDY' ? 'Study Materials' : 'Activity Logs'}
        </h2>
        <p className="text-xs text-sentinel-muted mt-1">
          {mode === 'STUDY' ? 'Upload PDFs, notes & PYQs' : 'Track watched content & browsing'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-2 bg-sentinel-dark/50">
        <button 
          onClick={() => setActiveTab('VIEW')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'VIEW' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Memory
        </button>
        <button 
          onClick={() => setActiveTab('ADD')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'ADD' ? 'bg-sentinel-primary text-white' : 'text-gray-400 hover:text-white'}`}
        >
          {mode === 'STUDY' ? 'Upload' : 'Add / Import'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'VIEW' ? (
          <div className="space-y-3">
            {filteredMemories.length === 0 && (
              <div className="text-center text-sentinel-muted text-sm mt-10">
                No memories found.<br/>
                {mode === 'STUDY' ? 'Upload a PDF to start.' : 'Import logs or add manually.'}
              </div>
            )}
            {filteredMemories.map((mem) => (
              <div key={mem.id} className="bg-sentinel-dark p-3 rounded-lg border border-gray-700 group hover:border-sentinel-primary transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 overflow-hidden">
                     {mem.type === 'PDF' ? <FileText className="w-4 h-4 text-blue-400 shrink-0" /> : 
                      mem.metadata?.platform === 'YOUTUBE' ? <Youtube className="w-4 h-4 text-red-500 shrink-0" /> :
                      mem.metadata?.platform === 'INSTAGRAM' ? <Instagram className="w-4 h-4 text-pink-500 shrink-0" /> :
                      <Clapperboard className="w-4 h-4 text-purple-400 shrink-0" />
                     }
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium text-sm text-gray-200 truncate">{mem.title}</span>
                        {mem.metadata?.url && (
                             <a href={mem.metadata.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline truncate">
                                {mem.metadata.url}
                             </a>
                        )}
                    </div>
                  </div>
                  <button onClick={() => onRemoveMemory(mem.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {mem.metadata?.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{mem.metadata.description}</p>
                )}
                <div className="text-[10px] text-gray-500 mt-2 text-right">
                  {new Date(mem.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* STUDY MODE UPLOAD */}
            {mode === 'STUDY' && (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-sentinel-primary transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-300">Click to upload PDF</p>
                <p className="text-xs text-gray-500 mt-1">Lecture notes, Textbooks, PYQs</p>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handlePdfUpload} 
                />
              </div>
            )}

            {/* LIFE MODE IMPORT */}
            {mode === 'LIFE' && (
                <div className="space-y-6">
                    {/* JSON Import Section */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                             <Search className="w-4 h-4 text-sentinel-secondary" />
                             Import Extension Data
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">
                            Upload the <code>sentinel_history.json</code> file from your Chrome Extension to sync your browsing history.
                        </p>
                        <button 
                             onClick={() => jsonInputRef.current?.click()}
                             className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 rounded-md text-xs font-medium transition-colors border border-gray-600"
                        >
                            Select JSON File
                        </button>
                        <input 
                            type="file" 
                            accept=".json" 
                            ref={jsonInputRef} 
                            className="hidden" 
                            onChange={handleJsonUpload} 
                        />
                    </div>

                    <div className="relative flex items-center">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">OR MANUAL ENTRY</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>

                    {/* Manual Form */}
                    <div className="space-y-3">
                        <div>
                        <label className="text-xs text-gray-400 block mb-1">Platform</label>
                        <select 
                            value={logPlatform}
                            onChange={(e) => setLogPlatform(e.target.value)}
                            className="w-full bg-sentinel-dark border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-sentinel-secondary"
                        >
                            <option value="YOUTUBE">YouTube</option>
                            <option value="INSTAGRAM">Instagram (Reels)</option>
                            <option value="NETFLIX">Netflix/Streaming</option>
                            <option value="CRUNCHYROLL">Anime</option>
                            <option value="OTHER">Other</option>
                        </select>
                        </div>
                        <div>
                        <label className="text-xs text-gray-400 block mb-1">Title / Show</label>
                        <input 
                            type="text" 
                            value={logTitle}
                            onChange={(e) => setLogTitle(e.target.value)}
                            placeholder="e.g. One Piece Ep 1071" 
                            className="w-full bg-sentinel-dark border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-sentinel-secondary"
                        />
                        </div>
                        <div>
                        <label className="text-xs text-gray-400 block mb-1">Context / Description</label>
                        <textarea 
                            value={logDesc}
                            onChange={(e) => setLogDesc(e.target.value)}
                            placeholder="e.g. Gear 5 reveal, drums of liberation scene..." 
                            rows={3}
                            className="w-full bg-sentinel-dark border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-sentinel-secondary resize-none"
                        />
                        </div>
                        <button 
                            onClick={handleAddLog}
                            className="w-full bg-sentinel-secondary hover:bg-purple-600 text-white py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Add Manual Entry
                        </button>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgePanel;