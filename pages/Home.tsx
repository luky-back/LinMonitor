import React from 'react';
import { Activity, Server, Cpu, Database } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { Device, AppSettings } from '../types';
import { translations } from '../translations';

interface HomeProps {
  devices: Device[];
  language: string;
  settings: AppSettings;
}

const Home: React.FC<HomeProps> = ({ devices, language, settings }) => {
  const t = translations[language] || translations['en'];
  
  const totalCpu = devices.length > 0 
    ? Math.round(devices.reduce((acc, d) => acc + d.stats.cpuUsage, 0) / devices.length) 
    : 0;
  
  const totalMem = devices.length > 0
    ? Math.round(devices.reduce((acc, d) => acc + d.stats.memoryUsage, 0) / devices.length)
    : 0;
  
  const totalProcesses = devices.reduce((acc, d) => acc + d.processes.length, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard}</h1>
        <p className="text-slate-400">{t.dashboardDesc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {settings.visibleWidgets.activeDevices && (
          <StatsCard 
            title={t.activeDevices} 
            value={devices.length} 
            icon={Server} 
            color="blue"
          />
        )}
        {settings.visibleWidgets.cpu && (
          <StatsCard 
            title={t.avgCpu} 
            value={totalCpu} 
            unit="%" 
            icon={Cpu} 
            color="purple"
            trend={totalCpu > 80 ? 12 : -5}
          />
        )}
        {settings.visibleWidgets.memory && (
          <StatsCard 
            title={t.avgMem} 
            value={totalMem} 
            unit="%" 
            icon={Database} 
            color="amber"
          />
        )}
        {settings.visibleWidgets.processes && (
          <StatsCard 
            title={t.pm2Processes} 
            value={totalProcesses} 
            icon={Activity} 
            color="emerald"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t.deviceStatus}</h2>
          <div className="space-y-4">
            {devices.map(device => (
              <div key={device.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${device.stats.cpuUsage > 90 ? 'bg-rose-500' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.4)]`}></div>
                  <div>
                    <h3 className="font-medium text-white">{device.name}</h3>
                    <p className="text-xs text-slate-400">{device.ip}</p>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-slate-500 text-xs uppercase tracking-wider">{t.cpu}</p>
                    <p className="text-white font-mono">{device.stats.cpuUsage.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500 text-xs uppercase tracking-wider">MEM</p>
                    <p className="text-white font-mono">{device.stats.memoryUsage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
            {devices.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {t.noDevices}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t.recentAlerts}</h2>
          <div className="flex flex-col gap-3">
             {/* Mock Alerts */}
             <div className="flex gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
               <Activity size={18} className="text-rose-500 mt-0.5" />
               <div>
                 <p className="text-sm font-medium text-rose-200">{t.highCpuAlert}</p>
                 <p className="text-xs text-rose-300/60">Worker-queue process exceeded 80% CPU for 2 mins.</p>
               </div>
             </div>
             <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
               <Server size={18} className="text-blue-500 mt-0.5" />
               <div>
                 <p className="text-sm font-medium text-blue-200">New Device Detected</p>
                 <p className="text-xs text-blue-300/60">Raspberry Pi 5 (backup) connected successfully.</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;