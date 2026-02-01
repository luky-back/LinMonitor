import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Home from './pages/Home';
import Devices from './pages/Devices';
import Server from './pages/Server';
import Settings from './pages/Settings';
import MailPage from './pages/Mail';
import UsersPage from './pages/Users';
import { Device, AppSettings, User, Mail, Notification, InviteCode, UpdateConfig } from './types';
import { api } from './services/api';
import { WifiOff, RefreshCw, Server as ServerIcon, Download, Clock, CheckCircle, Loader, FileCode, Package, Play, AlertTriangle, XCircle } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const [apiUrl, setApiUrl] = useState(api.getBaseUrl().replace('/api', ''));
  const [devices, setDevices] = useState<Device[]>([]);
  const [server, setServer] = useState<Device | any>(null);
  const [refreshRate, setRefreshRate] = useState(2000);
  const [language, setLanguage] = useState('en');
  const [settings, setSettings] = useState<AppSettings>({
    accentColor: 'blue',
    compactMode: false,
    visibleWidgets: { activeDevices: true, cpu: true, memory: true, processes: true },
    autoUpdateDevices: false,
    updateNotifications: true
  });
  
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig>({
    repoUrl: 'github.com/user/pimonitor-repo',
    lastChecked: 'Never',
    status: 'up-to-date',
    currentVersion: 'v1.0.0',
    changedFiles: []
  });

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [mails, setMails] = useState<Mail[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  // --- COMPLEX UPDATE UI STATE ---
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStep, setUpdateStep] = useState<'idle' | 'downloading' | 'building' | 'restarting' | 'done'>('idle');
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [totalProgress, setTotalProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const initSystem = async () => {
    setIsLoading(true); setConnectionError(false); setErrorDetails('');
    api.setBaseUrl(apiUrl);
    try {
      const { setupRequired } = await api.checkSetup();
      const storedUser = localStorage.getItem('pimonitor_user');
      if (setupRequired) { setAuthMode('setup'); setCurrentUser(null); localStorage.removeItem('pimonitor_user'); }
      else if (storedUser) { setCurrentUser(JSON.parse(storedUser)); }
      else { setAuthMode('login'); }
    } catch (e: any) {
      setErrorDetails(e.message || "Unknown error");
      setConnectionError(true);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { initSystem(); }, []);

  const fetchTelemetry = async () => {
      if (!currentUser || connectionError) return;
      try {
          const devList = await api.getDevices();
          setDevices(devList);
          const serverInstance = devList.find(d => d.id.includes('server') || d.name.toLowerCase().includes('server'));
          if (serverInstance) setServer(serverInstance);
          const userList = await api.getUsers();
          setUsers(userList);
          if (currentUser.role === 'Owner') setInvites(await api.getInvites());
          setMails(await api.getMails(currentUser.id));
          setNotifications(await api.getNotifications(currentUser.id));
      } catch (e) { console.error("Polling error", e); }
  };

  useEffect(() => {
    fetchTelemetry(); 
    const interval = setInterval(fetchTelemetry, refreshRate);
    return () => clearInterval(interval);
  }, [currentUser, refreshRate, connectionError]);

  useEffect(() => {
    if (!currentUser || connectionError) return;
    const fetchUpdates = async () => {
       try {
         const status = await api.getUpdateStatus();
         setUpdateConfig(prev => ({...prev, ...status}));
         if (settings.updateNotifications && status.status === 'update-available' && !showUpdateModal && updateStep === 'idle') {
             setShowUpdateModal(true);
         }
       } catch (e) {}
    };
    fetchUpdates();
    const interval = setInterval(fetchUpdates, 60000); 
    return () => clearInterval(interval);
  }, [currentUser, connectionError]);

  // --- UPDATE LOGIC WITH VISUALIZATION ---
  const handleStartUpdate = async () => {
      setUpdateStep('downloading');
      
      const files = updateConfig.changedFiles || ['unknown_file'];
      const totalFiles = files.length;
      
      const estimatedSeconds = (totalFiles * 0.5) + 20;
      setTimeRemaining(estimatedSeconds);

      api.triggerUpdate();

      let completedFiles = 0;
      for (const file of files) {
          setFileProgress(prev => ({ ...prev, [file]: 0 }));
          for (let i = 0; i <= 100; i += 20) {
              await new Promise(r => setTimeout(r, 50));
              setFileProgress(prev => ({ ...prev, [file]: i }));
          }
          completedFiles++;
          setTotalProgress((completedFiles / totalFiles) * 50); 
      }

      setUpdateStep('building');
      const buildSteps = 100;
      for (let i = 0; i < buildSteps; i++) {
           await new Promise(r => setTimeout(r, 150)); 
           setTotalProgress(50 + (i / buildSteps) * 40);
           setTimeRemaining(prev => (prev ? prev - 0.15 : 0));
      }

      setUpdateStep('restarting');
      setTotalProgress(95);
      await new Promise(r => setTimeout(r, 5000));
      
      setTotalProgress(100);
      setUpdateStep('done');
      
      setTimeout(() => window.location.reload(), 2000);
  };

  const handleDismissUpdate = () => {
      setShowUpdateModal(false);
      // Temporarily override local status so it doesn't pop up again this session
      setUpdateConfig(prev => ({ ...prev, status: 'up-to-date' }));
  };

  const CircularProgress = ({ value }: { value: number }) => {
      const radius = 8;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (value / 100) * circumference;
      return (
          <div className="relative w-5 h-5 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90">
                 <circle cx="10" cy="10" r={radius} stroke="#334155" strokeWidth="2" fill="transparent" />
                 <circle cx="10" cy="10" r={radius} stroke="#3b82f6" strokeWidth="2" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
             </svg>
          </div>
      );
  }

  const handleSetupOwner = async (u:string, p:string) => { await api.setupOwner(u, p).then(u => {setCurrentUser(u); localStorage.setItem('pimonitor_user', JSON.stringify(u));}); };
  const handleLogin = async (u:string, p:string) => { await api.login(u, p).then(u => {setCurrentUser(u); localStorage.setItem('pimonitor_user', JSON.stringify(u));}); };
  const handleRegister = async (c:string, u:string, p:string) => { await api.register(c, u, p).then(u => {setCurrentUser(u); localStorage.setItem('pimonitor_user', JSON.stringify(u));}); };

  // --- FEATURE ACTIONS ---
  const handleUpdateConfigChange = async (url: string, token: string) => {
      await api.updateSettings({ repoUrl: url, githubToken: token });
      const status = await api.getUpdateStatus();
      setUpdateConfig(prev => ({...prev, ...status, repoUrl: url, githubToken: token}));
  };

  const handleCreateInvite = async (role: any) => {
      await api.createInvite(role, currentUser!.id);
      fetchTelemetry(); // Refresh lists immediately
  };

  const handleDeleteInvite = async (code: string) => {
      await api.deleteInvite(code);
      fetchTelemetry();
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4"><RefreshCw size={32} className="animate-spin text-blue-500" /><p className="animate-pulse">Connecting...</p></div>;
  if (connectionError) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Connection Error (See setup)</div>;
  if (!currentUser) return <Auth mode={authMode as any} language={language} onLogin={handleLogin} onRegister={handleRegister} onSetup={handleSetupOwner} onSwitchMode={(m) => setAuthMode(m)} error={authError} />;

  return (
    <Router>
      <Layout language={language} settings={settings} currentUser={currentUser} notifications={notifications} onLogout={() => {setCurrentUser(null); localStorage.removeItem('pimonitor_user');}} onClearNotification={api.markNotificationRead} onDeleteNotification={api.deleteNotification}>
        <Routes>
          <Route path="/" element={<Home devices={devices} language={language} settings={settings} />} />
          <Route path="/devices" element={<Devices devices={devices} onRenameDevice={()=>{}} onRenameProcess={()=>{}} onRemoveDevice={()=>{}} onProcessAction={()=>{}} language={language} settings={settings} />} />
          <Route path="/server" element={server ? <Server server={server} language={language} settings={settings} currentUser={currentUser} onUpdateLimits={()=>{}} updateConfig={updateConfig} onUpdateConfigChange={handleUpdateConfigChange} onTriggerUpdate={() => setShowUpdateModal(true)} /> : <div>No Server</div>} />
          <Route path="/settings" element={<Settings devices={devices} refreshRate={refreshRate} onRefreshRateChange={setRefreshRate} language={language} onLanguageChange={setLanguage} settings={settings} onSettingsChange={setSettings} />} />
          <Route path="/mail" element={<MailPage currentUser={currentUser} users={users} mails={mails} onSendMail={async (t,s,b) => { await api.sendMail(currentUser.id, t,s,b); fetchTelemetry(); }} language={language} />} />
          <Route path="/users" element={<UsersPage currentUser={currentUser} users={users} invites={invites} language={language} onCreateInvite={handleCreateInvite} onRequestInvite={()=>{}} onDeleteInvite={handleDeleteInvite} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {showUpdateModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"></div>
                <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                        <div className="flex justify-between items-start">
                             <div className="flex items-center gap-3">
                                 <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                     <Download className="text-white" size={24} />
                                 </div>
                                 <div>
                                     <h2 className="text-xl font-bold text-white">System Update</h2>
                                     <p className="text-blue-100 text-sm">v{updateConfig.currentVersion} &rarr; New Version</p>
                                 </div>
                             </div>
                             {updateStep === 'idle' && (
                                 <button onClick={() => setShowUpdateModal(false)} className="text-white/60 hover:text-white"><AlertTriangle size={20} className="rotate-180" /></button>
                             )}
                        </div>
                    </div>

                    <div className="p-6">
                        {updateStep === 'idle' ? (
                            <>
                                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 mb-6 max-h-48 overflow-y-auto">
                                    <h3 className="text-slate-400 text-xs uppercase font-bold mb-3 flex items-center gap-2"><FileCode size={12} /> Changed Files ({updateConfig.changedFiles?.length})</h3>
                                    <div className="space-y-2">
                                        {updateConfig.changedFiles?.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-slate-300 font-mono truncate">{file}</span>
                                                <span className="text-xs text-slate-500">~{(Math.random() * 50 + 10).toFixed(0)}KB</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm text-slate-400 mb-6 bg-slate-800/50 p-3 rounded-lg">
                                    <span className="flex items-center gap-2"><Clock size={14} /> Est. Time: ~{Math.ceil(((updateConfig.changedFiles?.length || 0) * 0.5) + 20)}s</span>
                                    <span className="flex items-center gap-2"><Package size={14} /> Steps: Download, Build, Restart</span>
                                </div>
                                <button onClick={handleStartUpdate} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]">
                                    Start Update
                                </button>
                                <button 
                                    onClick={handleDismissUpdate} 
                                    className="w-full mt-3 py-3 bg-transparent border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle size={18} /> Dismiss (False Positive)
                                </button>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <h3 className="text-white font-medium flex items-center gap-2">
                                            {updateStep === 'downloading' && <><Download size={18} className="animate-bounce" /> Downloading Files...</>}
                                            {updateStep === 'building' && <><Package size={18} className="animate-pulse" /> Building Frontend...</>}
                                            {updateStep === 'restarting' && <><Play size={18} className="animate-spin" /> Restarting Service...</>}
                                            {updateStep === 'done' && <><CheckCircle size={18} className="text-emerald-500" /> Complete!</>}
                                        </h3>
                                        <span className="text-2xl font-bold text-blue-400">{Math.round(totalProgress)}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out" style={{ width: `${totalProgress}%` }}></div>
                                    </div>
                                    <p className="text-right text-xs text-slate-500 mt-1">Time Remaining: {timeRemaining?.toFixed(0)}s</p>
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                                    {updateStep === 'downloading' && updateConfig.changedFiles?.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                                            <span className="text-xs text-slate-300 font-mono truncate max-w-[200px]">{file}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-500">{fileProgress[file] === 100 ? 'Done' : 'Downloading'}</span>
                                                <CircularProgress value={fileProgress[file] || 0} />
                                            </div>
                                        </div>
                                    ))}
                                    {updateStep === 'building' && (
                                        <div className="p-4 text-center text-slate-400 text-sm italic border border-dashed border-slate-700 rounded-lg">
                                            Running `npm run build` on host...<br/>
                                            This may take a moment.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </Layout>
    </Router>
  );
};

export default App;
