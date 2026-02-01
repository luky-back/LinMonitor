import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { 
  Terminal as TerminalIcon, 
  Cpu, 
  Database, 
  HardDrive, 
  Monitor, 
  ChevronDown, 
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Device, HardwareSpecs } from '../types';
import { api } from '../services/api';

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
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const intervalRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#020617', // Slate 950
        foreground: '#e2e8f0', // Slate 200
        cursor: '#10b981', // Emerald 500
      },
      convertEol: true, // Handle line endings gracefully
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln(`\x1b[1;34m[PiMonitor]\x1b[0m Connecting to ${device.name} (${device.ip})...`);

    // Handle Resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    // Initial connection attempt
    const connect = async () => {
        try {
            await fetch(`${api.getBaseUrl()}/terminal/${device.id}/start`, { method: 'POST' });
            setIsConnected(true);
            term.writeln(`\x1b[1;32m[PiMonitor]\x1b[0m Connected! Interactive session active.`);
            term.writeln('');
        } catch (e) {
            term.writeln(`\x1b[1;31m[Error]\x1b[0m Failed to start terminal session.`);
        }
    };
    connect();

    // Input Handler (Frontend -> Backend)
    term.onData(async (data) => {
        if (!isConnected) return;
        try {
            await fetch(`${api.getBaseUrl()}/terminal/${device.id}/input`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
        } catch (e) {
            console.error("Failed to send keystroke", e);
        }
    });

    // Output Polling (Backend -> Frontend)
    // Using simple short polling for "real-time" feel without WebSockets complexity in this setup
    intervalRef.current = setInterval(async () => {
        try {
            const res = await fetch(`${api.getBaseUrl()}/terminal/${device.id}/output`);
            if (res.ok) {
                const data = await res.json();
                if (data.output) {
                    term.write(data.output);
                }
            }
        } catch (e) {
            // silent fail on poll
        }
    }, 200); // 200ms poll

    return () => {
        window.removeEventListener('resize', handleResize);
        if (intervalRef.current) clearInterval(intervalRef.current);
        term.dispose();
    };
  }, [device.id]);

  const restartSession = async () => {
      if (xtermRef.current) {
          xtermRef.current.reset();
          xtermRef.current.writeln(`\x1b[1;33m[PiMonitor]\x1b[0m Restarting session...`);
          try {
            await fetch(`${api.getBaseUrl()}/terminal/${device.id}/start`, { method: 'POST' });
            xtermRef.current.writeln(`\x1b[1;32m[PiMonitor]\x1b[0m Session reset.`);
          } catch (e) {
            xtermRef.current.writeln(`\x1b[1;31m[Error]\x1b[0m Failed to restart.`);
          }
      }
  };

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[500px] shadow-2xl relative group">
        <div className="bg-slate-900/50 p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <TerminalIcon size={14} className="text-emerald-500" />
                <span className="text-slate-400 font-mono text-sm">ssh://{device.name}</span>
            </div>
            <button 
                onClick={restartSession}
                className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors" 
                title="Restart Session"
            >
                <RefreshCw size={14} />
            </button>
        </div>
        <div className="flex-1 relative bg-[#020617] p-2">
            <div ref={terminalRef} className="absolute inset-0" />
        </div>
    </div>
  );
};
