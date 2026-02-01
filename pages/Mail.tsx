import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail as MailIcon, Send, Search, Plus, Trash2, Reply, ChevronDown, CheckCheck, Square, CheckSquare } from 'lucide-react';
import { Mail, User } from '../types';
import { translations } from '../translations';
import { api } from '../services/api';

interface MailPageProps {
  currentUser: User;
  users: User[];
  mails: Mail[];
  onSendMail: (toId: string, subject: string, body: string) => void;
  language: string;
}

const MailPage: React.FC<MailPageProps> = ({ currentUser, users, mails, onSendMail, language }) => {
  const t = translations[language] || translations['en'];
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'compose' ? 'compose' : 'inbox';
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Compose State
  const [toUser, setToUser] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const selectedMail = mails.find(m => m.id === selectedMailId) || null;
  const myMails = mails.filter(m => m.toId === currentUser.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setView = (newView: 'inbox' | 'compose') => {
    setSearchParams({ view: newView });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const target = users.find(u => u.username === toUser);
    if (target) {
      onSendMail(target.id, subject, body);
      setView('inbox');
      setToUser('');
      setSubject('');
      setBody('');
    } else {
      alert("User not found");
    }
  };

  const handleDelete = async (id: string) => {
      await api.deleteMail(id);
      if (selectedMailId === id) setSelectedMailId(null);
      setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
      });
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      await api.deleteMails(Array.from(selectedIds));
      if (selectedMailId && selectedIds.has(selectedMailId)) {
          setSelectedMailId(null);
      }
      setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleAll = () => {
      if (selectedIds.size === myMails.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(myMails.map(m => m.id)));
      }
  };

  const handleMarkAllRead = async () => {
      await api.markAllMailsRead(currentUser.id);
  };

  const getSenderName = (id: string) => users.find(u => u.id === id)?.username || "Unknown";
  const filteredUsers = users.filter(u => u.id !== currentUser.id && u.username.toLowerCase().includes(toUser.toLowerCase()));

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar List */}
      <div className="w-80 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shrink-0">
         <div className="p-4 border-b border-slate-800 space-y-3">
            {selectedIds.size > 0 ? (
                <button 
                  onClick={handleBulkDelete}
                  className="w-full py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors bg-rose-600 hover:bg-rose-500 text-white animate-in slide-in-from-top-1 duration-200"
                >
                   <Trash2 size={18} /> Delete ({selectedIds.size})
                </button>
            ) : (
                <button 
                  onClick={() => { setView('compose'); setSelectedMailId(null); }}
                  className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                    view === 'compose' ? 'bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                   <Plus size={18} /> {t.compose}
                </button>
            )}
            
            <div className="flex gap-2">
                <button 
                    onClick={toggleAll}
                    className="flex-1 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center justify-center gap-2 transition-colors"
                >
                    {selectedIds.size === myMails.length && myMails.length > 0 ? <CheckSquare size={14} className="text-blue-400" /> : <Square size={14} />} 
                    {selectedIds.size === myMails.length ? "Deselect All" : "Select All"}
                </button>
                <button 
                    onClick={handleMarkAllRead}
                    className="flex-1 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center justify-center gap-2 transition-colors"
                    title="Mark all as read"
                >
                    <CheckCheck size={14} /> Read All
                </button>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto">
            {myMails.length === 0 ? (
               <div className="p-8 text-center text-slate-500 text-sm">{t.noMails}</div>
            ) : (
               myMails.map(mail => (
                  <div 
                    key={mail.id} 
                    onClick={() => { setSelectedMailId(mail.id); setView('inbox'); }}
                    className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors group relative flex gap-3 ${selectedMailId === mail.id && view === 'inbox' ? 'bg-slate-800 border-l-2 border-l-blue-500 pl-[14px]' : ''}`}
                  >
                     <div 
                        onClick={(e) => { e.stopPropagation(); toggleSelection(mail.id); }}
                        className="pt-1 text-slate-500 hover:text-blue-400"
                     >
                        {selectedIds.has(mail.id) ? (
                            <CheckSquare size={18} className="text-blue-500" />
                        ) : (
                            <Square size={18} />
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                         <div className="flex justify-between mb-1">
                            <span className={`text-sm font-medium ${!mail.read ? 'text-white' : 'text-slate-300'}`}>{getSenderName(mail.fromId)}</span>
                            <span className="text-xs text-slate-500">{new Date(mail.timestamp).toLocaleDateString()}</span>
                         </div>
                         <div className={`text-sm mb-1 truncate ${!mail.read ? 'text-white font-medium' : 'text-slate-400'}`}>{mail.subject}</div>
                         <div className="text-xs text-slate-500 truncate">{mail.body}</div>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
         {view === 'compose' ? (
            <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-200">
               <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Send size={24} className="text-blue-400" /> {t.compose}
               </h2>
               <form onSubmit={handleSend} className="flex-1 flex flex-col gap-4">
                  <div className="relative" ref={suggestionRef}>
                     <label className="block text-xs font-medium text-slate-500 mb-1">To (Username)</label>
                     <div className="relative">
                        <input 
                           type="text"
                           className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 outline-none"
                           value={toUser}
                           onChange={e => { setToUser(e.target.value); setShowSuggestions(true); }}
                           onFocus={() => setShowSuggestions(true)}
                           placeholder="Search user..."
                           required
                           autoComplete="off"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <div 
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-white"
                            onClick={() => setShowSuggestions(!showSuggestions)}
                        >
                            <ChevronDown size={16} />
                        </div>
                     </div>
                     {showSuggestions && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                           {filteredUsers.length > 0 ? (
                              filteredUsers.map(u => (
                                 <div 
                                    key={u.id}
                                    onClick={() => { setToUser(u.username); setShowSuggestions(false); }}
                                    className="px-4 py-3 hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors border-b border-slate-700/50 last:border-0"
                                 >
                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                       {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                       <div className="text-sm text-white font-medium">{u.username}</div>
                                       <div className="text-xs text-slate-400">{u.role}</div>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <div className="px-4 py-3 text-sm text-slate-500">No users found.</div>
                           )}
                        </div>
                     )}
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-slate-500 mb-1">{t.subject}</label>
                     <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        required
                     />
                  </div>
                  <div className="flex-1">
                     <textarea 
                        className="w-full h-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none resize-none font-sans"
                        placeholder="Type your message..."
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        required
                     />
                  </div>
                  <div className="flex justify-end">
                     <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-900/20">
                        <Send size={18} /> {t.send}
                     </button>
                  </div>
               </form>
            </div>
         ) : selectedMail ? (
            <div className="flex-1 flex flex-col animate-in fade-in duration-200">
               <div className="p-6 border-b border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                      <h2 className="text-2xl font-bold text-white">{selectedMail.subject}</h2>
                      <button onClick={() => handleDelete(selectedMail.id)} className="text-slate-500 hover:text-rose-500 transition-colors" title="Delete Email">
                          <Trash2 size={20} />
                      </button>
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg border border-slate-600">
                           {getSenderName(selectedMail.fromId)[0].toUpperCase()}
                        </div>
                        <div>
                           <div className="text-sm font-medium text-white">{getSenderName(selectedMail.fromId)}</div>
                           <div className="text-xs text-slate-500">To: Me</div>
                        </div>
                     </div>
                     <span className="text-sm text-slate-500">{new Date(selectedMail.timestamp).toLocaleString()}</span>
                  </div>
               </div>
               <div className="flex-1 p-6 text-slate-300 whitespace-pre-wrap leading-relaxed overflow-y-auto font-sans text-base">
                  {selectedMail.body}
               </div>
               <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
                   <button 
                     onClick={() => {
                        setView('compose');
                        setToUser(getSenderName(selectedMail.fromId));
                        setSubject(`Re: ${selectedMail.subject}`);
                     }}
                     className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-slate-700"
                   >
                      <Reply size={16} /> Reply
                   </button>
               </div>
            </div>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
               <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <MailIcon size={40} className="text-slate-600" />
               </div>
               <p className="font-medium">Select a message to read</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default MailPage;
