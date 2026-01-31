import React, { useState } from 'react';
import { ShieldAlert, AlertOctagon } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  warning: string;
  length: number;
  t: any;
}

const generateChallenge = (length: number) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose, onConfirm, title, warning, length, t }) => {
  const [challenge] = useState(() => generateChallenge(length));
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (input === challenge) {
      onConfirm();
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.securityCheck}</h2>
              <p className="text-sm text-slate-400 mt-1">{title}</p>
            </div>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-200 text-sm mb-6">
            <AlertOctagon size={16} className="inline mr-2 mb-0.5" />
            {warning}
          </div>

          <div className="space-y-4">
             <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">{t.typeText}</p>
                <code className="text-xl font-mono text-emerald-400 font-bold select-none tracking-widest block py-2">
                   {challenge}
                </code>
             </div>
             
             <input 
                autoFocus
                type="text" 
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(false); }}
                onPaste={(e) => e.preventDefault()}
                className={`w-full bg-slate-800 border ${error ? 'border-rose-500' : 'border-slate-600'} rounded-lg p-3 text-white text-center font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors`}
                placeholder="Type here..."
             />
             {error && <p className="text-xs text-rose-500 text-center">{t.verificationFailed}</p>}
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium transition-colors"
          >
            {t.cancel}
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 font-medium shadow-lg shadow-rose-900/20 transition-colors"
          >
            {t.verify}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityModal;
