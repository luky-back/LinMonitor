import React, { useState } from 'react';
import { User, UserRole, InviteCode } from '../types';
import { translations } from '../translations';
import { UserPlus, Shield, User as UserIcon, Lock, Check, X, ChevronDown, Trash2 } from 'lucide-react';

interface UsersPageProps {
  currentUser: User;
  users: User[];
  invites: InviteCode[];
  language: string;
  onCreateInvite: (role: UserRole) => void;
  onRequestInvite: () => void;
  onDeleteInvite: (code: string) => void;
}

const UsersPage: React.FC<UsersPageProps> = ({ currentUser, users, invites, language, onCreateInvite, onRequestInvite, onDeleteInvite }) => {
  const t = translations[language] || translations['en'];
  const [selectedRole, setSelectedRole] = useState<UserRole>('Guest');

  const canCreateInvite = currentUser.role === 'Owner';
  const canRequestInvite = currentUser.role === 'Admin';

  const roleColor = (role: UserRole) => {
    switch (role) {
      case 'Owner': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Admin': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Data Researcher': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Suggestioner': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const calculateTimeLeft = (expiresAt: number) => {
    const diff = Math.max(0, expiresAt - Date.now());
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update timers every second
  const [_, setTick] = useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
         <div>
            <h1 className="text-2xl font-bold text-white">{t.directory}</h1>
            <p className="text-slate-400">Manage users and roles.</p>
         </div>

         <div className="flex gap-4">
            {canCreateInvite && (
               <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                  <div className="relative">
                    <select 
                       value={selectedRole}
                       onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                       className="appearance-none bg-slate-950 text-white text-sm border border-slate-700 rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                       <option value="Admin">Admin</option>
                       <option value="Data Researcher">Data Researcher</option>
                       <option value="Suggestioner">Suggestioner</option>
                       <option value="Guest">Guest</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button 
                     onClick={() => onCreateInvite(selectedRole)}
                     className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md font-medium transition-colors flex items-center gap-1"
                  >
                     <UserPlus size={16} /> {t.createInvite}
                  </button>
               </div>
            )}
            {canRequestInvite && (
               <button 
                  onClick={onRequestInvite}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
               >
                  <Shield size={18} /> {t.requestInvite}
               </button>
            )}
         </div>
      </div>

      {/* Active Invites (Owner Only) */}
      {canCreateInvite && invites.length > 0 && (
         <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
               <h3 className="font-semibold text-white flex items-center gap-2">
                  <Lock size={18} className="text-emerald-400" /> Active Invite Codes
               </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
               {invites.map((invite, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center relative overflow-hidden group hover:border-slate-600 transition-colors">
                     <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Code</div>
                        <div className="text-2xl font-mono font-bold text-emerald-400 tracking-widest">{invite.code}</div>
                        <div className="text-xs text-slate-400 mt-2">Role: <span className="text-white">{invite.role}</span></div>
                     </div>
                     <div className="flex flex-col items-end gap-2">
                        <div>
                           <div className="text-xs text-slate-500 text-right">{t.expiresIn}</div>
                           <div className="text-sm text-white font-mono text-right">{calculateTimeLeft(invite.expiresAt)}</div>
                        </div>
                        <button 
                           onClick={() => onDeleteInvite(invite.code)}
                           className="p-2 bg-rose-500/10 text-rose-500 rounded-md hover:bg-rose-500 hover:text-white transition-colors"
                           title="Revoke Invite"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* User Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {users.map(user => (
            <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4 transition-all hover:border-slate-600 hover:bg-slate-800/50 group">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-colors`}>
                  {user.username.charAt(0).toUpperCase()}
               </div>
               <div>
                  <h3 className="text-lg font-bold text-white">{user.username}</h3>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mt-1 ${roleColor(user.role)}`}>
                     {user.role}
                  </span>
                  <div className="text-xs text-slate-500 mt-1">Joined: {new Date(user.joinedAt).toLocaleDateString()}</div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default UsersPage;