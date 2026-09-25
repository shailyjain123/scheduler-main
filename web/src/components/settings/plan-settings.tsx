import React, { useState, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

// Matching backend service logic
const STATIC_RATES: Record<string, number> = {
  "USD": 1.0,
  "EUR": 0.92,
  "INR": 83.0,
  "GBP": 0.79
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  "USD": "$",
  "EUR": "€",
  "INR": "₹",
  "GBP": "£"
};

const PLAN_RANK: Record<string, number> = { 
  "free": 0, 
  "starter": 1, 
  "pro": 2, 
  "enterprise": 3, 
  "ultimate": 4, 
  "premium": 5 
};

const PLANS_DATA = [
  {
    id: 'premium',
    name: 'Premium',
    monthlyPriceUsd: 199,
    credits: '100,000',
    speed: 6,
    features: [
      { text: 'Custom Dedicated Resources', bold: true },
      { text: 'SAML / SSO Integration', bold: true },
      { text: 'Priority 24/7 Support', bold: true },
      { text: 'Custom Workflow Automations', bold: true },
      { text: 'Everything in Ultimate', bold: true }
    ],
    isPaid: true
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    monthlyPriceUsd: 99,
    credits: '25,000',
    speed: 5,
    features: [
      { text: 'Unlimited Basic Bookings', bold: true },
      { text: 'Strict Email Verification', bold: true },
      { text: 'Advanced Workload Limits', bold: true },
      { text: 'Team Analytics Dashboard', bold: true },
      { text: 'Everything in Enterprise', bold: true }
    ],
    isPaid: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPriceUsd: 49,
    credits: '6,250',
    speed: 4,
    features: [
      { text: 'Advanced Buffer Settings', bold: true },
      { text: 'Daily Booking Limits', bold: true },
      { text: 'Team Management Tools', bold: true },
      { text: 'Everything in Pro', bold: true }
    ],
    isPaid: true
  },
  {
    id: 'pro',
    name: 'Professional',
    monthlyPriceUsd: 15,
    credits: '1,250',
    speed: 3,
    features: [
      { text: 'Strict Email Verification', bold: true },
      { text: 'Disposable Email Blocking', bold: true },
      { text: 'Everything in Starter', bold: true }
    ],
    isPaid: true
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceUsd: 8,
    credits: '250',
    speed: 2,
    features: [
      { text: '3 Active Event Types', bold: true },
      { text: 'Basic Buffer Settings', bold: true },
      { text: 'Calendar Sync', bold: true },
      { text: 'Everything in Free', bold: true }
    ],
    isPaid: true
  },
  {
    id: 'free',
    name: 'Free',
    monthlyPriceUsd: 0,
    credits: '25',
    speed: 1,
    features: [
      { text: 'Unlimited Basic Bookings', bold: true },
      { text: '1:1 Scheduling', bold: true },
      { text: 'Standard Notifications', bold: true },
      { text: 'Email Format Validation', bold: true }
    ],
    isPaid: false
  }
];

export default function PlanSettings() {
  return (
    <div className="bg-[#F8FAFC]/50 min-h-[80vh] -m-6 p-10 flex flex-col items-center justify-center text-center">
      <div className="bg-white p-12 rounded-3xl border border-slate-200/60 shadow-[0_8px_40px_rgba(0,0,0,0.03)] max-w-lg w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#5C6EFF]/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF0FF] text-[#5C6EFF] flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Plan Management Locked</h2>
          <p className="text-sm font-semibold text-slate-500 leading-relaxed mb-6">
            We are currently upgrading our subscription and billing systems. Full plan management functionality will resume in the near future.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-3">
             <span className="material-symbols-outlined text-slate-400 text-lg">info</span>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Existing subscriptions are unaffected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
