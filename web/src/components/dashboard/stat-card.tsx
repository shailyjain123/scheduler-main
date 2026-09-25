'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  icon: string;
  iconBg: string;
  iconColor: string;
}

export default function StatCard({ title, value, trend, trendType, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] hover:translate-y-[-1.5px] transition-all border border-[#f0f1f3]">
      <div className="flex justify-between items-start mb-3">
        <div className={`w-9 h-9 ${iconBg} ${iconColor} rounded-lg flex items-center justify-center`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
        {trend && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            trendType === 'up' ? 'bg-[#DCFCE7] text-[#16A34A]' : 
            trendType === 'down' ? 'bg-[#FEE2E2] text-[#DC2626]' : 
            'bg-slate-100 text-slate-500'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">{title}</p>
      <h3 className="text-xl font-bold text-slate-900 tracking-tight">{value}</h3>
    </div>
  );
}
