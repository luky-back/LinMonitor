import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Terminal, 
  Cpu, 
  Database, 
  Wifi, 
  Trash2,
  Edit2,
  Copy,
  Check,
  Play,
  Square,
  Server,
  Activity,
  MoreVertical,
  Lock,
  HardDrive,
  Search,
  X,
  Download,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Device, PM2Process, AppSettings, ProcessAction } from '../types';
import { translations } from '../translations';
import { DeviceHardware, DeviceTerminal } from '../components/DeviceWidgets';

interface DevicesProps {
  devices: Device[];
  onRenameDevice: (id: string, name: string) => void;
  onRenameProcess: (deviceId: string, processId: number, name: string) => void;
  onRemoveDevice: (id: string) => void;
  onProcessAction: (deviceId: string, processId: number, action: ProcessAction) => void;
  language: string;
  settings: AppSettings;
}

const accentTextMap: Record<string, string> = {
  blue: 'text-blue-400 group-hover:text-blue-300',
  purple: 'text-purple-400 group-hover:text-purple-300',
  emerald: 'text-emerald-400 group-hover:text-emerald-300',
  amber: 'text-amber-400 group-hover:text-amber-300',
  rose: 'text-rose-400 group-hover:text-rose-300',
  indigo: 'text-indigo-400 group-hover:text-indigo-300',
  orange: 'text-orange-400 group-hover:text-orange-300',
};

const accentBgMap: Record<string, string> = {
  blue: 'bg-blue-600 hover:bg-blue-500',
  purple: 'bg-purple-600 hover:bg-purple-500',
  emerald: 'bg-emerald-600 hover:bg-emerald-500',
  amber: 'bg-amber-600 hover:bg-amber-500',
  rose: 'bg-rose-600 hover:bg-rose-500',
  indigo: 'bg-indigo-600 hover:bg-indigo-500',
  orange: 'bg-orange-600 hover:bg-orange-500',
};

const accentBorderMap: Record<string, string> = {
  blue: 'border-blue-600/20 bg-blue-600/10',
  purple: 'border-purple-600/20 bg-purple-600/10',
  emerald: 'border-emerald-600/20 bg-emerald-600/10',
  amber: 'border-amber-600/20 bg-amber-600/10',
  rose: 'border-rose-600/20 bg-rose-600/10',
  indigo: 'border-indigo-600/20 bg-indigo-600/10',
  orange: 'border-orange-600/20 bg-orange-600/10',
};

const activeTabMap: Record<string, string> = {
  blue: 'bg-slate-700 text-white shadow-sm ring-1 ring-blue-500/50',
  purple: 'bg-slate-700 text-white shadow-sm ring-1 ring-purple-500/50',
  emerald: 'bg-slate-700 text-white shadow-sm ring-1 ring-emerald-500/50',
  amber: 'bg-slate-700 text-white shadow-sm ring-1 ring-amber-500/50',
  rose: 'bg-slate-700 text-white shadow-sm ring-1 ring-rose-500/50',
  indigo: 'bg-slate-700 text-white shadow-sm ring-1 ring-indigo-500/50',
  orange: 'bg-slate-700 text-white shadow-sm ring-1 ring-orange-500/50',
};

const AddDeviceModal: React.FC<{ isOpen: boolean; onClose: () => void; t: any }> = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
             <div className="space-y-1">
                 <h2 className="text-xl font-bold text-white">{t.addDevice}</h2>
                 <p className="text-sm text-slate-400">{t.deployAgent}</p>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-white">
               <X size={24} />
             </button>
          </div>
          
          <div className="grid gap-6">
            <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">1</div>
                    <h3 className="font-semibold text-white">Setup Backend Server</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    Run the provided setup script on your host machine to start the telemetry API.
                </p>
                <div className="flex items-center gap-2 p-3 bg-slate-900 rounded border border-slate-800 font-mono text-sm text-blue-300">
                    <Terminal size={16} />
                    <span>python3 setup_server.py</span>
                </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">2</div>
                    <h3 className="font-semibold text-white">Setup Device Agent</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    Copy the <code>setup_device.py</code> file to your target device (Raspberry Pi / Server) and run it.
                </p>
                <div className="flex items-center gap-2 p-3 bg-slate-900 rounded border border-slate-800 font-mono text-sm text-emerald-300">
                    <Terminal size={16} />
                    <span>python3 setup_device.py</span>
                </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-200 flex gap-3">
                <Download size={20} className="shrink-0" />
                <div>
                    <strong>Download Scripts:</strong> Check the project root directory for <code>setup_server.py</code> and <code>setup_device.py</code>.
                </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium">
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};

const RemoveDeviceModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; deviceName: string; t: any }> = ({ isOpen, onClose, onConfirm, deviceName, t }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.confirmRemoveTitle}</h2>
              <p className="text-sm text-slate-400 mt-1">{t.confirmRemoveBody}</p>
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-sm text-slate-300 font-medium text-center">
            "{deviceName}"
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium transition-colors">{t.cancel}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 font-medium shadow-lg shadow-rose-900/20 transition-colors">{t.confirm}</button>
        </div>
      </div>
    </div>
  );
};

interface ProcessRowProps {
  process: PM2Process;
  deviceId: string;
  onRename: any;
  onAction: (deviceId: string, pid: number, action: ProcessAction) => void;
  isMenuOpen: boolean;
  onToggleMenu: (pid: number) => void;
  onCloseMenu: () => void;
  compact: boolean;
  t: any;
}

const ProcessRow: React.FC<ProcessRowProps> = ({ 
  process, 
  deviceId, 
  onRename, 
  onAction,
  isMenuOpen, 
  onToggleMenu, 
  onCloseMenu,
  compact,
  t
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(process.name);
  const [localActionState, setLocalActionState] = useState<'idle' | 'restarting' | 'stopping' | 'starting'>('idle');
  const [showLogs, setShowLogs] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRename(deviceId, process.pid, name);
    setIsEditing(false);
  };

  const handleAction = (action: ProcessAction) => {
    onCloseMenu();
    setLocalActionState(action === 'stop' ? 'stopping' : action === 'start' ? 'starting' : 'restarting');
    onAction(deviceId, process.pid, action);
    setTimeout(() => setLocalActionState('idle'), 2000);
  };

  const padY = compact ? 'py-2' : 'py-4';

  return (
    <>
      <tr className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors relative ${showLogs ? 'bg-slate-800/30' : ''}`}>
        <td className={`${padY} pl-4`}>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowLogs(!showLogs)} 
                className="text-slate-500 hover:text-white transition-colors"
                title="View Logs"
             >
                {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>
            <div className={`w-2 h-2 rounded-full ${
              process.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
              process.status === 'stopped' ? 'bg-slate-500' : 'bg-rose-500'
            }`} />
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <input 
                  autoFocus
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSubmit}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </form>
            ) : (
              <span 
                className="font-medium text-slate-200 cursor-pointer hover:text-blue-400 flex items-center gap-2 group"
                onClick={() => setIsEditing(true)}
              >
                {process.name}
                <Edit2 size={12} className="opacity-0 group-hover:opacity-50" />
              </span>
            )}
          </div>
        </td>
        <td className={`${padY} text-slate-400 font-mono text-sm`}>{process.pid}</td>
        <td className={padY}>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(process.cpu, 100)}%` }}></div>
            </div>
            <span className="text-xs text-slate-300 font-mono">{process.cpu.toFixed(1)}%</span>
          </div>
        </td>
        <td className={padY}>
          <span className="text-sm text-slate-300 font-mono">{process.memory.toFixed(1)} MB</span>
        </td>
        <td className={`${padY} text-slate-400 text-sm`}>{process.uptime}</td>
        <td className={`${padY} pr-4 text-right`}>
          <div className="relative inline-block">
             <button 
               onClick={(e) => { e.stopPropagation(); onToggleMenu(process.pid); }}
               className={`p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-white transition-colors ${isMenuOpen ? 'bg-slate-700 text-white' : ''}`}
             >
               <MoreVertical size={16} />
             </button>

             {isMenuOpen && (
               <>
                 <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); onCloseMenu(); }} />
                 <div className="absolute right-0 top-8 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                   <button 
                     onClick={() => { onCloseMenu(); setShowLogs(true); }}
                     className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                   >
                      <FileText size={14} className="text-blue-400" />
                      Logs
                   </button>
                   {process.status !== 'online' && (
                       <button 
                       onClick={() => handleAction('start')}
                       className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 border-t border-slate-700/50"
                     >
                       <Play size={14} className={localActionState === 'starting' ? 'animate-pulse text-emerald-400' : 'text-emerald-400'} />
                       {localActionState === 'starting' ? 'Starting...' : t.start || 'Start'}
                     </button>
                   )}
                   {process.status === 'online' && (
                       <button 
                       onClick={() => handleAction('restart')}
                       className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 border-t border-slate-700/50"
                     >
                       <Activity size={14} className={localActionState === 'restarting' ? 'animate-pulse text-amber-400' : 'text-amber-400'} />
                       {localActionState === 'restarting' ? 'Restarting...' : t.restart || 'Restart'}
                     </button>
                   )}
                   {process.status === 'online' && (
                       <button 
                       onClick={() => handleAction('stop')}
                       className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2 border-t border-slate-700/50"
                     >
                       <Square size={14} className={localActionState === 'stopping' ? 'animate-pulse text-rose-400' : 'text-rose-400'} />
                       {localActionState === 'stopping' ? 'Stopping...' : t.stop || 'Stop'}
                     </button>
                   )}
                 </div>
               </>
             )}
          </div>
        </td>
      </tr>
      {showLogs && (
         <tr className="animate-in fade-in duration-200 bg-black/20">
            <td colSpan={6} className="p-0 border-b border-slate-800/50">
               <div className="bg-slate-950 m-4 rounded-lg border border-slate-800 p-4 font-mono text-xs overflow-hidden">
                  <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
                     <span className="text-slate-400 flex items-center gap-2"><FileText size={12} /> {process.name} logs (tail)</span>
                     <button onClick={() => setShowLogs(false)} className="text-slate-500 hover:text-white"><X size={12} /></button>
                  </div>
                  <div className="space-y-1 text-slate-300 max-h-40 overflow-y-auto">
                     {process.logs && process.logs.length > 0 ? (
                        process.logs.map((log, i) => (
                           <div key={i} className="whitespace-pre-wrap hover:bg-slate-900/50 px-1 rounded">
                              <span className="text-slate-600 mr-2">{i+1}</span>
                              {log}
                           </div>
                        ))
                     ) : (
                        <div className="text-slate-600 italic">No logs available for this process.</div>
                     )}
                  </div>
               </div>
            </td>
         </tr>
      )}
    </>
  );
};

const Devices: React.FC<DevicesProps> = ({ devices, onRenameDevice, onRenameProcess, onRemoveDevice, onProcessAction, language, settings }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Use URL param for selected device if present, otherwise default to first device
  const deviceIdParam = searchParams.get('deviceId');
  const activeTabParam = searchParams.get('tab') as 'overview' | 'terminal' | 'hardware' || 'overview';

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(deviceIdParam || devices[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'overview' | 'terminal' | 'hardware'>(activeTabParam);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false);
  const [editName, setEditName] = useState("");
  const [activeMenuPid, setActiveMenuPid] = useState<number | null>(null);
  const [processSearch, setProcessSearch] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const t = translations[language] || translations['en'];

  // Sync internal state with props/url
  useEffect(() => {
    if (devices.length === 0) {
      setSelectedDeviceId(null);
    } else if (selectedDeviceId && !devices.find(d => d.id === selectedDeviceId)) {
      setSelectedDeviceId(devices[0].id);
    } else if (!selectedDeviceId && devices.length > 0) {
       setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  // Update URL when selection changes
  const handleDeviceSelect = (id: string) => {
    setSelectedDeviceId(id);
    setActiveTab('overview');
    setSearchParams({ deviceId: id, tab: 'overview' });
  };

  const handleTabChange = (tab: 'overview' | 'terminal' | 'hardware') => {
    setActiveTab(tab);
    if (selectedDeviceId) {
      setSearchParams({ deviceId: selectedDeviceId, tab: tab });
    }
  };

  const selectedDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];

  const handleDeviceRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDevice) {
      onRenameDevice(selectedDevice.id, editName);
    }
    setIsEditingDeviceName(false);
  };

  const filteredProcesses = selectedDevice?.processes.filter(p => 
    p.name.toLowerCase().includes(processSearch.toLowerCase()) || 
    p.pid.toString().includes(processSearch)
  ) || [];

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <Server size={32} className="text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{t.noDevices}</h2>
        <p className="text-slate-400 mb-6 max-w-md">{t.deployAgent}</p>
        <button 
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition-colors ${accentBgMap[settings.accentColor]}`}
        >
          <Plus size={20} />
          {t.addDevice}
        </button>
        <AddDeviceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} t={t} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-6">
      <div className="w-full lg:w-80 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0 h-full">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
          <h2 className="font-bold text-white">{t.devices}</h2>
          <button onClick={() => setIsModalOpen(true)} className={`p-1.5 text-white rounded-md transition-colors ${accentBgMap[settings.accentColor]}`}><Plus size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {devices.map(device => (
            <button
              key={device.id}
              onClick={() => handleDeviceSelect(device.id)}
              className={`w-full text-left p-3 rounded-lg flex items-center justify-between group transition-all ${
                selectedDeviceId === device.id 
                  ? accentBorderMap[settings.accentColor] + ' border'
                  : 'hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${device.status === 'offline' ? 'bg-red-500' : device.stats.cpuUsage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <div>
                  <div className={`font-medium text-sm ${selectedDeviceId === device.id ? accentTextMap[settings.accentColor].split(' ')[0] : 'text-slate-300'}`}>{device.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{device.ip}</div>
                </div>
              </div>
              <div className="text-right">
                 {device.status === 'offline' ? <div className="text-xs font-medium text-red-500">{t.offline.toUpperCase()}</div> : <div className="text-xs font-mono text-slate-400">{device.stats.cpuUsage.toFixed(0)}% {t.cpu}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedDevice && (
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 pb-20 scroll-smooth">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 rounded-xl border border-slate-800 shrink-0 ${settings.compactMode ? 'p-4' : 'p-6'}`}>
            <div>
              <div className="flex items-center gap-3 mb-1">
                {isEditingDeviceName ? (
                   <form onSubmit={handleDeviceRenameSubmit} className="flex items-center gap-2">
                     <input autoFocus className="bg-slate-950 border border-slate-700 text-xl font-bold text-white px-2 py-1 rounded" value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleDeviceRenameSubmit} />
                   </form>
                ) : (
                  <h1 className="text-2xl font-bold text-white cursor-pointer hover:text-blue-400 flex items-center gap-2 group" onClick={() => { setEditName(selectedDevice.name); setIsEditingDeviceName(true); }}>
                    {selectedDevice.name}
                    <Edit2 size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </h1>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${selectedDevice.status === 'offline' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{selectedDevice.status === 'offline' ? t.offline : selectedDevice.os}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400 font-mono">
                <button onClick={() => { navigator.clipboard.writeText(selectedDevice.ip); setCopyFeedback(selectedDevice.id); setTimeout(() => setCopyFeedback(null), 1500); }} className="flex items-center gap-1.5 hover:text-white transition-colors group">
                  <span>{selectedDevice.ip}</span>
                  {copyFeedback === selectedDevice.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="opacity-0 group-hover:opacity-100" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex p-1 bg-slate-800 rounded-lg mr-4 border border-slate-700">
                  <button onClick={() => handleTabChange('overview')} className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${activeTab === 'overview' ? activeTabMap[settings.accentColor] : 'text-slate-400 hover:text-white'}`}>{t.overview}</button>
                  <button onClick={() => handleTabChange('hardware')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${activeTab === 'hardware' ? activeTabMap[settings.accentColor] : 'text-slate-400 hover:text-white'}`}><HardDrive size={14} />{t.hardware}</button>
                  <button disabled={selectedDevice.status === 'offline'} onClick={() => handleTabChange('terminal')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedDevice.status === 'offline' ? 'opacity-50 cursor-not-allowed text-slate-600' : activeTab === 'terminal' ? activeTabMap[settings.accentColor] : 'text-slate-400 hover:text-white'}`}>{selectedDevice.status === 'offline' ? <Lock size={14} /> : <Terminal size={14} />}{t.terminal}</button>
              </div>
              <button onClick={() => setIsRemoveModalOpen(true)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={20} /></button>
            </div>
          </div>

          <div className={activeTab === 'terminal' ? 'block' : 'hidden'}>
             <DeviceTerminal device={selectedDevice} key={selectedDevice.id} />
          </div>

          <div className={activeTab === 'hardware' ? 'block' : 'hidden'}>
             <DeviceHardware hardware={selectedDevice.hardware} t={t} />
          </div>

          <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
                <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 shrink-0`}>
                    <div className={`bg-slate-900 border border-slate-800 rounded-xl ${settings.compactMode ? 'p-4 h-64' : 'p-5 h-72'}`}>
                      <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-white flex items-center gap-2"><Cpu size={18} className="text-purple-400" /> CPU History</h3><span className="text-2xl font-bold text-white">{selectedDevice.stats.cpuUsage.toFixed(1)}%</span></div>
                      <ResponsiveContainer width="100%" height="80%"><AreaChart data={selectedDevice.history.cpu}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} itemStyle={{ color: '#a855f7' }} /><Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} fillOpacity={0.2} fill="#a855f7" /></AreaChart></ResponsiveContainer>
                    </div>
                    <div className={`bg-slate-900 border border-slate-800 rounded-xl ${settings.compactMode ? 'p-4 h-64' : 'p-5 h-72'}`}>
                      <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-white flex items-center gap-2"><Database size={18} className="text-amber-400" /> Memory Usage</h3><span className="text-2xl font-bold text-white">{selectedDevice.stats.memoryUsed.toFixed(2)} GB</span></div>
                      <ResponsiveContainer width="100%" height="80%"><AreaChart data={selectedDevice.history.memory}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} itemStyle={{ color: '#f59e0b' }} /><Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.2} fill="#f59e0b" /></AreaChart></ResponsiveContainer>
                    </div>
                </div>

                <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0`}>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between"><div><p className="text-xs text-slate-500 uppercase">{t.temp}</p><p className="text-xl font-bold text-white">{selectedDevice.stats.temperature.toFixed(1)}°C</p></div><div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400"><Activity size={20} /></div></div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between"><div><p className="text-xs text-slate-500 uppercase">{t.netIn}</p><p className="text-xl font-bold text-white">{selectedDevice.stats.networkIn.toFixed(0)} KB/s</p></div><div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><Wifi size={20} className="rotate-180" /></div></div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between"><div><p className="text-xs text-slate-500 uppercase">{t.netOut}</p><p className="text-xl font-bold text-white">{selectedDevice.stats.networkOut.toFixed(0)} KB/s</p></div><div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Wifi size={20} /></div></div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between"><div><p className="text-xs text-slate-500 uppercase">{t.disk}</p><p className="text-xl font-bold text-white">{selectedDevice.stats.diskUsage.toFixed(0)}%</p></div><div className="h-10 w-10 rounded-full bg-slate-700/30 flex items-center justify-center text-slate-400"><Database size={20} /></div></div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm shrink-0 mb-8 mt-6">
                    <div className={`border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10 ${settings.compactMode ? 'p-4' : 'p-6'}`}>
                      <div className="flex items-center gap-3"><Terminal size={20} className="text-slate-400" /><h2 className="font-bold text-white">{t.pm2Processes}</h2></div>
                      <div className="flex items-center gap-3">
                        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder={t.searchProcesses || "Search..."} value={processSearch} onChange={(e) => setProcessSearch(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-full py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 w-32 md:w-48 transition-all" /></div>
                        <span className="text-xs font-medium px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">{selectedDevice.processes.filter(p => p.status === 'online').length} {t.online}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto min-h-[200px] pb-32">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-slate-950/50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800"><th className="py-3 pl-4 font-medium">{t.name}</th><th className="py-3 font-medium">{t.pid}</th><th className="py-3 font-medium">{t.cpu}</th><th className="py-3 font-medium">{t.memory}</th><th className="py-3 font-medium">{t.uptime}</th><th className="py-3 pr-4 text-right font-medium">{t.actions}</th></tr></thead>
                        <tbody className="divide-y divide-slate-800">
                        {filteredProcesses.map(proc => (
                            <ProcessRow 
                            key={proc.pid} 
                            process={proc} 
                            deviceId={selectedDevice.id}
                            onRename={onRenameProcess}
                            onAction={onProcessAction}
                            isMenuOpen={activeMenuPid === proc.pid}
                            onToggleMenu={(pid) => setActiveMenuPid(activeMenuPid === pid ? null : pid)}
                            onCloseMenu={() => setActiveMenuPid(null)}
                            compact={settings.compactMode}
                            t={t}
                            />
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
          </div>
        </div>
      )}

      <AddDeviceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} t={t} />
      {selectedDevice && (
        <RemoveDeviceModal 
          isOpen={isRemoveModalOpen} 
          onClose={() => setIsRemoveModalOpen(false)} 
          onConfirm={() => onRemoveDevice(selectedDevice.id)}
          deviceName={selectedDevice.name}
          t={t}
        />
      )}
    </div>
  );
};

export default Devices;