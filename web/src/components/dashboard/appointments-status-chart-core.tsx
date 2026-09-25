'use client';

import { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';
import { AppointmentsStatusItem } from '@/lib/types/dashboard';

interface AppointmentsStatusChartProps {
  data: AppointmentsStatusItem[];
  isLoading?: boolean;
}

const COLORS = {
  Scheduled: '#5C6EFF',
  Completed: '#16A34A',
  Cancelled: '#EF4444',
  'No-shows': '#F59E0B'
};

export default function AppointmentsStatusChartCore({ data, isLoading = false }: AppointmentsStatusChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const filteredData = data.filter(d => ['Scheduled', 'Completed', 'Cancelled'].includes(d.name) && d.value > 0);
  const total = filteredData.reduce((acc, curr) => acc + curr.value, 0);

  const renderCustomLegend = () => (
    <ul className="flex flex-col space-y-4 pl-8">
      {filteredData.map((entry, index) => {
        const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
        return (
          <li key={`item-${index}`} className="flex items-center text-[13px]">
            <span className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] || '#ccc' }} />
            <span className="font-medium text-slate-700 w-24">{entry.name}</span>
            <span className="font-semibold text-slate-900">{percentage}% ({entry.value})</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] flex flex-col h-full relative">
      <div className="mb-4">
        <h4 className="text-[17px] font-bold text-slate-900 tracking-tight">Appointments by Status</h4>
      </div>
      <div className={cn("flex-1 min-h-[300px] min-w-0 w-full relative flex items-center transition-opacity duration-500", isLoading && "opacity-40 pointer-events-none")}>

        {total === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
            <span className="material-symbols-outlined text-4xl mb-3 font-light">pie_chart</span>
            <p className="text-[12px] font-bold uppercase tracking-widest">No data available</p>
          </div>
        ) : isMounted ? (
          <div className="flex items-center w-full h-full">
            <div className="w-[55%] h-[250px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={filteredData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                    {filteredData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f0f1f3', boxShadow: '0 4px 20px rgba(17,24,39,0.08)' }} itemStyle={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }} formatter={(value: any) => [`${value} appointments`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-[45%]">{renderCustomLegend()}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
