import React, { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { 
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
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize XTerm
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      theme: {
        background: '#0c0c0c',
        foreground: '#f1f5f9',
        cursor: '#3b82f6',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
      },
      convertEol: true, // Treat \n as \r\n
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome Message
    term.writeln('\x1b[32m✔ Connected to ' + device.name + ' (' + device.ip + ')\x1b[0m');
    term.writeln('PiMonitor Agent v1.0.3 active');
    term.writeln("Type 'help' for available commands.");
    term.write('\r\n$ ');

    let commandBuffer = '';

    term.onData(e => {
      switch (e) {
        case '\r': // Enter
          term.write('\r\n');
          processCommand(commandBuffer, term, device);
          commandBuffer = '';
          term.write('$ ');
          break;
        case '\u007F': // Backspace
          if (commandBuffer.length > 0) {
            term.write('\b \b');
            commandBuffer = commandBuffer.slice(0, -1);
          }
          break;
        default:
          if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E)) {
             commandBuffer += e;
             term.write(e);
          }
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [device]);

  const processCommand = (cmd: string, term: XTerm, device: Device) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const args = trimmed.split(' ');
    const command = args[0].toLowerCase();

    switch(command) {
        case 'help': 
          term.writeln('Available commands: help, status, ping, clear, restart-agent, top, df, echo, uname'); 
          break;
        case 'ping': term.writeln('pong'); break;
        case 'clear': term.clear(); break;
        case 'status': 
          term.writeln(`CPU: ${device.stats.cpuUsage.toFixed(1)}% | Mem: ${device.stats.memoryUsage.toFixed(1)}% | Temp: ${device.stats.temperature.toFixed(1)}°C`); 
          break;
        case 'restart-agent': term.writeln('Restarting agent service...'); break;
        case 'ls': term.writeln('pimonitor_agent.py  requirements.txt  logs/  config.json'); break;
        case 'whoami': term.writeln('root'); break;
        case 'uname': term.writeln(`${device.os} ${device.hardware.cpu.architecture}`); break;
        case 'echo': term.writeln(args.slice(1).join(' ')); break;
        case 'top':
          term.writeln(`PID    USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND`);
          term.writeln(`1024   root      20   0   12.1g   250m   120m S   ${(Math.random()*10).toFixed(1)}   2.1   2:04.22 api-server`);
          term.writeln(`1025   root      20   0    8.5g   180m    90m S   ${(Math.random()*5).toFixed(1)}   1.5   1:15.10 worker`);
          break;
        case 'df':
           term.writeln(`Filesystem     1K-blocks    Used Available Use% Mounted on`);
           term.writeln(`/dev/root       30466688 8455220  20732168  29% /`);
           term.writeln(`tmpfs            4046688       0   4046688   0% /dev/shm`);
           break;
        default: term.writeln(`bash: ${cmd}: command not found`);
    }
  };

  return (
    <div className="bg-[#0c0c0c] rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[500px] shadow-2xl">
        <div className="bg-[#1a1a1a] px-4 py-2 border-b border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
                <div className="text-slate-400 text-xs">root@{device.name.toLowerCase().replace(/\s/g, '-')}:~</div>
            </div>
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            </div>
        </div>
        <div className="flex-1 relative">
            <div ref={terminalRef} className="absolute inset-0 p-2" />
        </div>
    </div>
  );
};
