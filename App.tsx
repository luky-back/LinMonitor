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
import { WifiOff, RefreshCw, Server as ServerIcon, AlertTriangle } from 'lucide-react';

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
    visibleWidgets: { activeDevices: true, cpu: true, memory: true, processes: true }
  });
  
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig>({
    repoUrl: 'github.com/user/pimonitor-repo',
    lastChecked: 'Never',
    status: 'up-to-date',
    currentVersion: 'v1.0.0',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [mails, setMails] = useState<Mail[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'setup'>('login');
  const [authError, setAuthError] = useState<string>('');

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
  useEffect(() => {
    if (!currentUser || connectionError) return;

    const fetchData = async () => {
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
            
            const updateStatus = await api.getUpdateStatus();
            setUpdateConfig(prev => ({...prev, ...updateStatus}));

        } catch (e) {
            console.error("Polling error", e);
            // Optional: setConnectionError(true) if repeated failures
        }
    };

    fetchData(); 
    const interval = setInterval(fetchData, refreshRate);
    return () => clearInterval(interval);
  }, [currentUser, refreshRate, connectionError]);

  // --- ACTIONS ---
  const handleSetupOwner = async (username: string, passwordHash: string) => {
    try {
        const user = await api.setupOwner(username, passwordHash);
        setCurrentUser(user);
        localStorage.setItem('pimonitor_user', JSON.stringify(user));
        setAuthError('');
    } catch (e: any) {
        setAuthError(e.message || "Setup failed");
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
  const handleSendMail = (toId: string, subject: string, body: string) => {
      const newMail: Mail = {
        id: `m-${Date.now()}`,
        fromId: currentUser?.id || '',
        toId,
        subject,
        body,
        read: false,
        timestamp: new Date().toISOString()
      };
      setMails(prev => [...prev, newMail]);
  };
  const handleRenameDevice = (id: string, name: string) => {}; 
  const handleRenameProcess = (did: string, pid: number, name: string) => {};
  const handleProcessAction = (did: string, pid: number, action: ProcessAction) => {}; 
  const handleRemoveDevice = (id: string) => {}; 
  const handleUpdateLimits = (limits: ResourceLimits) => {};
  const handleUpdateConfigChange = (url: string) => {}; 
  const handleTriggerUpdate = async () => { await api.triggerUpdate(); };

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
        // @ts-ignore
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
        onClearNotification={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
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
      </Layout>
    </Router>
  );
};

export default App;
