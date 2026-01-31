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
  Cpu
} from 'lucide-react';
import { Device, AppSettings, User, ResourceLimits, UpdateConfig } from '../types';
import { translations } from '../translations';
import { DeviceHardware, DeviceTerminal } from '../components/DeviceWidgets';
import SecurityModal from '../components/SecurityModal';

interface ServerProps {
  server: Device;
  language: string;
  settings: AppSettings;
  currentUser: User;
  onUpdateLimits: (limits: ResourceLimits) => void;
  updateConfig: UpdateConfig;
  onUpdateConfigChange: (url: string) => void;
  onTriggerUpdate: () => void;
}

// ... UpdateProgressModal component ...
const UpdateProgressModal: React.FC<{ isOpen: boolean; repoUrl: string }> = ({ isOpen, repoUrl }) => {
    const [step, setStep] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setLogs([]);
            const sequence = [
                { time: 1000, msg: `Polling ${repoUrl}...` },
                { time: 2000, msg: "New commit detected. Changes found." },
                { time: 3000, msg: "Downloading repository archive..." },
                { time: 4500, msg: "Verifying checksums..." },
                { time: 5500, msg: "Loading 'update_script_A.py' into system RAM..." },
                { time: 6500, msg: "RAM Execution: Locking process memory." },
                { time: 7000, msg: "Checking 'update_script_B.py' diff..." },
                { time: 8000, msg: "Running Update Sequence: Main Application Files..." },
                { time: 9000, msg: "Executing: Script A updates Script B..." },
                { time: 10000, msg: "Cleaning up temporary files..." },
                { time: 11000, msg: "RESTARTING SERVER..." },
            ];

            let cumulativeTime = 0;
            sequence.forEach((item, index) => {
                cumulativeTime = item.time;
                setTimeout(() => {
                    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${item.msg}`]);
                    setStep(index + 1);
                }, cumulativeTime);
            });
        }
    }, [isOpen, repoUrl]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/90 backdrop-blur-md"></div>
             <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] animate-in zoom-in-95">
                 <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                     <h3 className="font-bold text-white flex items-center gap-2">
                        <RefreshCw size={18} className="animate-spin text-blue-400" />
                        System Update in Progress
                     </h3>
                     <span className="text-xs font-mono text-slate-400">DO NOT TURN OFF</span>
                 </div>
                 <div className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto">
                    {logs.map((log, i) => (
                        <div key={i} className="text-emerald-500 mb-1">{log}</div>
                    ))}
                    <div className="h-4 w-4 bg-emerald-500 animate-pulse mt-2" />
                 </div>
                 <div className="p-6 border-t border-slate-800 bg-slate-900">
                    <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase font-medium">
                        <span>Progress</span>
                        <span>{Math.round((step / 11) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${(step / 11) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full ${step > 4 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                             <span className="text-xs text-slate-400">RAM Load</span>
                        </div>
                        <div className="h-0.5 w-8 bg-slate-800" />
                         <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full ${step > 7 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                             <span className="text-xs text-slate-400">File Swap</span>
                        </div>
                        <div className="h-0.5 w-8 bg-slate-800" />
                         <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full ${step > 9 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                             <span className="text-xs text-slate-400">Restart</span>
                        </div>
                    </div>
                 </div>
             </div>
        </div>
    );
}

const Server: React.FC<ServerProps> = ({ server, language, settings, currentUser, onUpdateLimits, updateConfig, onUpdateConfigChange, onTriggerUpdate }) => {
  const t = translations[language] || translations['en'];
  const [activeAction, setActiveAction] = useState<'shutdown' | 'restart' | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  // Local state for limits editing
  const [cpuLimit, setCpuLimit] = useState(server.resourceLimits?.maxCpu || 100);
  const [ramLimit, setRamLimit] = useState(server.resourceLimits?.maxRam || 32);
  const [diskLimit, setDiskLimit] = useState(server.resourceLimits?.maxDisk || 1000);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for Repo URL editing
  const [repoInput, setRepoInput] = useState(updateConfig.repoUrl);
  const [isEditingRepo, setIsEditingRepo] = useState(false);

  const canEditLimits = currentUser.role === 'Owner' || currentUser.role === 'Admin';
  const isOwner = currentUser.role === 'Owner';

  const handleConfirmAction = () => {
    alert(`${activeAction === 'shutdown' ? 'Shutting down' : 'Restarting'} Server... (Simulation)`);
    setActiveAction(null);
  };

  const handleLimitChange = (setter: any, value: number) => {
    setter(value);
    setHasChanges(true);
  };

  const saveLimits = () => {
    onUpdateLimits({ maxCpu: cpuLimit, maxRam: ramLimit, maxDisk: diskLimit });
    setHasChanges(false);
  };

  const saveRepoUrl = () => {
      onUpdateConfigChange(repoInput);
      setIsEditingRepo(false);
  }

  const getStatusColor = (status: UpdateConfig['status']) => {
      switch(status) {
          case 'up-to-date': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          case 'update-available': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          case 'checking': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
          case 'updating': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
          default: return 'text-slate-400';
      }
  }

  const getStatusText = (status: UpdateConfig['status']) => {
    switch(status) {
        case 'up-to-date': return 'Up to date';
        case 'update-available': return 'Update Available';
        case 'checking': return 'Checking...';
        case 'updating': return 'Updating...';
        default: return status;
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
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
                 <span className="text-slate-600 mx-1">•</span>
                 <span className="text-sm text-slate-400 font-mono">{server.ip}</span>
               </div>
            </div>
         </div>

         {canEditLimits && (
           <div className="flex items-center gap-3">
               <button 
                 onClick={() => setActiveAction('restart')}
                 className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/10 transition-colors"
               >
                  <RefreshCw size={18} />
                  <span className="font-medium">{t.restart}</span>
               </button>
               <button 
                 onClick={() => setActiveAction('shutdown')}
                 className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-colors"
               >
                  <Power size={18} />
                  <span className="font-medium">{t.shutdown}</span>
               </button>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Stats Column */}
         <div className="lg:col-span-2 space-y-6">

             {/* System Update Section */}
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                           <CloudDownload size={20} className="text-blue-400" /> System Update
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Manage server software updates and repository connection.</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${getStatusColor(updateConfig.status)}`}>
                        {updateConfig.status === 'checking' && <Loader2 size={12} className="animate-spin" />}
                        {getStatusText(updateConfig.status)}
                    </div>
                </div>

                <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs text-slate-500 font-medium uppercase flex items-center gap-2">
                            <GitBranch size={12} /> GitHub Repository
                        </label>
                        {isOwner && !isEditingRepo && (
                            <button onClick={() => setIsEditingRepo(true)} className="text-xs text-blue-400 hover:text-blue-300">Change</button>
                        )}
                    </div>
                    {isEditingRepo ? (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={repoInput} 
                                onChange={(e) => setRepoInput(e.target.value)} 
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                            />
                            <button onClick={saveRepoUrl} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm">Save</button>
                            <button onClick={() => setIsEditingRepo(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-sm">Cancel</button>
                        </div>
                    ) : (
                        <div className="font-mono text-sm text-slate-300 truncate">{updateConfig.repoUrl}</div>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <div className="text-sm text-slate-500">
                        Current: <span className="text-white font-mono">{updateConfig.currentVersion}</span>
                        <span className="mx-2">•</span>
                        Checked: {updateConfig.lastChecked}
                    </div>
                    {updateConfig.status === 'update-available' && (
                        <button 
                            onClick={() => setIsUpdateConfirmOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-900/20 animate-pulse"
                        >
                            <CloudDownload size={18} /> Update to {updateConfig.availableVersion}
                        </button>
                    )}
                </div>
             </div>
            
            {/* Resource Limits Section (New) */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
               <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                       <Settings size={20} className="text-purple-400" /> {t.resourceLimits}
                    </h3>
                    <p className="text-sm text-slate-400">{t.resourceLimitsDesc}</p>
                  </div>
                  {canEditLimits && hasChanges && (
                    <button 
                      onClick={saveLimits}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg animate-in fade-in"
                    >
                      <Save size={16} /> Save Changes
                    </button>
                  )}
               </div>

               <div className="space-y-6">
                  {/* CPU Limit */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-slate-300">{t.limitCpu}</span>
                       <span className="text-slate-400">{t.current}: <span className="text-white">{server.stats.cpuUsage.toFixed(1)}%</span> / {t.limit}: <span className="text-white">{cpuLimit}%</span></span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={cpuLimit} 
                      onChange={(e) => handleLimitChange(setCpuLimit, Number(e.target.value))}
                      disabled={!canEditLimits}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="relative h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                       {/* The red line indicates the limit */}
                       <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${cpuLimit}%` }} />
                       <div className={`h-full ${server.stats.cpuUsage > cpuLimit ? 'bg-rose-500' : 'bg-purple-500'}`} style={{ width: `${server.stats.cpuUsage}%` }} />
                    </div>
                  </div>

                  {/* RAM Limit */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-slate-300">{t.limitRam} (GB)</span>
                       <span className="text-slate-400">{t.current}: <span className="text-white">{server.stats.memoryUsed.toFixed(1)}</span> / {t.limit}: <span className="text-white">{ramLimit}</span></span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max={parseInt(server.hardware.memory.total)} 
                      value={ramLimit} 
                      onChange={(e) => handleLimitChange(setRamLimit, Number(e.target.value))}
                      disabled={!canEditLimits}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="relative h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                       <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${(ramLimit / 32) * 100}%` }} />
                       <div className={`h-full ${server.stats.memoryUsed > ramLimit ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${(server.stats.memoryUsed / 32) * 100}%` }} />
                    </div>
                  </div>

                  {/* Disk Limit */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-slate-300">{t.limitDisk} (GB)</span>
                       <span className="text-slate-400">{t.current}: <span className="text-white">{(server.stats.diskUsage / 100 * 1000).toFixed(0)}</span> / {t.limit}: <span className="text-white">{diskLimit}</span></span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="1000" 
                      value={diskLimit} 
                      onChange={(e) => handleLimitChange(setDiskLimit, Number(e.target.value))}
                      disabled={!canEditLimits}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="relative h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${(diskLimit / 1000) * 100}%` }} />
                        <div className={`h-full ${ (server.stats.diskUsage / 100 * 1000) > diskLimit ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${server.stats.diskUsage}%` }} />
                    </div>
                  </div>
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

            {/* Hardware Specs - Hidden for Suggestioner (handled in Layout but extra check safe) */}
            <DeviceHardware hardware={server.hardware} t={t} />

            {/* Read-Only Processes */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
               <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <Activity size={18} className="text-slate-400" />
                     {t.pm2Processes}
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Read-Only</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                       <tr>
                          <th className="px-4 py-3">{t.name}</th>
                          <th className="px-4 py-3">{t.pid}</th>
                          <th className="px-4 py-3">{t.cpu}</th>
                          <th className="px-4 py-3">{t.memory}</th>
                          <th className="px-4 py-3">{t.uptime}</th>
                          <th className="px-4 py-3">{t.online}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                       {server.processes.map(proc => (
                          <tr key={proc.pid} className="hover:bg-slate-800/20">
                             <td className="px-4 py-3 font-medium text-slate-200">{proc.name}</td>
                             <td className="px-4 py-3 font-mono text-slate-400">{proc.pid}</td>
                             <td className="px-4 py-3 text-slate-300">{proc.cpu}%</td>
                             <td className="px-4 py-3 text-slate-300">{proc.memory} MB</td>
                             <td className="px-4 py-3 text-slate-400">{proc.uptime}</td>
                             <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                   Online
                                </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>

         {/* Sidebar / Terminal */}
         <div className="space-y-6">
            <DeviceTerminal device={server} />
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
               <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Wifi size={18} className="text-blue-400" />
                  Network Activity
               </h3>
               <div className="space-y-4">
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Inbound</span>
                        <span className="text-white font-mono">{server.stats.networkIn.toFixed(1)} KB/s</span>
                     </div>
                     <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '45%' }} />
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Outbound</span>
                        <span className="text-white font-mono">{server.stats.networkOut.toFixed(1)} KB/s</span>
                     </div>
                     <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: '62%' }} />
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
      
      {/* Update Confirmation Modal */}
      {isUpdateConfirmOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsUpdateConfirmOpen(false)}></div>
            <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <FileCode size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Confirm System Update</h2>
                        <p className="text-sm text-slate-400">Update to {updateConfig.availableVersion}</p>
                    </div>
                </div>
                <p className="text-slate-300 text-sm mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800">
                    This process will download the latest repository files, execute the RAM-based dual-script update sequence, and restart the server. 
                    <br/><br/>
                    <span className="text-amber-400 font-medium">⚠️ The server will be unavailable for approximately 15 seconds.</span>
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setIsUpdateConfirmOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">Cancel</button>
                    <button onClick={() => { setIsUpdateConfirmOpen(false); onTriggerUpdate(); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 font-medium">Confirm & Update</button>
                </div>
            </div>
         </div>
      )}

      {/* Progress Modal */}
      <UpdateProgressModal isOpen={updateConfig.status === 'updating'} repoUrl={updateConfig.repoUrl} />
    </div>
  );
};

export default Server;
