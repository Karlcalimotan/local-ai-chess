import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';
import { Terminal, Trash2 } from 'lucide-react';
import { retroAudio } from '../utils/audio';

interface TerminalLogProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs, onClearLogs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'system' | 'ai' | 'action'>('all');

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, filter]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'system') return log.type === 'system' || log.type === 'warning' || log.type === 'success';
    if (filter === 'ai') return log.type === 'ai-thought' || log.type === 'ai-action';
    if (filter === 'action') return log.type === 'player-action' || log.type === 'ai-action';
    return true;
  });

  const getTagStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'system':
        return { text: 'SYS', color: 'bg-zinc-800 text-zinc-300' };
      case 'ai-thought':
        return { text: 'THK', color: 'bg-purple-950/60 text-purple-300 border border-purple-800/50' };
      case 'ai-action':
        return { text: 'AI_MOVE', color: 'bg-blue-950/60 text-blue-300 border border-blue-800/50' };
      case 'player-action':
        return { text: 'PLAYER', color: 'bg-amber-950/60 text-amber-300 border border-amber-800/50' };
      case 'warning':
        return { text: 'WARN', color: 'bg-rose-950/60 text-rose-300 border border-rose-800/50' };
      case 'success':
        return { text: 'SUCCESS', color: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' };
      default:
        return { text: 'LOG', color: 'bg-zinc-900 text-zinc-400' };
    }
  };

  const handleClear = () => {
    retroAudio.playClick();
    onClearLogs();
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col font-mono text-xs text-zinc-300 shadow-xl relative overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 select-none relative z-10">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-emerald-400" />
          <span className="font-sans font-semibold text-xs tracking-wider text-zinc-200">
            System Console Logs
          </span>
        </div>
        
        {/* Modern Filter controls */}
        <div className="flex items-center gap-1.5 text-[10px] font-sans">
          {(['all', 'system', 'ai', 'action'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                retroAudio.playClick();
                setFilter(type);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                filter === type
                  ? 'bg-zinc-800 text-white border-zinc-700'
                  : 'bg-transparent text-zinc-400 border-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="ml-1 bg-transparent border border-zinc-800 rounded-lg p-1.5 text-zinc-400 hover:text-rose-450 hover:bg-rose-950/30 hover:border-rose-905/50 transition-all cursor-pointer"
            title="Clear logs"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Modern Console Logs display */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[160px] scrollbar-thin font-mono"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-500 italic text-[11px] py-6 text-center">
            No system log items to display
          </div>
        ) : (
          filteredLogs.map(log => {
            const tag = getTagStyle(log.type);
            return (
              <div key={log.id} className="leading-5 flex items-start gap-2 text-[11px]">
                <span className="text-zinc-650 select-none font-mono flex-shrink-0">
                  {log.timestamp}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase select-none flex-shrink-0 ${tag.color}`}>
                  {tag.text}
                </span>
                <span className="text-zinc-200">{log.text}</span>
              </div>
            );
          })
        )}
        {/* Small pulsing cursor line */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-600 select-none font-mono">
            {new Date().toLocaleTimeString().split(' ')[0]}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-zinc-800 text-zinc-400 select-none">IDLE</span>
          <span className="w-1.5 h-3.5 bg-zinc-400 animate-pulse ml-0.5 inline-block" />
        </div>
      </div>
    </div>
  );
};

export default TerminalLog;
