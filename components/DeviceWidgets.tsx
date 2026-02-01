import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Cpu, 
  Database, 
  HardDrive, 
  Monitor, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { Device, HardwareSpecs } from '../types';

export const InfoRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-white text-right">{value || "N/A"}</span>
  </div>
);

export const StorageItem: React.FC<{ drive: HardwareSpecs['storage'][0]; t: any }> = ({ drive, t }) => {
    const [expanded, setExpanded] = useState(false);
    
    const realUsage = drive.usage !== undefined ? Math.round(drive.usage) : 0;
    const usedPercent = realUsage; 
    const freePercent = 100 - usedPercent;

    return (
        <div className="bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden mb-4 last:mb-0 transition-all">
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
                title="Click to toggle details"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${usedPercent > 90 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <HardDrive size={20} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white">{drive.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{drive.size} • {drive.type}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xs text-slate-400">{usedPercent}% Used</div>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full ${usedPercent > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${usedPercent}%` }}></div>
                        </div>
                    </div>
                    {expanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-slate-500">{t.model}</p>
                            <p className="text-sm text-slate-200">{drive.model}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{t.interface}</p>
                            <p className="text-sm text-slate-200">{drive.interface}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{t.health}</p>
                            <div className="flex items-center gap-1.5 mt-0.5" title={`${t.smartStatus}: ${t.healthy || "Good"}`}>
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-sm text-emerald-400 font-medium">{t.healthy || "Good"}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{t.temperature}</p>
                            <p className="text-sm text-slate-200">--</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-500">{t.partitions}</span>
                            <span className="text-xs text-slate-400 font-mono">{drive.interface} ({drive.type})</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex cursor-help" title={`Usage Distribution: ${t.system} ${usedPercent}%, ${t.free} ${freePercent}%`}>
                            <div style={{ width: `${usedPercent}%` }} className={`h-full ${usedPercent > 90 ? 'bg-rose-500' : 'bg-blue-500'}`} />
                            <div style={{ width: `${freePercent}%` }} className="h-full bg-slate-700" />
                        </div>
                        <div className="flex gap-4 mt-2 flex-wrap">
                             <div className="flex items-center gap-1.5" title="Used Space">
                                <div className={`w-2 h-2 rounded-full ${usedPercent > 90 ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                <span className="text-[10px] text-slate-400">{t.system || "Used"} ({usedPercent}%)</span>
                             </div>
                             <div className="flex items-center gap-1.5" title="Free Space">
                                <div className="w-2 h-2 rounded-full bg-slate-700" />
                                <span className="text-[10px] text-slate-400">{t.free || "Free"} ({freePercent}%)</span>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const DeviceHardware: React.FC<{ hardware: HardwareSpecs; t: any }> = ({ hardware, t }) => {
   if (!hardware) return <div className="p-6 text-center text-slate-500">No Hardware Data Available</div>;

   return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
         <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
           <Cpu size={20} className="text-purple-400" /> {t.processor}
         </h3>
         <div className="flex flex-col">
            <InfoRow label={t.model} value={hardware.cpu?.model} />
            <InfoRow label={t.coresThreads} value={`${hardware.cpu?.cores || '?'} / ${hardware.cpu?.threads || '?'}`} />
            <InfoRow label={t.baseSpeed} value={hardware.cpu?.baseSpeed} />
            <InfoRow label={t.architecture} value={hardware.cpu?.architecture} />
         </div>
       </div>
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
         <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
           <Database size={20} className="text-amber-400" /> {t.memoryRam}
         </h3>
         <div className="flex flex-col">
            <InfoRow label={t.totalCapacity} value={hardware.memory?.total} />
            <InfoRow label={t.type} value={hardware.memory?.type} />
            <InfoRow label={t.speed} value={hardware.memory?.speed} />
            <InfoRow label={t.formFactor} value={hardware.memory?.formFactor} />
         </div>
       </div>
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
         <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
           <Monitor size={20} className="text-blue-400" /> {t.graphics}
         </h3>
         <div className="flex flex-col">
            <InfoRow label={t.model} value={hardware.gpu?.model} />
            <InfoRow label={t.vram} value={hardware.gpu?.vram} />
            <InfoRow label={t.driver} value={hardware.gpu?.driver} />
         </div>
       </div>
       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
         <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
           <HardDrive size={20} className="text-emerald-400" /> {t.storage}
         </h3>
         <div className="flex flex-col">
            {hardware.storage?.length > 0 ? (
                hardware.storage.map((drive, i) => (
                    <StorageItem key={i} drive={drive} t={t} />
                ))
            ) : (
                <div className="text-sm text-slate-500 text-center py-2">No storage detected</div>
            )}
         </div>
       </div>
    </div>
   )
}

export const DeviceTerminal: React.FC<{ device: Device }> = ({ device }) => {
  const [history, setHistory] = useState<Array<{ type: 'input' | 'output', content: string }>>([
    { type: 'output', content: `\x1b[32m✔ Connected to ${device.name} (${device.ip})\x1b[0m` },
    { type: 'output', content: `PiMonitor Agent v1.0.3 active` },
    { type: 'output', content: `Type 'help' for available commands.` }
  ]);
  const [commandBuffer, setCommandBuffer] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input when clicking anywhere in terminal
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input.trim();
      if (!cmd) return;

      setHistory(prev => [...prev, { type: 'input' as const, content: cmd }]);
      setCommandBuffer(prev => [...prev, cmd]);
      setHistoryPointer(-1);
      setInput('');

      setTimeout(() => {
        let output = '';
        const args = cmd.split(' ');
        const command = args[0].toLowerCase();

        switch(command) {
            case 'help': 
              output = 'Available commands: help, status, ping, clear, restart-agent, top, df, echo, uname'; 
              break;
            case 'ping': output = 'pong'; break;
            case 'clear': setHistory([]); return;
            case 'status': 
              output = `CPU: ${device.stats.cpuUsage.toFixed(1)}% | Mem: ${device.stats.memoryUsage.toFixed(1)}% | Temp: ${device.stats.temperature.toFixed(1)}°C`; 
              break;
            case 'restart-agent': output = 'Restarting agent service...'; break;
            case 'ls': output = 'pimonitor_agent.py  requirements.txt  logs/  config.json'; break;
            case 'whoami': output = 'root'; break;
            case 'uname': output = `${device.os} ${device.hardware.cpu.architecture}`; break;
            case 'echo': output = args.slice(1).join(' '); break;
            case 'top':
              output = `PID    USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
1024   root      20   0   12.1g   250m   120m S   ${(Math.random()*10).toFixed(1)}   2.1   2:04.22 api-server
1025   root      20   0    8.5g   180m    90m S   ${(Math.random()*5).toFixed(1)}   1.5   1:15.10 worker`;
              break;
            case 'df':
               output = `Filesystem     1K-blocks    Used Available Use% Mounted on
/dev/root       30466688 8455220  20732168  29% /
tmpfs            4046688       0   4046688   0% /dev/shm`;
               break;
            default: output = `bash: ${cmd}: command not found`;
        }
        setHistory(prev => [...prev, { type: 'output' as const, content: output }]);
      }, 100);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandBuffer.length === 0) return;
      const newPointer = historyPointer + 1;
      if (newPointer < commandBuffer.length) {
        setHistoryPointer(newPointer);
        const cmd = commandBuffer[commandBuffer.length - 1 - newPointer];
        setInput(cmd);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPointer > -1) {
        const newPointer = historyPointer - 1;
        setHistoryPointer(newPointer);
        if (newPointer === -1) {
          setInput('');
        } else {
          const cmd = commandBuffer[commandBuffer.length - 1 - newPointer];
          setInput(cmd);
        }
      }
    } else if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        setHistory(prev => [...prev, { type: 'input' as const, content: input + '^C' }]);
        setInput('');
    }
  };

  // Simple parser for colored output (ANSI codes)
  const formatOutput = (text: string) => {
    // Very basic support for green color reset
    const parts = text.split(/(\x1b\[32m|\x1b\[0m)/g);
    return parts.map((part, i) => {
        if (part === '\x1b[32m') return <span key={i} className="text-emerald-400"></span>;
        if (part === '\x1b[0m') return <span key={i} className="text-slate-300"></span>;
        if (parts[i-1] === '\x1b[32m') return <span key={i} className="text-emerald-400">{part}</span>;
        return <span key={i}>{part}</span>;
    });
  };

  return (
    <div 
        className="bg-[#0c0c0c] rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[500px] font-mono text-sm shadow-2xl cursor-text"
        onClick={handleContainerClick}
    >
        <div className="bg-[#1a1a1a] px-4 py-2 border-b border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
                <Terminal size={14} className="text-slate-400" />
                <span className="text-slate-400 text-xs">root@{device.name.toLowerCase().replace(/\s/g, '-')}:~</span>
            </div>
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-['JetBrains_Mono',_monospace]">
            {history.map((entry, i) => (
                <div key={i} className={`${entry.type === 'input' ? 'text-white' : 'text-slate-300'} whitespace-pre-wrap break-words leading-relaxed`}>
                    {entry.type === 'input' && <span className="text-blue-500 mr-2 font-bold">➜  ~</span>}
                    {formatOutput(entry.content)}
                </div>
            ))}
            <div className="flex items-center" ref={bottomRef}>
                 <span className="text-blue-500 mr-2 font-bold">➜  ~</span>
                 <input 
                   ref={inputRef}
                   autoFocus
                   className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 p-0 m-0"
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={handleKeyDown}
                   spellCheck={false}
                   autoComplete="off"
                 />
            </div>
        </div>
    </div>
  );
};
