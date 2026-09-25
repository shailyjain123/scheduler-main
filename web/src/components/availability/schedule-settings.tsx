'use client';

interface ScheduleSettingsProps {
  timezone?: string;
}

export default function ScheduleSettings({ timezone = 'UTC' }: ScheduleSettingsProps) {
  return (
    <section className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 mt-4">
      <h4 className="text-lg font-bold text-slate-900 mb-4">Schedule Settings</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Date range</label>
          <p className="text-sm font-semibold text-slate-700">Indefinitely</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Timezone</label>
          <p className="text-sm font-semibold text-slate-700">{timezone}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Minimum notice</label>
          <p className="text-sm font-semibold text-slate-700">2 hours</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Max bookings per day</label>
          <p className="text-sm font-semibold text-slate-700">8 slots</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Buffer before</label>
          <p className="text-sm font-semibold text-slate-700">5 minutes</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Buffer after</label>
          <p className="text-sm font-semibold text-slate-700">10 minutes</p>
        </div>
      </div>
    </section>
  );
}
