'use client';

import { useState } from 'react';

interface QuickBlockProps {
  onApply: (from: string, to: string) => Promise<void>;
  disabled?: boolean;
}

export default function QuickBlock({ onApply, disabled = false }: QuickBlockProps) {
  const [fromDate, setFromDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const hasRangeConflict = !!fromDate && !!toDate && toDate < fromDate;

  const apply = async () => {
    if (disabled) return;
    if (!fromDate || !toDate || hasRangeConflict) return;
    setLoading(true);
    try {
      await onApply(fromDate, toDate);
      setFromDate('');
      setToDate('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-6 mt-6">
      <h4 className="font-bold text-slate-900 mb-4">Quick Block</h4>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
          <input
            className={`w-full bg-slate-50 border rounded-lg text-xs py-2 px-2 focus:ring-2 focus:ring-[#5C6EFF]/10 outline-none ${hasRangeConflict ? 'border-red-300 bg-red-50/60' : 'border-slate-200'}`}
            type="date"
            value={fromDate}
            disabled={disabled}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
          <input
            className={`w-full bg-slate-50 border rounded-lg text-xs py-2 px-2 focus:ring-2 focus:ring-[#5C6EFF]/10 outline-none ${hasRangeConflict ? 'border-red-300 bg-red-50/60' : 'border-slate-200'}`}
            type="date"
            value={toDate}
            disabled={disabled}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>
      {hasRangeConflict && (
        <p className="text-[11px] font-semibold text-red-600 mb-3">To date cannot be earlier than From date.</p>
      )}
      <button
        onClick={apply}
        disabled={disabled || loading || !fromDate || !toDate || hasRangeConflict}
        className="w-full bg-[#EF4444] text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 transition-all shadow-sm active:scale-95 disabled:opacity-60"
      >
        {loading ? 'Blocking...' : 'Block Dates'}
      </button>
    </section>
  );
}
