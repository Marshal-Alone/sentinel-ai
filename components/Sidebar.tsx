import React from 'react';
import { SentinelMode } from '../types';
import { Shield, BookOpen, History } from './Icons';

interface SidebarProps {
  currentMode: SentinelMode;
  setMode: (mode: SentinelMode) => void;
  onClearChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode, onClearChat }) => {
  return (
    <div className="w-20 md:w-64 bg-sentinel-dark border-r border-gray-700 flex flex-col justify-between h-full">
      <div>
        <div className="p-6 flex items-center gap-3">
          <Shield className="w-8 h-8 text-sentinel-primary" />
          <h1 className="hidden md:block text-xl font-bold tracking-wider text-white">SENTINEL</h1>
        </div>
        
        <nav className="mt-8 px-3 space-y-2">
          <button 
            onClick={() => setMode('STUDY')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              currentMode === 'STUDY' 
                ? 'bg-sentinel-primary/20 text-sentinel-primary border border-sentinel-primary/50' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden md:block font-medium">Study Sentinel</span>
          </button>

          <button 
            onClick={() => setMode('LIFE')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              currentMode === 'LIFE' 
                ? 'bg-sentinel-secondary/20 text-sentinel-secondary border border-sentinel-secondary/50' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="hidden md:block font-medium">Life Sentinel</span>
          </button>
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800">
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