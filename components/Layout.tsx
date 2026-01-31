import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  Settings, 
  Menu,
  X,
  HardDrive,
  Mail,
  Users,
  LogOut,
  Bell
} from 'lucide-react';
import { translations } from '../translations';
import { AppSettings, User, Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  language: string;
  settings: AppSettings;
  currentUser: User;
  notifications: Notification[];
  onLogout: () => void;
  onClearNotification: (id: string) => void;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-600 shadow-blue-900/50',
  purple: 'bg-purple-600 shadow-purple-900/50',
  emerald: 'bg-emerald-600 shadow-emerald-900/50',
  amber: 'bg-amber-600 shadow-amber-900/50',
  rose: 'bg-rose-600 shadow-rose-900/50',
  indigo: 'bg-indigo-600 shadow-indigo-900/50',
  orange: 'bg-orange-600 shadow-orange-900/50',
};

const gradientMap: Record<string, string> = {
  blue: 'from-blue-500 to-indigo-600',
  purple: 'from-purple-500 to-fuchsia-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-red-600',
  indigo: 'from-indigo-500 to-violet-600',
  orange: 'from-orange-500 to-red-600',
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  language, 
  settings, 
  currentUser, 
  notifications,
  onLogout,
  onClearNotification
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const t = translations[language] || translations['en'];

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
          isActive 
            ? `${colorMap[settings.accentColor]} text-white shadow-lg` 
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <Icon size={20} className="transition-transform group-hover:scale-110" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 
          transform transition-transform duration-300 ease-in-out lg:transform-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientMap[settings.accentColor]} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
              P
            </div>
            <div>
               <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                 PiMonitor
               </h1>
               <span className="text-xs font-mono text-slate-500">{currentUser.role}</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem to="/" icon={LayoutDashboard} label={t.overview} />
            
            {/* Guest cannot manage devices */}
            {currentUser.role !== 'Guest' && currentUser.role !== 'Suggestioner' && (
               <SidebarItem to="/devices" icon={Server} label={t.devices} />
            )}
            
            {/* Suggestioner cannot see server specs */}
            {currentUser.role !== 'Suggestioner' && (
               <SidebarItem to="/server" icon={HardDrive} label={t.server} />
            )}

            <SidebarItem to="/mail" icon={Mail} label={t.mail} />
            
            <SidebarItem to="/users" icon={Users} label={t.users} />
            
            <SidebarItem to="/settings" icon={Settings} label={t.settings} />
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`}></div>
                  <span className="text-xs font-medium text-slate-400">{currentUser.username}</span>
               </div>
               <button 
                  onClick={onLogout}
                  className="text-slate-500 hover:text-white transition-colors"
                  title={t.logout}
               >
                  <LogOut size={16} />
               </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header (Mobile & Desktop) */}
        <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <div className="lg:hidden flex items-center gap-2">
            <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="p-2 text-slate-400 hover:text-white"
            >
               <Menu size={24} />
            </button>
            <span className="font-bold text-white">PiMonitor</span>
          </div>

          <div className="flex-1 lg:flex-none flex justify-end items-center gap-4">
             {/* Notification Bell */}
             <div className="relative">
                <button 
                   onClick={() => setIsNotifOpen(!isNotifOpen)}
                   className="p-2 text-slate-400 hover:text-white relative"
                >
                   <Bell size={20} />
                   {unreadNotifs > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900" />
                   )}
                </button>

                {isNotifOpen && (
                   <>
                     <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)} />
                     <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                        <div className="p-3 border-b border-slate-700 font-medium text-white text-sm flex justify-between">
                           <span>{t.notifications}</span>
                           <span className="text-xs text-slate-400">{unreadNotifs} New</span>
                        </div>
                        <div className="divide-y divide-slate-700">
                           {notifications.length === 0 && (
                              <div className="p-4 text-center text-xs text-slate-500">No new notifications</div>
                           )}
                           {notifications.map(notif => (
                              <div key={notif.id} className={`p-3 text-sm ${notif.read ? 'opacity-50' : 'bg-slate-700/30'}`}>
                                 <p className="text-slate-200">{notif.message}</p>
                                 {!notif.read && (
                                    <button 
                                       onClick={() => onClearNotification(notif.id)}
                                       className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                                    >
                                       Mark as read
                                    </button>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                   </>
                )}
             </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;