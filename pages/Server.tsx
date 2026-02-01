import React, { useState, useEffect } from 'react';
import { 
  Server as ServerIcon, 
  Power, 
  RefreshCw,
  Activity,
  Wifi,
  Settings,
  Save,
  GitBranch,
  CloudDownload,
  Loader2,
  FileCode,
  Terminal,
  Cpu,
  Copy,
  Check,
  Edit2,
  AlertTriangle,
  Key
} from 'lucide-react';
import { Device, AppSettings, User, ResourceLimits, UpdateConfig } from '../types';
import { translations } from '../translations';
import { DeviceHardware, DeviceTerminal } from '../components/DeviceWidgets';
import SecurityModal from '../components/SecurityModal';
import { api } from '../services/api';

interface ServerProps {
  server: Device;
  language: string;
  settings: AppSettings;
  currentUser: User;
  onUpdateLimits: (limits: ResourceLimits) => void;
  updateConfig: UpdateConfig;
  onUpdateConfigChange: (url: string, token: string) => void;
  onTriggerUpdate: () => void;
}

const Server: React.FC<ServerProps> = ({ server, language, settings, currentUser, onUpdateLimits, updateConfig, onUpdateConfigChange, onTriggerUpdate }) => {
  const t = translations[language] || translations['en'];
  const [activeAction, setActiveAction] = useState<'shutdown' | 'restart' | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [cpuLimit, setCpuLimit] = useState(server.resourceLimits?.maxCpu || 100);
  const [ramLimit, setRamLimit] = useState(server.resourceLimits?.maxRam || 32);
  const [diskLimit, setDiskLimit] = useState(server.resourceLimits?.maxDisk || 1000);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [repoInput, setRepoInput] = useState(updateConfig.repoUrl);
  const [tokenInput, setTokenInput] = useState("");
  const [isEditingRepo, setIsEditingRepo] = useState(false);

  // Sync repo input when config loads
  useEffect(() => {
      setRepoInput(updateConfig.repoUrl);
  }, [updateConfig.repoUrl]);

  const canEditLimits = currentUser.role === 'Owner' || currentUser.role === 'Admin';
  const isOwner = currentUser.role === 'Owner';

  const handleConfirmAction = async () => {
      if (activeAction) {
          await api.executePowerAction(activeAction);
          setActiveAction(null);
      }
  };

  const handleLimitChange = (setter: any, value: number) => { setter(value); setHasChanges(true); };
  const saveLimits = () => { onUpdateLimits({ maxCpu: cpuLimit, maxRam: ramLimit, maxDisk: diskLimit }); setHasChanges(false); };
  
  const saveRepoConfig = () => { 
      onUpdateConfigChange(repoInput, tokenInput); 
      setIsEditingRepo(false);
      // Clear token from state input for security (it's saved in backend)
      setTokenInput(""); 
  }
  
  const copySystemInfo = () => {
      const info = `OS: ${server.os}\nIP: ${server.ip}\nCPU: ${server.hardware.cpu.model}\nRAM: ${server.hardware.memory.total}`;
      navigator.clipboard.writeText(info);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
  };

  const getStatusColor = (status: UpdateConfig['status']) => {
      switch(status) {
          case 'up-to-date': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          case 'update-available': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          case 'checking': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
          case 'updating': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
          default: return 'text-slate-400';
      }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
               <ServerIcon size={32} />
            </div>
            <div>
               <h1 className="text-2xl font-bold text-white">{t.serverTitle}</h1>
               <div className="flex items-center gap-2 mt-1">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-sm text-emerald-400 font-medium">{t.online}</span>
                 <span className="text-slate-600 mx-1">•</span>
                 <span className="text-sm text-slate-400">{server.os}</span>
                 <button onClick={copySystemInfo} className="ml-2 text-slate-500 hover:text-white" title="Copy Info">
                    {copyFeedback ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                 </button>
               </div>
            </div>
         </div>

         {canEditLimits && (
           <div className="flex items-center gap-3">
               <button onClick={() => setActiveAction('restart')} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/10 transition-colors">
                  <RefreshCw size={18} /><span className="font-medium">{t.restart}</span>
               </button>
               <button onClick={() => setActiveAction('shutdown')} className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-colors">
                  <Power size={18} /><span className="font-medium">{t.shutdown}</span>
               </button>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
             {/* Update Section */}
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><CloudDownload size={20} className="text-blue-400" /> System Update</h3>
                        <p className="text-sm text-slate-400 mt-1">Hash-based update detection.</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${getStatusColor(updateConfig.status)}`}>
                        {updateConfig.status === 'checking' && <Loader2 size={12} className="animate-spin" />}
                        {updateConfig.status}
                    </div>
                </div>

                {updateConfig.error && (
                    <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-400 text-sm">
                        <AlertTriangle size={16} />
                        <span>Update Error: {updateConfig.error}</span>
                    </div>
                )}

                {/* Repo URL UI */}
                <div className="mb-6 p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-2">
                            <GitBranch size={12} /> Target Repository
                        </label>
                        {!isEditingRepo && isOwner && (
                            <button onClick={() => setIsEditingRepo(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                <Edit2 size={12} /> Edit
                            </button>
                        )}
                    </div>
                    {isEditingRepo ? (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-1 duration-200">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Repo URL</label>
                                <input 
                                    value={repoInput}
                                    onChange={(e) => setRepoInput(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none font-mono placeholder-slate-600"
                                    placeholder="https://github.com/user/repo"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1"><Key size={10} /> GitHub Token (Optional)</label>
                                <input 
                                    type="password"
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none font-mono placeholder-slate-600"
                                    placeholder="github_pat_..."
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Required to bypass rate limits or for private repos.</p>
                            </div>
                            <div className="flex gap-2 mt-1">
                                <button onClick={saveRepoConfig} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors">Save Config</button>
                                <button onClick={() => { setIsEditingRepo(false); setRepoInput(updateConfig.repoUrl); setTokenInput(""); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            <div className="text-sm text-slate-300 font-mono break-all bg-slate-900/50 p-2 rounded border border-transparent hover:border-slate-800 transition-colors">
                                {updateConfig.repoUrl || "No repository configured"}
                            </div>
                            {updateConfig.githubToken && (
                                <div className="text-[10px] text-emerald-500 flex items-center gap-1 px-2">
                                    <Key size={10} /> Token configured (Hidden)
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <div className="text-sm text-slate-500 font-mono flex gap-4">
                        <span title="Local Hash">Local: {updateConfig.localHash?.substring(0,7) || 'Unknown'}</span>
                        <span title="Remote Hash">Remote: {updateConfig.remoteHash?.substring(0,7) || 'Checking...'}</span>
                    </div>
                    {updateConfig.status === 'update-available' && (
                        <button onClick={() => setIsUpdateConfirmOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-900/20 animate-pulse transition-colors">
                            <CloudDownload size={18} /> Apply Update
                        </button>
                    )}
                </div>
             </div>
            
            {/* Aggregate Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                   <div className="text-slate-500 text-xs uppercase font-medium mb-1">{t.cpu}</div>
                   <div className="text-2xl font-bold text-white">{server.stats.cpuUsage.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                   <div className="text-slate-500 text-xs uppercase font-medium mb-1">{t.memory}</div>
                   <div className="text-2xl font-bold text-white">{server.stats.memoryUsage.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                   <div className="text-slate-500 text-xs uppercase font-medium mb-1">{t.disk}</div>
                   <div className="text-2xl font-bold text-white">{server.stats.diskUsage.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                   <div className="text-slate-500 text-xs uppercase font-medium mb-1">{t.temp}</div>
                   <div className="text-2xl font-bold text-white">{server.stats.temperature.toFixed(1)}°C</div>
                </div>
            </div>

            <DeviceHardware hardware={server.hardware} t={t} />
         </div>

         {/* Sidebar / Terminal / Network */}
         <div className="space-y-6">
            <DeviceTerminal device={server} />
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
               <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Wifi size={18} className="text-blue-400" />
                  Real-time Network
               </h3>
               <div className="space-y-4">
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Inbound</span>
                        <span className="text-white font-mono">{server.stats.networkIn.toFixed(1)} KB/s</span>
                     </div>
                     <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(server.stats.networkIn / 10, 100)}%` }} />
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Outbound</span>
                        <span className="text-white font-mono">{server.stats.networkOut.toFixed(1)} KB/s</span>
                     </div>
                     <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(server.stats.networkOut / 10, 100)}%` }} />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {activeAction && (
         <SecurityModal 
            isOpen={!!activeAction}
            onClose={() => setActiveAction(null)}
            onConfirm={handleConfirmAction}
            title={activeAction === 'shutdown' ? t.shutdown : t.restart}
            warning={activeAction === 'shutdown' ? t.shutdownWarning : t.restartWarning}
            length={activeAction === 'shutdown' ? 15 : 10}
            t={t}
         />
      )}
      
      {isUpdateConfirmOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsUpdateConfirmOpen(false)}></div>
            <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
                <h2 className="text-lg font-bold text-white mb-4">Confirm Update</h2>
                <p className="text-slate-400 text-sm mb-6">Updating will replace server files and restart the service. Ensure your repository URL is correct.</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setIsUpdateConfirmOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded">Cancel</button>
                    <button onClick={() => { setIsUpdateConfirmOpen(false); onTriggerUpdate(); }} className="px-4 py-2 bg-blue-600 text-white rounded font-medium">Confirm</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Server;
