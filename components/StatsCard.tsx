import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon: any;
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose';
}

const colorMap = {
  blue: 'text-blue-400 bg-blue-400/10',
  purple: 'text-purple-400 bg-purple-400/10',
  emerald: 'text-emerald-400 bg-emerald-400/10',
  amber: 'text-amber-400 bg-amber-400/10',
  rose: 'text-rose-400 bg-rose-400/10',
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, unit, trend, icon: Icon, color }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all hover:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{value}</span>
        {unit && <span className="text-slate-500 text-sm">{unit}</span>}
      </div>
    </div>
  );
};

export default StatsCard;