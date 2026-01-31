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
import { createMockDevice, updateDeviceStats, createMockServer } from './services/mockDataService';

const App: React.FC = () => {
  // --- STATE: Data & Config ---
  const [devices, setDevices] = useState<Device[]>([
    createMockDevice('550e8400-e29b-41d4-a716-446655440000', 'Production Pi 5'),
    createMockDevice('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Staging Worker')
  ]);
  const [server, setServer] = useState<Device>(createMockServer());
  const [refreshRate, setRefreshRate] = useState<number>(2000);
  const [language, setLanguage] = useState<string>('en');
  const [settings, setSettings] = useState<AppSettings>({
    accentColor: 'blue',
    compactMode: false,
    visibleWidgets: { activeDevices: true, cpu: true, memory: true, processes: true }
  });
  
  // --- STATE: Update System ---
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig>({
    repoUrl: 'github.com/user/pimonitor-repo',
    lastChecked: new Date().toLocaleTimeString(),
    status: 'up-to-date',
    currentVersion: 'v1.0.2',
  });

  // --- STATE: Auth & Users ---
  // In a real app, this would be in a DB. 
  // We initialize with empty users to trigger "Owner Setup" flow.
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  
  // --- STATE: Communication ---
  const [mails, setMails] = useState<Mail[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- STATE: UI ---
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string>('');

  // --- EFFECT: Simulation ---
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(currentDevices => currentDevices.map(device => updateDeviceStats(device)));
      setServer(prev => updateDeviceStats(prev));
    }, refreshRate);
    return () => clearInterval(interval);
  }, [refreshRate]);

  // --- EFFECT: Update Polling (Simulated) ---
  useEffect(() => {
    // Check every 15 seconds
    const pollInterval = setInterval(() => {
      if (updateConfig.status === 'updating') return;

      setUpdateConfig(prev => ({
         ...prev,
         status: 'checking'
      }));

      // Simulate network request latency
      setTimeout(() => {
         // Randomly find an update for demonstration purposes
         const hasUpdate = Math.random() > 0.7; 
         
         setUpdateConfig(prev => ({
            ...prev,
            lastChecked: new Date().toLocaleTimeString(),
            status: hasUpdate ? 'update-available' : 'up-to-date',
            availableVersion: hasUpdate ? `v1.0.${Math.floor(Math.random() * 9) + 3}` : prev.availableVersion
         }));

         if (hasUpdate && currentUser?.role === 'Owner') {
            setNotifications(prev => [
               ...prev,
               {
                  id: `n-update-${Date.now()}`,
                  userId: currentUser.id,
                  type: 'info',
                  message: 'System update available.',
                  read: false
               }
            ]);
         }
      }, 1500);

    }, 15000);

    return () => clearInterval(pollInterval);
  }, [updateConfig.status, currentUser]);

  // --- ACTIONS: Update System ---
  const handleUpdateConfigChange = (newUrl: string) => {
     setUpdateConfig(prev => ({ ...prev, repoUrl: newUrl }));
  };

  const handleTriggerUpdate = () => {
    setUpdateConfig(prev => ({ ...prev, status: 'updating' }));
    // The actual progress logic is handled in the UI component via timeout simulation
    // to match the requested complexity visualization. 
    // After "restarting", we reset.
    setTimeout(() => {
       setUpdateConfig(prev => ({
          ...prev,
          status: 'up-to-date',
          currentVersion: prev.availableVersion || prev.currentVersion,
          availableVersion: undefined
       }));
       window.location.reload(); // Simulate refresh
    }, 12000); // Total update time
  };

  // --- ACTIONS: Auth ---
  const handleSetupOwner = (username: string, passwordHash: string) => {
    const newUser: User = {
      id: 'u-1',
      username,
      passwordHash, // In real app, hash this!
      role: 'Owner',
      joinedAt: new Date().toISOString()
    };
    setUsers([newUser]);
    setCurrentUser(newUser);
  };

  const handleLogin = (username: string) => {
    const user = users.find(u => u.username === username);
    if (user) {
       setCurrentUser(user);
       setAuthError('');
    } else {
       setAuthError('User not found.');
    }
  };

  const handleRegister = (code: string, username: string, passwordHash: string) => {
    const inviteIndex = invites.findIndex(i => i.code === code);
    if (inviteIndex === -1) {
      setAuthError('Invalid or expired code.');
      return;
    }

    const invite = invites[inviteIndex];
    if (Date.now() > invite.expiresAt) {
      setAuthError('Code expired.');
      // Optionally remove expired invite here
      setInvites(prev => prev.filter(i => i.code !== code));
      return;
    }

    const newUser: User = {
       id: `u-${Date.now()}`,
       username,
       passwordHash,
       role: invite.role,
       joinedAt: new Date().toISOString()
    };

    setUsers([...users, newUser]);
    // Remove used invite instantly so it can't be used again
    const newInvites = [...invites];
    newInvites.splice(inviteIndex, 1);
    setInvites(newInvites);
    
    setCurrentUser(newUser);
    setAuthError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthMode('login');
  };

  // --- ACTIONS: Users & Invites ---
  const handleCreateInvite = (role: UserRole) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newInvite: InviteCode = {
      code,
      role,
      createdBy: currentUser?.id || 'system',
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 mins expiry
    };
    setInvites([...invites, newInvite]);
  };

  const handleDeleteInvite = (code: string) => {
    setInvites(prev => prev.filter(i => i.code !== code));
  };

  const handleRequestInvite = () => {
    // Admin requesting invite from Owner
    const owner = users.find(u => u.role === 'Owner');
    if (owner && currentUser) {
       const newNotif: Notification = {
          id: `n-${Date.now()}`,
          userId: owner.id,
          type: 'request',
          message: `${currentUser.username} requested to invite a user.`,
          read: false,
          data: { type: 'invite_request', from: currentUser.id }
       };
       setNotifications([...notifications, newNotif]);
       alert('Request sent to Owner.');
    }
  };

  // --- ACTIONS: Mail ---
  const handleSendMail = (toId: string, subject: string, body: string) => {
    if (!currentUser) return;
    const newMail: Mail = {
      id: `m-${Date.now()}`,
      fromId: currentUser.id,
      toId,
      subject,
      body,
      read: false,
      timestamp: new Date().toISOString()
    };
    setMails([...mails, newMail]);
  };

  // --- ACTIONS: Device & Server ---
  const handleRenameDevice = (id: string, newName: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };
  const handleRenameProcess = (deviceId: string, processId: number, newName: string) => {
    setDevices(prev => prev.map(d => d.id !== deviceId ? d : {
        ...d, processes: d.processes.map(p => p.pid === processId ? { ...p, name: newName } : p)
    }));
  };
  const handleProcessAction = (deviceId: string, processId: number, action: ProcessAction) => {
    // ... logic remains same ...
    setDevices(prev => prev.map(d => d.id !== deviceId ? d : {
        ...d, processes: d.processes.map(p => p.pid !== processId ? p : {
           ...p, status: action === 'stop' ? 'stopped' : 'online', cpu: action === 'stop' ? 0 : Math.random() * 5
        })
    }));
  };
  const handleRemoveDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const handleUpdateLimits = (limits: ResourceLimits) => {
    setServer(prev => ({ ...prev, resourceLimits: limits }));
  };

  // --- RENDER ---

  if (users.length === 0) {
    return <Auth mode="setup" language={language} onLogin={() => {}} onRegister={() => {}} onSetup={handleSetupOwner} onSwitchMode={() => {}} error={authError} />;
  }

  if (!currentUser) {
    return (
      <Auth 
        mode={authMode} 
        language={language} 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        onSetup={() => {}} 
        onSwitchMode={setAuthMode} 
        error={authError} 
      />
    );
  }

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
          
          {/* Protected Routes based on Role */}
          {(currentUser.role !== 'Guest' && currentUser.role !== 'Suggestioner') && (
            <Route 
              path="/devices" 
              element={<Devices devices={devices} onRenameDevice={handleRenameDevice} onRenameProcess={handleRenameProcess} onRemoveDevice={handleRemoveDevice} onProcessAction={handleProcessAction} language={language} settings={settings} />} 
            />
          )}

          {currentUser.role !== 'Suggestioner' && (
            <Route 
              path="/server" 
              element={<Server server={server} language={language} settings={settings} currentUser={currentUser} onUpdateLimits={handleUpdateLimits} updateConfig={updateConfig} onUpdateConfigChange={handleUpdateConfigChange} onTriggerUpdate={handleTriggerUpdate} />} 
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