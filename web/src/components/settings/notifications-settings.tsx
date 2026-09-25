'use client';

import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';

const TOGGLE_CLASSES = "w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5C6EFF]";

export default function NotificationsSettings() {
  return (
    <div className="grid grid-cols-12 gap-6 pb-20">
      {/* Left Column */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <EmailRemindersCard />
        <SMSRemindersCard />
      </div>

      {/* Right Column */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <PushNotificationsCard />
        
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C6EFF]/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-[#5C6EFF]/20" />
          
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#5C6EFF]">info</span>
            </div>
            <h4 className="text-base font-bold mb-4 tracking-tight uppercase">Communication</h4>
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-6 uppercase tracking-wider">
              Control how you and your guests are notified about upcoming meetings and changes.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[#5C6EFF] text-sm mt-0.5">mail</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Email confirmations</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[#5C6EFF] text-sm mt-0.5">sms</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">SMS alerts</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[#5C6EFF] text-sm mt-0.5">notification_important</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Browser notifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailRemindersCard() {
  const { settings, updateSettings, updateReminder, addReminder, removeReminder } = useSettingsStore();
  if (!settings) return null;

  return (
    <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#5C6EFF] text-xl">mail</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900">Email Reminders</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={settings.email_reminders_enabled}
            onChange={(e) => updateSettings({ email_reminders_enabled: e.target.checked })}
          />
          <div className={TOGGLE_CLASSES}></div>
        </label>
      </div>

      <div className="space-y-3 mb-6">
        {settings.email_reminders_config.map((reminder, idx) => (
          <div key={idx} className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-[#f0f1f3] ${!reminder.enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
              <span>Send reminder</span>
              <select 
                className="bg-white border-[#f0f1f3] rounded-lg text-[10px] font-bold focus:ring-4 focus:ring-[#5C6EFF]/5 py-1 px-2 outline-none appearance-none"
                value={reminder.offset}
                onChange={(e) => updateReminder('email', idx, { offset: e.target.value })}
              >
                <option>24 hours before</option>
                <option>1 hour before</option>
                <option>15 minutes before</option>
              </select>
              <span>to {reminder.recipient}</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer scale-75">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={reminder.enabled}
                  onChange={(e) => updateReminder('email', idx, { enabled: e.target.checked })}
                />
                <div className={TOGGLE_CLASSES}></div>
              </label>
              <button 
                onClick={() => removeReminder('email', idx)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={() => addReminder('email')}
          className="text-[#5C6EFF] font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-80 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add_circle</span> Add reminder
        </button>
      </div>
    </section>
  );
}

function SMSRemindersCard() {
  const { settings, updateSettings, updateReminder, addReminder, removeReminder } = useSettingsStore();
  if (!settings) return null;

  return (
    <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#16A34A] text-xl">chat_bubble</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900">SMS Reminders</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={settings.sms_reminders_enabled}
            onChange={(e) => updateSettings({ sms_reminders_enabled: e.target.checked })}
          />
          <div className={TOGGLE_CLASSES}></div>
        </label>
      </div>
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-6 ml-12">Requires phone number from guests during booking.</p>

      <div className="space-y-3 mb-6">
        {settings.sms_reminders_config.map((reminder, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-[#f0f1f3]">
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
              <span>Send SMS</span>
              <select 
                className="bg-white border-[#f0f1f3] rounded-lg text-[10px] font-bold focus:ring-4 focus:ring-[#5C6EFF]/5 py-1 px-2 outline-none appearance-none"
                value={reminder.offset}
                onChange={(e) => updateReminder('sms', idx, { offset: e.target.value })}
              >
                <option>30 minutes before</option>
                <option>1 hour before</option>
                <option>15 minutes before</option>
              </select>
              <span>to {reminder.recipient}</span>
            </div>
            <button 
              onClick={() => removeReminder('sms', idx)}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ))}
      </div>

      <button 
        onClick={() => addReminder('sms')}
        className="text-[#5C6EFF] font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-80 flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-base">add_circle</span> Add reminder
      </button>
    </section>
  );
}

function PushNotificationsCard() {
  const { settings, updateSettings } = useSettingsStore();
  if (!settings) return null;

  const config = settings.push_notifications_config;

  const updateConfig = (key: keyof typeof config, value: boolean) => {
    updateSettings({ push_notifications_config: { ...config, [key]: value } });
  };

  const options = [
    { key: 'new_booking', label: 'New booking' },
    { key: 'cancellation', label: 'Cancellation' },
    { key: 'reschedule', label: 'Reschedule' },
    { key: 'meeting_soon', label: 'Meeting starting soon' },
    { key: 'no_show', label: 'No-show reported' },
  ] as const;

  return (
    <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] flex items-center justify-center">
          <span className="material-symbols-outlined text-[#8B5CF6] text-xl">notifications_active</span>
        </div>
        <h3 className="text-base font-semibold text-slate-900">Push Notifications</h3>
      </div>
      
      <div className="space-y-1">
        {options.map((opt) => (
          <div key={opt.key} className="flex items-center justify-between py-3 px-1 border-b border-slate-50 last:border-0 group">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-[#5C6EFF] transition-colors">{opt.label}</span>
            <label className="relative inline-flex items-center cursor-pointer scale-75">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={config[opt.key]}
                onChange={(e) => updateConfig(opt.key, e.target.checked)}
              />
              <div className={TOGGLE_CLASSES}></div>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
