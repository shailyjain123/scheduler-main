import React from 'react';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full bg-surface">
      {/* Left Section: 55% Branding & Value Prop */}
      <section className="hidden lg:flex lg:w-[55%] bg-[#EEF0FF] min-h-screen flex-col p-12 relative overflow-hidden">
        {/* Brand Anchor */}
        <div className="flex items-center gap-2 mb-auto">
          <span className="material-symbols-outlined text-primary text-2xl">calendar_today</span>
          <span className="text-xl font-bold tracking-tighter text-[#5C6EFF]">Schedulr</span>
        </div>
        
        {/* Value Proposition */}
        <div className="z-10 mt-8">
          <h1 className="text-3xl font-bold leading-tight text-on-background max-w-[400px]">
            Schedule smarter. Meet better.
          </h1>
          <p className="mt-3 text-on-surface-variant text-[15px] max-w-[380px] leading-relaxed">
            AI-powered scheduling that eliminates back-and-forth, reduces no-shows, and runs on autopilot.
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-semibold tracking-tight shadow-sm">
              <span className="ai-gradient-text mr-1">✦</span> Smart Suggestions
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-semibold tracking-tight shadow-sm">
              <span className="ai-gradient-text mr-1">✦</span> Auto Reminders
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-semibold tracking-tight shadow-sm">
              <span className="ai-gradient-text mr-1">✦</span> Zero Double Booking
            </span>
          </div>
        </div>

        {/* Illustration Area */}
        <div className="mt-8 relative h-full">
          {/* Abstract Calendar Card */}
          <div className="absolute left-0 top-8 w-[380px] ai-glass rounded-xl shadow-[0_16px_48px_rgba(17,24,39,0.06)] p-5 z-20 transform -rotate-1">
            <div className="flex justify-between items-center mb-5">
              <div className="text-[13px] font-bold text-on-surface">September 2024</div>
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-outline text-base">chevron_left</span>
                <span className="material-symbols-outlined text-outline text-base">chevron_right</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-3 text-center text-[9px] font-medium text-outline">
              <span>MO</span><span>TU</span><span>WE</span><span>TH</span><span>FR</span><span>SA</span><span>SU</span>
              <span className="text-outline-variant">28</span><span className="text-outline-variant">29</span><span className="text-outline-variant">30</span><span>1</span><span>2</span><span>3</span><span>4</span>
              <span>5</span><span>6</span><span className="bg-primary text-white rounded-full h-5 w-5 flex items-center justify-center mx-auto">7</span><span>8</span><span>9</span><span>10</span><span>11</span>
            </div>
          </div>
          
          {/* Meeting Card */}
          <div className="absolute left-32 top-40 w-[280px] bg-surface-container-lowest rounded-xl shadow-[0_20px_60px_rgba(54,73,219,0.1)] p-4 z-30 transform rotate-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-on-surface">Product Sync</div>
                <div className="text-[9px] text-outline mt-0.5">10:30 AM - 11:15 AM</div>
              </div>
              <div className="flex -space-x-1.5">
                <Image 
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full border-2 border-white object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0Tvd46Iu9B78EQgK_bo-f0rGJIrq_C5G2hlPKZzhzuDUbrwMxeydohf0Taao_ibRVpRYNcoPrzySsRvzZsXUaNOc29HQKEEUT5pH1iVY4xhfXk2nvFVYzxwwDNinQWWYyEQ-KOgxSIhQR07HIC4Pxndso2eozb2CrG45oD_9xwwzyMAutbggotTGyxZ3RnEn3vnJPDBwZXAA-AofXwni4dN7aypWpDIyvPZ1svwykzNMYwzhF4KbwX-ks4g5ViGsAXOW4uLnRo95C" 
                  alt="User" 
                />
                <Image 
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full border-2 border-white object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7xXo37PdCL061NshbVGvp8RtRJuy0satedryKmooAkQljHs7S8x-aB-K4V5aW9vRQ3mmD1U1tHrL53B___ZWGlJBhl68qkBftMJnEe9qTsGAINklggQRoQRk1sI7IzPs6Gj_KzI2l85dbBY2ps8x6mylj2GWeckjqF8mrA7lV2nEQZBJHBTeriyvx1tCo2fgTyAuWa9Xko7mqDg7ZhgqtXi1KGbbsXsCS4SVFUfFITekl_uMyQM8tMMcUo1FWMlEnuEO62ZV9OzFx" 
                  alt="User" 
                />
              </div>
            </div>
            <div className="mt-3 inline-flex items-center px-2 py-0.5 bg-primary/5 rounded-md">
              <span className="material-symbols-outlined text-primary text-[13px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="ai-gradient-text text-[9px] font-bold">AI Recommended</span>
            </div>
          </div>
          
          {/* Time Slot Bubbles */}
          <div className="absolute right-16 top-0 space-y-2 z-10 opacity-60">
            <div className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-medium text-primary shadow-sm border border-primary/10">09:00 AM</div>
            <div className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-medium text-primary shadow-sm border border-primary/10">01:30 PM</div>
            <div className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-medium text-primary shadow-sm border border-primary/10">04:00 PM</div>
          </div>
        </div>
      </section>

      {/* Right Section: 45% Auth Content */}
      <section className="w-full lg:w-[45%] bg-white flex items-center justify-center p-6">
        {children}
      </section>
    </main>
  );
}
