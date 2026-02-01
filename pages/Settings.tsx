import React, { useState } from 'react';
import { Device, AppSettings } from '../types';
import { Shield, Key, Bell, Globe, ChevronDown, Check, Palette, LayoutTemplate, Download } from 'lucide-react';
import { translations } from '../translations';

interface SettingsProps {
  devices: Device[];
  refreshRate: number;
  onRefreshRateChange: (rate: number) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文 (Simplified)' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

const COLORS = [
  { id: 'blue', class: 'bg-blue-600' },
  { id: 'purple', class: 'bg-purple-600' },
  { id: 'emerald', class: 'bg-emerald-600' },
  { id: 'amber', class: 'bg-amber-600' },
  { id: 'rose', class: 'bg-rose-600' },
  { id: 'indigo', class: 'bg-indigo-600' },
  { id: 'orange', class: 'bg-orange-600' },
];

const Settings: React.FC<SettingsProps> = ({ 
  devices, 
  refreshRate, 
  onRefreshRateChange, 
  language, 
  onLanguageChange,
  settings,
  onSettingsChange
}) => {
  const [showIds, setShowIds] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const t = translations[language] || translations['en'];
  const selectedLangName = LANGUAGES.find(l => l.code === language)?.name || 'English';

  const toggleWidget = (key: keyof AppSettings['visibleWidgets']) => {
    onSettingsChange({
      ...settings,
      visibleWidgets: {
        ...settings.visibleWidgets,
        [key]: !settings.visibleWidgets[key]
      }
    });
  };

  const toggleSetting = (key: keyof AppSettings) => {
      onSettingsChange({
          ...settings,
          [key]: !settings[key]
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t.settingsTitle}</h1>
        <p className="text-slate-400">{t.settingsDesc}</p>
      </div>

      <div className="grid gap-8">
        
        {/* Appearance Settings */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
           <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
              <Palette className="text-purple-500" size={24} />
              <div>
                 <h2 className="text-lg font-semibold text-white">{t.appearance || "Appearance"}</h2>
                 <p className="text-sm text-slate-400">{t.appearanceDesc || "Customize the look and feel."}</p>
              </div>
           </div>
           <div className="p-6 space-y-6">
              {/* Accent Color */}
              <div>
                 <h3 className="font-medium text-white mb-3">{t.accentColor || "Accent Color"}</h3>
                 <div className="flex flex-wrap gap-3">
                    {COLORS.map(color => (
                       <button
                          key={color.id}
                          onClick={() => onSettingsChange({ ...settings, accentColor: color.id as any })}
                          className={`w-10 h-10 rounded-full ${color.class} flex items-center justify-center transition-transform hover:scale-110 ring-2 ring-offset-2 ring-offset-slate-900 ${settings.accentColor === color.id ? 'ring-white' : 'ring-transparent'}`}
                       >
                          {settings.accentColor === color.id && <Check size={16} className="text-white" />}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                 <div>
                    <h3 className="font-medium text-white">{t.compactMode || "Compact Mode"}</h3>
                    <p className="text-sm text-slate-500">{t.compactModeDesc || "Reduce padding."}</p>
                 </div>
                 <button 
                    onClick={() => toggleSetting('compactMode')}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.compactMode ? 'bg-blue-600' : 'bg-slate-700'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.compactMode ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>

              {/* Dashboard Widgets */}
              <div className="pt-4 border-t border-slate-800">
                 <h3 className="font-medium text-white mb-3">{t.dashboardWidgets || "Dashboard Widgets"}</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'activeDevices', label: t.activeDevices },
                      { id: 'cpu', label: t.avgCpu },
                      { id: 'memory', label: t.avgMem },
                      { id: 'processes', label: t.pm2Processes }
                    ].map(widget => (
                       <label key={widget.id} className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
                          <input 
                            type="checkbox" 
                            checked={settings.visibleWidgets[widget.id as keyof AppSettings['visibleWidgets']]}
                            onChange={() => toggleWidget(widget.id as keyof AppSettings['visibleWidgets'])}
                            className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                          />
                          <span className="text-sm text-slate-300">{widget.label}</span>
                       </label>
                    ))}
                 </div>
              </div>
           </div>
        </section>

        {/* Update & Notification Preferences */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
           <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
              <Download className="text-blue-500" size={24} />
              <div>
                 <h2 className="text-lg font-semibold text-white">Update & Notifications</h2>
                 <p className="text-sm text-slate-400">Configure system updates.</p>
              </div>
           </div>
           <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="font-medium text-white">Auto-Update Devices</h3>
                    <p className="text-sm text-slate-500">Automatically update connected devices when a new version is available.</p>
                 </div>
                 <button 
                    onClick={() => toggleSetting('autoUpdateDevices')}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoUpdateDevices ? 'bg-emerald-600' : 'bg-slate-700'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoUpdateDevices ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                 <div>
                    <h3 className="font-medium text-white">Update Popup</h3>
                    <p className="text-sm text-slate-500">Show a popup notification when a system update is available.</p>
                 </div>
                 <button 
                    onClick={() => toggleSetting('updateNotifications')}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.updateNotifications ? 'bg-emerald-600' : 'bg-slate-700'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.updateNotifications ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>
           </div>
        </section>

        {/* Language & General Preferences */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
           <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
              <Globe className="text-indigo-500" size={24} />
              <div>
                 <h2 className="text-lg font-semibold text-white">{t.generalLanguage}</h2>
                 <p className="text-sm text-slate-400">{t.localizationDesc}</p>
              </div>
           </div>
           <div className="p-6 space-y-6">
             {/* Language Dropdown */}
             <div className="flex items-center justify-between relative">
               <div>
                 <h3 className="font-medium text-white">{t.language}</h3>
                 <p className="text-sm text-slate-500">{t.selectLang}</p>
               </div>
               <div className="relative">
                 <button 
                   onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                   className="flex items-center gap-2 bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm hover:border-slate-600 transition-colors w-48 justify-between"
                 >
                   <span>{selectedLangName}</span>
                   <ChevronDown size={16} className={`text-slate-500 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isLangMenuOpen && (
                   <>
                     <div 
                       className="fixed inset-0 z-10" 
                       onClick={() => setIsLangMenuOpen(false)}
                     />
                     <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                       {LANGUAGES.map(lang => (
                         <button
                           key={lang.code}
                           onClick={() => {
                             onLanguageChange(lang.code);
                             setIsLangMenuOpen(false);
                           }}
                           className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 flex items-center justify-between group"
                         >
                           <span>{lang.name}</span>
                           {language === lang.code && <Check size={16} className="text-blue-400" />}
                         </button>
                       ))}
                     </div>
                   </>
                 )}
               </div>
             </div>

             <div className="border-t border-slate-800 pt-6 flex items-center justify-between">
               <div>
                 <h3 className="font-medium text-white">{t.refreshRate}</h3>
                 <p className="text-sm text-slate-500">{t.refreshDesc}</p>
               </div>
               <select 
                 value={refreshRate}
                 onChange={(e) => onRefreshRateChange(Number(e.target.value))}
                 className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
               >
                 <option value={1000}>1 Second</option>
                 <option value={2000}>2 Seconds</option>
                 <option value={5000}>5 Seconds</option>
               </select>
             </div>
           </div>
        </section>

        {/* Device IDs Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <div className="flex items-center gap-3">
               <Key className="text-blue-500" size={24} />
               <div>
                 <h2 className="text-lg font-semibold text-white">{t.deviceIds}</h2>
                 <p className="text-sm text-slate-400">{t.deviceIdsDesc}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowIds(!showIds)}
              className="text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              {showIds ? t.hideIds : t.showIds}
            </button>
          </div>
          
          <div className="divide-y divide-slate-800">
            {devices.map(device => (
              <div key={device.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-white mb-1">{device.name}</h3>
                  <p className="text-xs text-slate-500">{device.ip}</p>
                </div>
                <div className="flex-1 md:text-right">
                  <code className="bg-slate-950 px-4 py-2 rounded border border-slate-800 text-sm font-mono text-slate-300">
                    {showIds ? device.id : '••••••••-••••-••••-••••-••••••••••••'}
                  </code>
                </div>
              </div>
            ))}
            {devices.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                {translations[language]?.noDevices || translations['en'].noDevices}
              </div>
            )}
          </div>
        </section>

         <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
           <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
              <Bell className="text-amber-500" size={24} />
              <div>
                 <h2 className="text-lg font-semibold text-white">{t.localAlerts}</h2>
                 <p className="text-sm text-slate-400">{t.alertsDesc}</p>
              </div>
           </div>
           <div className="p-6">
              <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                 <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                    <Shield size={20} />
                 </div>
                 <div className="flex-1">
                    <p className="text-sm font-medium text-white">{t.highCpuAlert}</p>
                    <p className="text-xs text-slate-500">{t.highCpuDesc}</p>
                 </div>
                 <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                 </div>
              </div>
           </div>
         </section>
      </div>
    </div>
  );
};

export default Settings;
