import { Device, PM2Process, ChartDataPoint, HardwareSpecs } from '../types';

const generateHistory = (length: number, baseValue: number, volatility: number): ChartDataPoint[] => {
  return Array.from({ length }).map((_, i) => {
    const time = new Date(Date.now() - (length - 1 - i) * 2000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
    return {
      time,
      value: Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * volatility)),
    };
  });
};

const generateMockLogs = (processName: string): string[] => {
  const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'DEBUG'];
  const messages = [
    `Process ${processName} heartbeat received`,
    `Memory usage stable`,
    `Connection pool: 5 active connections`,
    `Request processed in ${Math.floor(Math.random() * 200)}ms`,
    `Garbage collection completed`,
    `Syncing data with remote node`,
    `Cache hit for key: user_${Math.floor(Math.random() * 1000)}`
  ];
  
  return Array.from({ length: 8 }).map(() => {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    const time = new Date(Date.now() - Math.floor(Math.random() * 1000000)).toISOString();
    return `[${time}] [${level}] ${msg}`;
  }).sort();
};

const INITIAL_PROCESSES: PM2Process[] = [
  { pid: 1024, name: 'api-server', pm_id: 0, status: 'online', cpu: 2.5, memory: 120, uptime: '2d 4h', restarts: 0, logs: generateMockLogs('api-server') },
  { pid: 1025, name: 'worker-queue', pm_id: 1, status: 'online', cpu: 12.1, memory: 250, uptime: '2d 4h', restarts: 1, logs: generateMockLogs('worker-queue') },
  { pid: 1026, name: 'scheduler', pm_id: 2, status: 'stopped', cpu: 0, memory: 0, uptime: '0s', restarts: 5, logs: [] },
  { pid: 1030, name: 'ws-gateway', pm_id: 3, status: 'online', cpu: 5.4, memory: 80, uptime: '5h 12m', restarts: 0, logs: generateMockLogs('ws-gateway') },
];

const SERVER_PROCESSES: PM2Process[] = [
  { pid: 501, name: 'pimonitor-backend', pm_id: 0, status: 'online', cpu: 5.5, memory: 320, uptime: '10d 2h', restarts: 0, logs: generateMockLogs('pimonitor-backend') },
  { pid: 502, name: 'postgres-db', pm_id: 1, status: 'online', cpu: 8.2, memory: 1024, uptime: '10d 2h', restarts: 0, logs: generateMockLogs('postgres-db') },
  { pid: 503, name: 'redis-cache', pm_id: 2, status: 'online', cpu: 1.1, memory: 128, uptime: '10d 2h', restarts: 0, logs: generateMockLogs('redis-cache') },
];

const MOCK_HARDWARE_TEMPLATES: Record<string, HardwareSpecs> = {
  pi5: {
    cpu: {
      model: 'Broadcom BCM2712',
      cores: 4,
      threads: 4,
      baseSpeed: '2.4 GHz',
      architecture: 'ARMv8.2-A (64-bit)',
    },
    memory: {
      total: '8 GB',
      type: 'LPDDR4X',
      speed: '4267 MHz',
      formFactor: 'SoC Integrated',
    },
    gpu: {
      model: 'VideoCore VII',
      vram: 'Shared',
      driver: 'Mesa v3d',
    },
    storage: [
      {
        name: '/dev/mmcblk0',
        model: 'SanDisk Ultra',
        size: '64 GB',
        type: 'SDXC',
        interface: 'SDIO',
      },
      {
        name: '/dev/nvme0n1',
        model: 'Samsung 980',
        size: '500 GB',
        type: 'SSD',
        interface: 'PCIe Gen 2.0 x1',
      }
    ],
  },
  server: {
    cpu: {
      model: 'Intel Core i7-12700K',
      cores: 12,
      threads: 20,
      baseSpeed: '3.6 GHz',
      architecture: 'x86_64',
    },
    memory: {
      total: '32 GB',
      type: 'DDR5',
      speed: '4800 MHz',
      formFactor: 'DIMM',
    },
    gpu: {
      model: 'Intel UHD Graphics 770',
      vram: 'Shared',
      driver: 'i915',
    },
    storage: [
      {
        name: '/dev/sda',
        model: 'Samsung 990 Pro',
        size: '1 TB',
        type: 'SSD',
        interface: 'NVMe PCIe 4.0',
      }
    ],
  }
};

export const createMockServer = (): Device => {
    return {
        id: 'server-local',
        name: 'Localhost Server',
        ip: '127.0.0.1',
        os: 'Ubuntu 22.04 LTS (Server)',
        status: 'online',
        lastSeen: 'Just now',
        stats: {
            cpuUsage: 25,
            memoryUsage: 45,
            memoryUsed: 14.4,
            memoryTotal: 32.0,
            temperature: 38,
            networkIn: 520,
            networkOut: 890,
            diskUsage: 42
        },
        processes: [...SERVER_PROCESSES],
        history: {
            cpu: generateHistory(20, 25, 5),
            memory: generateHistory(20, 45, 2),
            network: generateHistory(20, 600, 100),
        },
        hardware: MOCK_HARDWARE_TEMPLATES.server
    }
}

export const createMockDevice = (id: string, name: string): Device => {
  const isPi = name.toLowerCase().includes('pi');
  const template = isPi ? MOCK_HARDWARE_TEMPLATES.pi5 : MOCK_HARDWARE_TEMPLATES.server;

  return {
    id,
    name,
    ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
    os: isPi ? 'Linux (Raspberry Pi OS)' : 'Linux (Ubuntu 22.04 LTS)',
    status: 'online',
    lastSeen: 'Just now',
    stats: {
      cpuUsage: 15,
      memoryUsage: 35,
      memoryUsed: 1.4,
      memoryTotal: isPi ? 8.0 : 32.0,
      temperature: isPi ? 42 : 35,
      networkIn: 120,
      networkOut: 45,
      diskUsage: 60,
    },
    processes: [...INITIAL_PROCESSES],
    history: {
      cpu: generateHistory(20, 15, 10),
      memory: generateHistory(20, 35, 5),
      network: generateHistory(20, 40, 20),
    },
    hardware: template
  };
};

export const updateDeviceStats = (device: Device): Device => {
  // If offline, don't update stats (simulate connection loss)
  if (device.status === 'offline') return device;

  const newCpu = Math.max(0, Math.min(100, device.stats.cpuUsage + (Math.random() - 0.5) * 10));
  const newMem = Math.max(0, Math.min(100, device.stats.memoryUsage + (Math.random() - 0.5) * 2));
  const newNetIn = Math.max(0, device.stats.networkIn + (Math.random() - 0.5) * 50);
  
  const now = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Update history arrays (keep last 20 points)
  const updateHistory = (hist: ChartDataPoint[], val: number) => {
    const newHist = [...hist.slice(1), { time: now, value: val }];
    return newHist;
  };

  // Simulate process fluctuation
  const newProcesses = device.processes.map(p => {
    if (p.status !== 'online') return p;
    // Occasionally add a new log
    let newLogs = p.logs;
    if (Math.random() > 0.9) {
        const time = new Date().toISOString();
        newLogs = [...p.logs.slice(-10), `[${time}] [INFO] Routine health check passed.`];
    }

    return {
      ...p,
      cpu: Math.max(0, p.cpu + (Math.random() - 0.5) * 2),
      memory: Math.max(10, p.memory + (Math.random() - 0.5) * 5),
      logs: newLogs
    };
  });

  return {
    ...device,
    lastSeen: 'Just now',
    stats: {
      ...device.stats,
      cpuUsage: newCpu,
      memoryUsage: newMem,
      memoryUsed: (newMem / 100) * device.stats.memoryTotal,
      temperature: device.stats.temperature + (Math.random() - 0.5),
      networkIn: newNetIn,
      networkOut: Math.max(0, device.stats.networkOut + (Math.random() - 0.5) * 50),
    },
    processes: newProcesses,
    history: {
      cpu: updateHistory(device.history.cpu, newCpu),
      memory: updateHistory(device.history.memory, newMem),
      network: updateHistory(device.history.network, newNetIn),
    }
  };
};