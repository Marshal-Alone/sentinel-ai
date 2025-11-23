import React, { useState } from 'react';
import { SentinelMode, MemoryItem } from '../types';
import { Shield, BookOpen, History } from './Icons';

interface SidebarProps {
  currentMode: SentinelMode;
  setMode: (mode: SentinelMode) => void;
  onClearChat: () => void;
  memories: MemoryItem[];
  onDeleteMemories: (ids: string[]) => void;
  onDeleteAll: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode, onClearChat, memories, onDeleteMemories, onDeleteAll }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Group memories by platform
  const groupedMemories = memories.reduce((acc, mem) => {
    const platform = mem.metadata?.platform || 'OTHER';
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(mem);
    return acc;
  }, {} as Record<string, MemoryItem[]>);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} memories?`)) {
      onDeleteMemories(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
  };

  const handleDeleteAll = () => {
    if (confirm("WARNING: This will delete ALL memories from your Cloud Brain. This cannot be undone. Are you sure?")) {
      onDeleteAll();
    }
  };

  return (
    <div className="w-20 md:w-64 bg-sentinel-dark border-r border-gray-700 flex flex-col justify-between h-full overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-6 flex items-center gap-3 shrink-0">
          <Shield className="w-8 h-8 text-sentinel-primary" />
          <h1 className="hidden md:block text-xl font-bold tracking-wider text-white">SENTINEL</h1>
        </div>

        <nav className="mt-4 px-3 space-y-2 shrink-0">
          <button
            onClick={() => setMode('STUDY')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentMode === 'STUDY'
              ? 'bg-sentinel-primary/20 text-sentinel-primary border border-sentinel-primary/50'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden md:block font-medium">Study Sentinel</span>
          </button>

          <button
            onClick={() => setMode('LIFE')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentMode === 'LIFE'
              ? 'bg-sentinel-secondary/20 text-sentinel-secondary border border-sentinel-secondary/50'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <History className="w-5 h-5" />
            <span className="hidden md:block font-medium">Life Sentinel</span>
          </button>
        </nav>

        {/* Memory Bank Section */}
        <div className="mt-6 px-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3 hidden md:flex">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Memory Bank ({memories.length})
            </h3>
            <div className="flex gap-2">
              {isSelectionMode ? (
                <button
                  onClick={() => setIsSelectionMode(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Select
                </button>
              )}
            </div>
          </div>

          {isSelectionMode && (
            <div className="flex gap-2 mb-3 hidden md:flex">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className={`flex-1 py-1 text-xs rounded border ${selectedIds.size > 0 ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30' : 'border-gray-700 text-gray-600 cursor-not-allowed'}`}
              >
                Delete ({selectedIds.size})
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 py-1 text-xs rounded border border-red-900/50 text-red-900 hover:bg-red-900/20 hover:text-red-500"
              >
                Delete All
              </button>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(groupedMemories).map(([platform, items]) => (
              <div key={platform}>
                <h4 className="text-xs font-medium text-gray-400 mb-2 px-2 hidden md:block">{platform}</h4>
                <div className="space-y-1">
                  {items.map(mem => (
                    <div key={mem.id} className="flex items-center gap-2 group">
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(mem.id)}
                          onChange={() => toggleSelection(mem.id)}
                          className="rounded border-gray-600 bg-gray-800 text-sentinel-secondary focus:ring-0"
                        />
                      )}
                      <a
                        href={mem.metadata?.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block flex-1 px-3 py-2 rounded-lg hover:bg-white/5 text-left ${selectedIds.has(mem.id) ? 'bg-white/10' : ''}`}
                        title={mem.title}
                      >
                        <div className="text-sm text-gray-300 truncate group-hover:text-white transition-colors">
                          {mem.title || 'Untitled Memory'}
                        </div>
                        <div className="text-[10px] text-gray-600 truncate">
                          {new Date(mem.timestamp).toLocaleDateString()}
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {memories.length === 0 && (
              <div className="text-xs text-gray-600 italic px-2">
                No memories synced yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 shrink-0">
        <button
          onClick={onClearChat}
          className="w-full flex items-center justify-center md:justify-start gap-2 text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span className="hidden md:block text-sm">Clear Chat</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;