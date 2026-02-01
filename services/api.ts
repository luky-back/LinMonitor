import { Device, User, InviteCode, Mail, Notification, UpdateConfig, AppSettings } from '../types';

const STORAGE_KEY = 'pimonitor_api_url';

// Helper to determine initial URL
const getInitialBaseUrl = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  
  if (window.location.port === '5173') {
    return 'http://127.0.0.1:3000/api';
  }
  
  return '/api';
};

let API_BASE = getInitialBaseUrl();

export const api = {
  setBaseUrl(url: string) {
    let cleanUrl = url.trim().replace(/\/$/, '');
    
    if (cleanUrl === '' || cleanUrl.startsWith('/')) {
        API_BASE = cleanUrl || '/api';
        if (!API_BASE.endsWith('/api')) API_BASE += '/api';
        localStorage.setItem(STORAGE_KEY, API_BASE);
        return;
    }

    if (!cleanUrl.startsWith('http')) {
        cleanUrl = `http://${cleanUrl}`;
    }

    if (!cleanUrl.endsWith('/api')) {
       API_BASE = `${cleanUrl}/api`;
    } else {
       API_BASE = cleanUrl;
    }
    
    localStorage.setItem(STORAGE_KEY, API_BASE);
  },

  getBaseUrl() {
    return API_BASE;
  },

  // Auth & Setup
  async checkSetup(): Promise<{ setupRequired: boolean }> {
    try {
        const res = await fetch(`${API_BASE}/auth/check`);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        if (e.message.includes('Failed to fetch')) {
            throw new Error(`Failed to fetch from ${API_BASE}. Is the server running?`);
        }
        throw e;
    }
  },

  async setupOwner(username: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  async login(username: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  async register(code: string, username: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, username, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  // Data Polling
  async getDevices(): Promise<Device[]> {
    const res = await fetch(`${API_BASE}/devices`);
    if (!res.ok) return [];
    return await res.json();
  },

  async getServerInfo(): Promise<Device | null> {
    try {
        const devices = await this.getDevices();
        return devices.find(d => d.id.includes('server') || d.name.toLowerCase().includes('server')) || null;
    } catch {
        return null;
    }
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    return await res.json();
  },

  async getInvites(): Promise<InviteCode[]> {
    const res = await fetch(`${API_BASE}/invites`);
    return await res.json();
  },

  async createInvite(role: string, createdBy: string): Promise<InviteCode> {
    const res = await fetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, createdBy })
    });
    return await res.json();
  },

  async deleteInvite(code: string): Promise<void> {
      await fetch(`${API_BASE}/invites/${code}`, { method: 'DELETE' });
  },

  // Mails & Notifications
  async getMails(userId: string): Promise<Mail[]> {
    const res = await fetch(`${API_BASE}/mail/${userId}`);
    if (!res.ok) return [];
    return await res.json();
  },

  async sendMail(fromId: string, toId: string, subject: string, body: string): Promise<Mail> {
    const res = await fetch(`${API_BASE}/mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId, toId, subject, body })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  async deleteMail(mailId: string): Promise<void> {
      await fetch(`${API_BASE}/mail/${mailId}`, { method: 'DELETE' });
  },

  async deleteMails(mailIds: string[]): Promise<void> {
      await Promise.all(mailIds.map(id => this.deleteMail(id)));
  },

  async markAllMailsRead(userId: string): Promise<void> {
      await fetch(`${API_BASE}/mail/${userId}/read-all`, { method: 'PUT' });
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    const res = await fetch(`${API_BASE}/notifications/${userId}`);
    if (!res.ok) return [];
    return await res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' });
  },

  async deleteNotification(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}`, { method: 'DELETE' });
  },

  async clearAllNotifications(userId: string): Promise<void> {
      await fetch(`${API_BASE}/notifications/${userId}/clear`, { method: 'DELETE' });
  },

  // System
  async getUpdateStatus(): Promise<UpdateConfig> {
      const res = await fetch(`${API_BASE}/update/check`);
      return await res.json();
  },
  
  async triggerUpdate(): Promise<void> {
      await fetch(`${API_BASE}/update/execute`, { method: 'POST' });
  },

  async triggerDeviceUpdate(deviceId: string): Promise<void> {
      await fetch(`${API_BASE}/devices/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId })
      });
  },

  async updateSettings(settings: Partial<UpdateConfig & AppSettings>): Promise<void> {
      await fetch(`${API_BASE}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
      });
  },

  async executePowerAction(action: 'shutdown' | 'restart'): Promise<void> {
      await fetch(`${API_BASE}/system/power`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
      });
  }
};
