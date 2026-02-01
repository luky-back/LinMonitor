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
import { Device, AppSettings, ProcessAction, User, Mail, Notification, InviteCode, ResourceLimits, UserRole, UpdateConfig } from './types';
import { api } from './services/api';
import { WifiOff, RefreshCw, Server as ServerIcon, AlertTriangle, CloudDownload, Clock, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  // Initialize from API service which now handles localStorage
  const [apiUrl, setApiUrl] = useState(api.getBaseUrl().replace('/api', '')); 
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [server, setServer] = useState<Device | any>(null);
  const [refreshRate, setRefreshRate] = useState<number>(2000);
  const [language, setLanguage] = useState<string>('en');
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

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'setup'>('login');
  const [authError, setAuthError] = useState<string>('');

  // Update Notification Logic
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [updateTimer, setUpdateTimer] = useState<number | null>(null);

  // --- INITIALIZATION ---
  const initSystem = async () => {
    setIsLoading(true);
    setConnectionError(false);
    setErrorDetails('');
    
    // Update API service with current URL in state (and persist it)
    api.setBaseUrl(apiUrl);

    try {
      // 1. Check server connection & setup status
      const { setupRequired } = await api.checkSetup();
      
      // 2. Check for stored session
      const storedUser = localStorage.getItem('pimonitor_user');

      if (setupRequired) {
        setAuthMode('setup');
        setCurrentUser(null);
        localStorage.removeItem('pimonitor_user');
      } else {
        if (storedUser) {
          // Verify stored user is still valid with backend? 
          // For now just trust and let polling fail if invalid.
          setCurrentUser(JSON.parse(storedUser));
        } else {
          setAuthMode('login');
        }
      }
    } catch (e: any) {
      console.error("Failed to connect to server:", e);
      setErrorDetails(e.message || "Unknown error");
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initSystem();
  }, []);

  // --- DATA POLLING ---
  
  // Fast loop: Telemetry (Devices, System Status)
  useEffect(() => {
    if (!currentUser || connectionError) return;

    const fetchTelemetry = async () => {
        try {
            const devList = await api.getDevices();
            setDevices(devList);
            
            const serverInstance = devList.find(d => d.id.includes('server') || d.name.toLowerCase().includes('server'));
            if (serverInstance) setServer(serverInstance);

            const userList = await api.getUsers();
            setUsers(userList);
            
            if (currentUser.role === 'Owner') {
                const inviteList = await api.getInvites();
                setInvites(inviteList);
            }
            
            const mailList = await api.getMails(currentUser.id);
            setMails(mailList);
    
            const notifList = await api.getNotifications(currentUser.id);
            setNotifications(notifList);

        } catch (e) {
            console.error("Polling error", e);
            // Optional: setConnectionError(true) if repeated failures
        }
    };

    fetchTelemetry(); 
    const interval = setInterval(fetchTelemetry, refreshRate);
    return () => clearInterval(interval);
  }, [currentUser, refreshRate, connectionError]);

  // Slow loop: System Updates (To avoid rate limiting)
  useEffect(() => {
    if (!currentUser || connectionError) return;
    
    const fetchUpdates = async () => {
       try {
         const updateStatus = await api.getUpdateStatus();
         setUpdateConfig(prev => ({...prev, ...updateStatus}));
         
         // Trigger popup if setting enabled and new update found
         if (settings.updateNotifications && updateStatus.status === 'update-available' && !showUpdatePopup && !updateTimer) {
             setShowUpdatePopup(true);
         }
       } catch (e) {
         console.error("Update check failed", e);
       }
    };
    
    fetchUpdates();
    // Check every 60 seconds (backend caches for 60s anyway)
    const interval = setInterval(fetchUpdates, 60000); 
    return () => clearInterval(interval);
  }, [currentUser, connectionError, settings.updateNotifications]);

  // Timer Effect
  useEffect(() => {
      let interval: any;
      if (updateTimer !== null && updateTimer > 0) {
          interval = setInterval(() => {
              setUpdateTimer(prev => (prev && prev > 0 ? prev - 1 : 0));
          }, 1000);
      } else if (updateTimer === 0) {
          // Trigger update
          api.triggerUpdate();
          setShowUpdatePopup(false);
          // Wait 2 seconds then clear timer
          setTimeout(() => setUpdateTimer(null), 2000);
      }
      return () => clearInterval(interval);
  }, [updateTimer]);

  // --- ACTIONS ---
  const handleSetupOwner = async (username: string, passwordHash: string) => {
    try {
        const user = await api.setupOwner(username, passwordHash);
        setCurrentUser(user);
        localStorage.setItem('pimonitor_user', JSON.stringify(user));
        setAuthError('');
    } catch (e: any) {
        setAuthError(e.message || "Setup failed");
        throw e; // Crucial: Re-throw to trigger Auth component's error state
    }
  };

  const handleRealLogin = async (u: string, p: string) => {
      try {
          const user = await api.login(u, p);
          setCurrentUser(user);
          localStorage.setItem('pimonitor_user', JSON.stringify(user));
          setAuthError('');
      } catch (e: any) {
          setAuthError('Invalid credentials');
          throw e; // Crucial: Re-throw to trigger Auth component's error state
      }
  }

  const handleRegister = async (code: string, username: string, passwordHash: string) => {
    try {
        const user = await api.register(code, username, passwordHash);
        setCurrentUser(user);
        localStorage.setItem('pimonitor_user', JSON.stringify(user));
        setAuthError('');
    } catch (e: any) {
        setAuthError(e.message || 'Registration failed');
        throw e; // Crucial: Re-throw to trigger Auth component's error state
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pimonitor_user');
    setAuthMode('login');
  };

  const handleCreateInvite = async (role: UserRole) => {
    if (!currentUser) return;
    try {
        const invite = await api.createInvite(role, currentUser.id);
        setInvites(prev => [...prev, invite]);
    } catch (e) { console.error("Failed to create invite"); }
  };

  const handleDeleteInvite = async (code: string) => {
      try {
          await api.deleteInvite(code);
          setInvites(prev => prev.filter(i => i.code !== code));
      } catch (e) { console.error("Failed delete"); }
  };

  const handleRequestInvite = () => alert("Request sent (Simulation)");
  
  const handleSendMail = async (toId: string, subject: string, body: string) => {
      if (!currentUser) return;
      try {
          await api.sendMail(currentUser.id, toId, subject, body);
          const mailList = await api.getMails(currentUser.id);
          setMails(mailList);
      } catch (e) { console.error("Failed to send mail", e); }
  };

  const handleRenameDevice = (id: string, name: string) => {}; 
  const handleRenameProcess = (did: string, pid: number, name: string) => {};
  const handleProcessAction = (did: string, pid: number, action: ProcessAction) => {}; 
  const handleRemoveDevice = (id: string) => {}; 
  const handleUpdateLimits = (limits: ResourceLimits) => {};
  
  const handleUpdateConfigChange = async (url: string, token: string) => {
      try {
          const payload: any = { repoUrl: url };
          if(token) payload.githubToken = token;
          
          await api.updateSettings(payload);
          setUpdateConfig(prev => ({ 
              ...prev, 
              repoUrl: url,
              githubToken: token ? "configured" : prev.githubToken 
          }));
      } catch (e) {
          console.error("Failed to update config", e);
      }
  }; 
  
  const handleTriggerUpdate = async () => { await api.triggerUpdate(); };

  const startUpdateTimer = () => {
      setUpdateTimer(120); // 120 seconds
      setShowUpdatePopup(false);
  };

  const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- RENDER ---
  
  // 1. Loading State
  if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
           <RefreshCw size={32} className="animate-spin text-blue-500" />
           <p className="animate-pulse">Connecting to system...</p>
        </div>
      );
  }

  // 2. Connection Error State
  if (connectionError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
           <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                 <WifiOff size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Server Unreachable</h2>
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-3 py-2 rounded mb-6 inline-block">
                {errorDetails}
              </div>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                 Could not connect to the PiMonitor backend.<br/>
                 1. Ensure you have run <code>python pimonitor_server.py</code><br/>
                 2. Verify the URL below matches your server's output.
              </p>
              
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 text-left">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Backend API URL</label>
                  <div className="flex gap-2">
                     <div className="flex-1 relative">
                        <ServerIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                           type="text" 
                           value={apiUrl}
                           onChange={(e) => setApiUrl(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && initSystem()}
                           className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:border-blue-500 outline-none font-mono"
                           placeholder="http://127.0.0.1:3000"
                        />
                     </div>
                  </div>
              </div>

              <button 
                 onClick={initSystem}
                 className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
              >
                 <RefreshCw size={18} /> Retry Connection
              </button>
           </div>
        </div>
      );
  }

  // 3. Auth State
  if (!currentUser) {
    return (
      <Auth 
        mode={authMode as any} 
        language={language} 
        onLogin={(u: string, p?: string) => handleRealLogin(u, p || '')} 
        onRegister={handleRegister} 
        onSetup={handleSetupOwner} 
        onSwitchMode={(m) => setAuthMode(m)} 
        error={authError} 
      />
    );
  }

  // 4. Main App
  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  return (
    <Router>
      <Layout 
        language={language} 
        settings={settings} 
        currentUser={currentUser}
        notifications={userNotifications}
        onLogout={handleLogout}
        onClearNotification={async (id) => {
           await api.markNotificationRead(id);
           setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        }}
        onDeleteNotification={async (id) => {
           await api.deleteNotification(id);
           setNotifications(prev => prev.filter(n => n.id !== id));
        }}
      >
        <Routes>
          <Route path="/" element={<Home devices={devices} language={language} settings={settings} />} />
          
          {(currentUser.role !== 'Guest' && currentUser.role !== 'Suggestioner') && (
            <Route 
              path="/devices" 
              element={<Devices devices={devices} onRenameDevice={handleRenameDevice} onRenameProcess={handleRenameProcess} onRemoveDevice={handleRemoveDevice} onProcessAction={handleProcessAction} language={language} settings={settings} />} 
            />
          )}

          {currentUser.role !== 'Suggestioner' && (
            <Route 
              path="/server" 
              element={server ? (
                  <Server server={server} language={language} settings={settings} currentUser={currentUser} onUpdateLimits={handleUpdateLimits} updateConfig={updateConfig} onUpdateConfigChange={handleUpdateConfigChange} onTriggerUpdate={handleTriggerUpdate} />
              ) : (
                  <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
                     <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                        <ServerIcon size={32} />
                     </div>
                     <h3 className="text-lg font-medium text-white mb-2">No Server Agent Detected</h3>
                     <p className="text-slate-400 max-w-md mx-auto mb-6">
                        The backend API is connected, but the local monitoring agent is not reporting data. Run <code>python pimonitor_device.py</code> on your host.
                     </p>
                  </div>
              )} 
            />
          )}
          
          <Route 
            path="/settings" 
            element={<Settings devices={devices} refreshRate={refreshRate} onRefreshRateChange={setRefreshRate} language={language} onLanguageChange={setLanguage} settings={settings} onSettingsChange={setSettings} />} 
          />
          
          <Route 
             path="/mail" 
             element={<MailPage currentUser={currentUser} users={users} mails={mails} onSendMail={handleSendMail} language={language} />} 
          />

          <Route 
             path="/users" 
             element={<UsersPage currentUser={currentUser} users={users} invites={invites} language={language} onCreateInvite={handleCreateInvite} onRequestInvite={handleRequestInvite} onDeleteInvite={handleDeleteInvite} />} 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Update Popup */}
        {showUpdatePopup && (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-6 duration-300">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 w-80 max-w-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <CloudDownload size={20} className="text-blue-400" />
                            <h3 className="font-bold text-white">Update Available</h3>
                        </div>
                        <button onClick={() => setShowUpdatePopup(false)} className="text-slate-500 hover:text-white transition-colors"><AlertTriangle size={14} className="rotate-180" /></button>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">A new version is available for the server.</p>
                    
                    {/* Changed Files List */}
                    <div className="bg-slate-950 rounded-lg p-3 mb-4 max-h-24 overflow-y-auto border border-slate-800 text-xs font-mono">
                        <div className="text-slate-500 mb-1 border-b border-slate-800 pb-1">Changed Files ({updateConfig.changedFiles?.length || 0}):</div>
                        {updateConfig.changedFiles?.length ? (
                            updateConfig.changedFiles.map((file, i) => (
                                <div key={i} className="text-slate-300 truncate">• {file}</div>
                            ))
                        ) : (
                            <div className="text-slate-600 italic">No file details</div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={handleTriggerUpdate}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-900/20"
                        >
                            Update Now
                        </button>
                        <div className="flex gap-2">
                            <button 
                                onClick={startUpdateTimer}
                                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1"
                            >
                                <Clock size={12} /> In 2 min
                            </button>
                            <button 
                                onClick={() => setShowUpdatePopup(false)}
                                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-xs transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Global Timer Overlay */}
        {updateTimer !== null && (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${updateTimer === 0 ? 'translate-y-0 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                <div className="bg-slate-900/90 backdrop-blur border border-blue-500/30 rounded-full px-4 py-2 shadow-xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-white flex items-center gap-2">
                        System Updating in <span className="font-mono text-blue-400 w-10 text-center">{formatTime(updateTimer)}</span>
                    </span>
                    <button onClick={() => setUpdateTimer(null)} className="text-slate-500 hover:text-white ml-2"><AlertTriangle size={14} className="rotate-45" /></button>
                </div>
            </div>
        )}
      </Layout>
    </Router>
  );
};

export default App;
