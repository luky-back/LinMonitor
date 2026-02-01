import React, { useState } from 'react';
import { Activity, Server, Cpu, Database, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { Device, AppSettings, WidgetConfig } from '../types';
import { translations } from '../translations';

interface HomeProps {
  devices: Device[];
  language: string;
  settings: AppSettings;
}

const Home: React.FC<HomeProps> = ({ devices, language, settings }) => {
  const t = translations[language] || translations['en'];
  const [localRefresh, setLocalRefresh] = useState(0); // Trigger re-render or data fetch visualization
  
  // Local state for widget sizing (simple toggle mechanism for demo)
  // In a real app this would sync back to settings
  const [sizes, setSizes] = useState<Record<string, 'sm' | 'md' | 'lg'>>({
      activeDevices: 'sm',
      cpu: 'sm',
      memory: 'sm',
      processes: 'sm'
  });

  const toggleSize = (key: string) => {
      setSizes(prev => ({
          ...prev,
          [key]: prev[key] === 'sm' ? 'lg' : 'sm'
      }));
  };
  
  const totalCpu = devices.length > 0 
    ? Math.round(devices.reduce((acc, d) => acc + d.stats.cpuUsage, 0) / devices.length) 
    : 0;
  
  const totalMem = devices.length > 0
    ? Math.round(devices.reduce((acc, d) => acc + d.stats.memoryUsage, 0) / devices.length)
    : 0;
  
  const totalProcesses = devices.reduce((acc, d) => acc + d.processes.length, 0);

  const WidgetWrapper = ({ id, children, visible }: { id: string, children: React.ReactNode, visible: boolean }) => {
      if (!visible) return null;
      const size = sizes[id] || 'sm';
      const colSpan = size === 'lg' ? 'md:col-span-2 lg:col-span-2' : 'col-span-1';
      
      return (
          <div className={`${colSpan} relative group`}>
             <div className="h-full relative transition-all duration-300">
                {children}
                {/* Resize Handle / Toggle */}
                <button 
                   onClick={() => toggleSize(id)}
                   className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/0 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:bg-slate-800 hover:text-white transition-all z-10"
                   title="Toggle Size"
                >
                    {size === 'sm' ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                {/* CSS Resize Handle Simulation (Visual only if we don't use real drag lib) */}
                <div className="absolute bottom-1 right-1 w-3 h-3 cursor-se-resize opacity-0 group-hover:opacity-50">
                    <svg viewBox="0 0 10 10" className="w-full h-full fill-slate-500"><path d="M10 10L10 2L2 10Z" /></svg>
                </div>
             </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard}</h1>
          <p className="text-slate-400">{t.dashboardDesc}</p>
        </div>
        <button 
           onClick={() => { setLocalRefresh(p => p + 1); /* Force update or fetch logic */ }}
           className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-slate-700"
        >
            <RefreshCw size={16} className={localRefresh > 0 ? "animate-spin" : ""} onAnimationEnd={() => setLocalRefresh(0)} />
            Refresh
        </button>
      </div>

      {/* Resizable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
        <WidgetWrapper id="activeDevices" visible={settings.visibleWidgets.activeDevices}>
          <StatsCard 
            title={t.activeDevices} 
            value={devices.length} 
            icon={Server} 
            color="blue"
          />
        </WidgetWrapper>

        <WidgetWrapper id="cpu" visible={settings.visibleWidgets.cpu}>
          <StatsCard 
            title={t.avgCpu} 
            value={totalCpu} 
            unit="%" 
            icon={Cpu} 
            color="purple"
            trend={totalCpu > 80 ? 12 : -5}
          />
        </WidgetWrapper>

        <WidgetWrapper id="memory" visible={settings.visibleWidgets.memory}>
          <StatsCard 
            title={t.avgMem} 
            value={totalMem} 
            unit="%" 
            icon={Database} 
            color="amber"
          />
        </WidgetWrapper>

        <WidgetWrapper id="processes" visible={settings.visibleWidgets.processes}>
          <StatsCard 
            title={t.pm2Processes} 
            value={totalProcesses} 
            icon={Activity} 
            color="emerald"
          />
        </WidgetWrapper>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status List - Hardcoded large widget for now, but wrapped in a resizable-friendly container */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[300px] flex flex-col" style={{ resize: 'vertical', overflow: 'hidden' }}>
          <h2 className="text-lg font-semibold text-white mb-4">{t.deviceStatus}</h2>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
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

        {/* Alerts Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[300px]" style={{ resize: 'vertical', overflow: 'hidden' }}>
          <h2 className="text-lg font-semibold text-white mb-4">{t.recentAlerts}</h2>
          <div className="flex flex-col gap-3">
             <div className="flex gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
               <Activity size={18} className="text-rose-500 mt-0.5" />
               <div>
                 <p className="text-sm font-medium text-rose-200">{t.highCpuAlert}</p>
                 <p className="text-xs text-rose-300/60">Worker-queue process exceeded 80% CPU for 2 mins.</p>
               </div>
             </div>
             {/* Example of dynamic alerts from devices */}
             {devices.filter(d => d.stats.temperature > 60).map(d => (
                 <div key={d.id} className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Cpu size={18} className="text-amber-500 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-200">High Temperature</p>
                        <p className="text-xs text-amber-300/60">{d.name} is running hot ({d.stats.temperature}°C)</p>
                    </div>
                 </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
