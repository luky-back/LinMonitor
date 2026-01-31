export interface PM2Process {
  pid: number;
  name: string;
  pm_id: number;
  status: 'online' | 'stopped' | 'errored' | 'launching';
  cpu: number;
  memory: number; // in MB
  uptime: string;
  restarts: number;
  logs: string[]; // New field for log history
}

export interface DeviceStats {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  memoryUsed: number; // GB
  memoryTotal: number; // GB
  temperature: number; // Celsius
  networkIn: number; // KB/s
  networkOut: number; // KB/s
  diskUsage: number; // percentage
}

export interface ChartDataPoint {
  time: string;
  value: number;
}

export interface HardwareSpecs {
  cpu: {
    model: string;
    cores: number;
    threads: number;
    baseSpeed: string;
    architecture: string;
  };
  memory: {
    total: string;
    type: string;
    speed: string;
    formFactor: string;
  };
  gpu: {
    model: string;
    vram: string;
    driver: string;
  };
  storage: Array<{
    name: string;
    model: string;
    size: string;
    type: string;
    interface: string;
  }>;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  os: string;
  status: 'online' | 'offline';
  lastSeen: string;
  stats: DeviceStats;
  processes: PM2Process[];
  history: {
    cpu: ChartDataPoint[];
    memory: ChartDataPoint[];
    network: ChartDataPoint[];
  };
  hardware: HardwareSpecs;
  resourceLimits?: ResourceLimits;
}

export interface AppSettings {
  accentColor: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'orange';
  compactMode: boolean;
  visibleWidgets: {
    activeDevices: boolean;
    cpu: boolean;
    memory: boolean;
    processes: boolean;
  };
}

export enum Tab {
  HOME = 'home',
  DEVICES = 'devices',
  SERVER = 'server',
  SETTINGS = 'settings',
  MAIL = 'mail',
  USERS = 'users'
}

export type ProcessAction = 'start' | 'stop' | 'restart';

// --- NEW TYPES FOR USERS & FEATURES ---

export type UserRole = 'Owner' | 'Admin' | 'Data Researcher' | 'Guest' | 'Suggestioner';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  passwordHash: string; // In a real app, this is hashed. Mocking it here.
  joinedAt: string;
}

export interface Mail {
  id: string;
  fromId: string;
  toId: string; // User ID
  subject: string;
  body: string;
  read: boolean;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'request' | 'alert';
  message: string;
  read: boolean;
  data?: any; // For action buttons like approving requests
}

export interface InviteCode {
  code: string;
  role: UserRole;
  createdBy: string;
  expiresAt: number; // Timestamp
}

export interface ResourceLimits {
  maxCpu: number; // Percentage cap
  maxRam: number; // GB cap
  maxDisk: number; // GB cap
}

export interface UpdateConfig {
  repoUrl: string;
  lastChecked: string;
  status: 'up-to-date' | 'update-available' | 'checking' | 'updating';
  availableVersion?: string;
  currentVersion: string;
}