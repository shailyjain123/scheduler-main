'use client';

export default function AiInsights() {
  return (
    <div className="ai-border-gradient rounded-2xl bg-white p-5 shadow-xl relative overflow-hidden h-full group hover:shadow-2xl transition-all duration-500">
      <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
        <span className="material-symbols-outlined text-[48px] font-light" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      </div>
      
      <div className="flex items-center space-x-2 mb-6">
        <div className="bg-[#5C6EFF]/5 px-2.5 py-1 rounded-xl flex items-center space-x-2 border border-[#5C6EFF]/10">
          <span className="material-symbols-outlined text-[14px] text-[#5C6EFF]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#5C6EFF]">Intelligent Insights</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-3 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 animate-pulse transition-colors text-xl">analytics</span>
        </div>
        <p className="text-[13px] font-bold text-slate-800 tracking-tight mb-1.5">Analyzing your patterns...</p>
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-[180px]">
          Our AI is processing your scheduling data. Insights will appear here once ready.
        </p>
      </div>
    </div>
  );
}
