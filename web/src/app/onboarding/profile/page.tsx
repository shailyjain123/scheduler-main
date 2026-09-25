'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../services/apiClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useOnboardingProtection } from '../../../hooks/useOnboardingProtection';
import { onboardingPagePath } from '@/lib/routes';
import { detectDeviceTimezone, getAllTimezones } from '@/lib/timezones';
import { useFieldErrors } from '@/hooks/useFieldErrors';

export default function ProfilePage() {
    const validateFullName = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Full name can’t be blank.';
      }
      if (trimmed.length < 2 || trimmed.length > 50) {
        return 'Full name must be between 2 and 50 characters.';
      }
      if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmed)) {
        return 'Full name can only contain letters and single spaces.';
      }
      return '';
    };

    const validateUsername = (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Username can’t be blank.';
      }
      if (!/^[a-z0-9_]{3,20}$/.test(value)) {
        return 'Username must be 3-20 characters and only include lowercase letters, numbers, and underscores.';
      }
      return '';
    };

  // Protect this onboarding page - only users on stage 1 or earlier can access
  const protectionStatus = useOnboardingProtection(1);
  
  const { user, setAuth } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    timezone: detectDeviceTimezone(),
    work_type: null as string | null,
    default_meeting_duration: 30,
    default_buffer_time: 10,
    avatar_url: '',
  });
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const detectedTimezone = detectDeviceTimezone();
  const timezoneOptions = useMemo(() => getAllTimezones(), []);

  const filteredTimezoneOptions = useMemo(() => {
    const query = timezoneQuery.trim().toLowerCase();
    if (!query) return timezoneOptions;

    return timezoneOptions.filter((zone) =>
      zone.value.toLowerCase().includes(query) || zone.label.toLowerCase().includes(query)
    );
  }, [timezoneOptions, timezoneQuery]);

  useEffect(() => {
    if (user && !formData.full_name) {
      setFormData({
        full_name: user.full_name || '',
        username: user.username || '',
        timezone: user.timezone || detectDeviceTimezone(),
        work_type: user.work_type || null,
        default_meeting_duration: user.default_meeting_duration || 30,
        default_buffer_time: user.default_buffer_time || 10,
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user, formData.full_name]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, setFieldError, mergeFieldErrors, captureApiErrors } = useFieldErrors<{ full_name: string; username: string }>();
  const [isDragging, setIsDragging] = useState(false);
  const [isDefaultsOpen, setIsDefaultsOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const timezoneRef = useRef<HTMLDivElement>(null);

  // Close timezone dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timezoneRef.current && !timezoneRef.current.contains(event.target as Node)) {
        setIsListOpen(false);
        setIsSearching(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [timezoneRef]);

  const isFormValid =
    formData.full_name.trim().length > 0 &&
    formData.username.trim().length > 0 &&
    !fieldErrors.full_name &&
    !fieldErrors.username;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullNameError = validateFullName(formData.full_name);
    const usernameError = validateUsername(formData.username);
    
    setFieldError('full_name', fullNameError);
    setFieldError('username', usernameError);

    if (fullNameError || usernameError) {
      if (usernameError === 'Username can’t be blank.' || fullNameError === 'Full name can’t be blank.') {
        setError(null); // Clear generic error if we have specific inline errors
      } else {
        setError('Please fix the highlighted fields before continuing.');
      }
      return;
    }

    setIsLoading(true);
    setError(null);

      try {
        const response = await apiClient.post<{ user: Record<string, unknown> }>('/onboarding/profile', formData);
        if (response.success && response.data) {
          if (user) {
            setAuth({ ...user, ...response.data.user }, localStorage.getItem('token') || '');
          }
          router.push(onboardingPagePath(2));
        } else {
          captureApiErrors(response);
          setError(response.error?.message || 'Failed to save progress');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, avatar_url: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, avatar_url: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };

    const workTypes = [
      { id: 'Individual', label: 'Individual', icon: 'person' },
      { id: 'Team', label: 'Team', icon: 'group' },
      { id: 'Enterprise', label: 'Enterprise', icon: 'corporate_fare' },
    ];

    // Show loading screen while checking auth
    if (protectionStatus.isLoading || !protectionStatus.isAuthorized) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      );
    }

    return (
      <div className="w-full max-w-[640px]">
        <div className="w-full bg-white rounded-2xl shadow-[0_16px_48px_rgba(17,24,39,0.06)] p-8 border border-[#e1e2e4]">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-[#191c1e] mb-1.5">Profile setup</h2>
            <p className="text-[#454655] text-[13px]">Add your details and default scheduling preferences.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-[#ffdad6] text-[#93000a] p-3.5 rounded-xl text-[13px] font-semibold flex items-center gap-3 border border-[#ba1a1a]/10">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            {/* Profile Photo - Fully Functional Drag & Drop */}
            <div className="flex flex-col items-center">
              <div 
                className={`relative group w-20 h-20 rounded-full border-2 border-dashed transition-all cursor-pointer flex items-center justify-center overflow-hidden ${
                  isDragging ? 'border-[#5C6EFF] bg-[#5C6EFF]/5 scale-105' : 'border-[#c5c5d7] bg-[#f3f4f6] hover:border-[#5C6EFF] hover:bg-white'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.avatar_url ? (
                  <Image src={formData.avatar_url} alt="Profile" fill className="object-cover transition-transform group-hover:scale-110" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-[#757686] group-hover:text-[#5C6EFF]">
                    <span className="material-symbols-outlined text-2xl">upload</span>
                  </div>
                )}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="mt-2.5 text-center">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="text-[13px] font-bold text-[#3649db] hover:text-[#5C6EFF] transition-colors"
              >
                Upload Photo
              </button>
              <p className="text-[9px] font-bold text-[#757686] uppercase tracking-widest mt-0.5">or drag and drop</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Full Name & Username */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#191c1e] ml-1">Full Name</label>
                <input 
                  type="text"
                  required
                  className="w-full h-10 px-4 rounded-xl bg-[#f3f4f6] border border-transparent focus:border-[#5C6EFF]/20 focus:ring-4 focus:ring-[#5C6EFF]/10 focus:bg-white transition-all text-sm font-medium"
                  placeholder="Alex Rivers"
                  value={formData.full_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, full_name: value });
                    setFieldError('full_name', value ? validateFullName(value) : '');
                  }}
                />
                {fieldErrors.full_name && <p className="text-[11px] text-[#ba1a1a]">{fieldErrors.full_name}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#191c1e] ml-1">Your Username</label>
                <div className="relative group">
                  <input 
                    type="text"
                    required
                    className="w-full h-10 px-4 rounded-xl bg-[#f3f4f6] border border-transparent focus:border-[#5C6EFF]/20 focus:ring-4 focus:ring-[#5C6EFF]/10 focus:bg-white transition-all text-sm font-medium"
                    placeholder="alex_rivers"
                    value={formData.username}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
                      setFormData({ ...formData, username: value });
                      setFieldError('username', value ? validateUsername(value) : '');
                    }}
                  />
                </div>
                {fieldErrors.username && <p className="text-[11px] text-[#ba1a1a]">{fieldErrors.username}</p>}
              </div>
            </div>

            {/* Timezone - Refactored Searchable & Selectable Combobox */}
            <div className="space-y-1.5 relative" ref={timezoneRef}>
              <div className="flex justify-between items-center ml-1">
                <label className="text-[13px] font-bold text-[#191c1e]">Timezone</label>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#5C6EFF]/10 rounded-full text-[9px] font-bold text-[#5C6EFF] uppercase tracking-widest border border-[#5C6EFF]/20">
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  Auto-detected: {detectedTimezone}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#757686] z-10">
                  <span className="material-symbols-outlined text-lg">public</span>
                </div>
                <input
                  type="text"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#f3f4f6] border border-transparent focus:border-[#5C6EFF]/20 focus:ring-4 focus:ring-[#5C6EFF]/10 focus:bg-white transition-all text-sm font-semibold cursor-pointer outline-none"
                  placeholder="Search timezone..."
                  value={isSearching ? timezoneQuery : formData.timezone}
                  onFocus={() => {
                    setIsSearching(true);
                    setIsListOpen(true);
                    setTimezoneQuery('');
                  }}
                  onChange={(e) => setTimezoneQuery(e.target.value)}
                  autoComplete="off"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#757686] pointer-events-none transition-transform duration-300 z-10" style={{ transform: isListOpen ? 'rotate(180deg)' : 'none' }}>
                  <span className="material-symbols-outlined text-xl">expand_more</span>
                </div>

                {isListOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-[#e1e2e4] rounded-xl shadow-2xl max-h-[260px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredTimezoneOptions.length > 0 ? (
                      <div className="p-1.5">
                        {filteredTimezoneOptions.map((tz) => (
                          <div 
                            key={tz.value}
                            className={`px-3.5 py-2.5 rounded-lg text-sm cursor-pointer transition-all flex items-center justify-between mb-0.5 last:mb-0 ${
                              formData.timezone === tz.value 
                                ? 'bg-[#5C6EFF] text-white font-bold' 
                                : 'text-slate-700 font-semibold hover:bg-[#f3f4f6]'
                            }`}
                            onClick={() => {
                              setFormData({ ...formData, timezone: tz.value });
                              setIsSearching(false);
                              setIsListOpen(false);
                            }}
                          >
                            <span>{tz.label}</span>
                            {formData.timezone === tz.value && (
                              <span className="material-symbols-outlined text-sm font-bold">check</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-6 py-10 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                          <span className="material-symbols-outlined text-2xl">search_off</span>
                        </div>
                        <p className="text-[13px] text-slate-500 font-medium">No timezones found for &quot;{timezoneQuery}&quot;</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-[#757686] ml-1 uppercase tracking-tight opacity-70">
                Current selection: <span className="text-[#5C6EFF]">{formData.timezone}</span>
              </p>
            </div>

            {/* Work TypeGrid */}
            <div className="space-y-3.5">
              <label className="text-[13px] font-bold text-[#191c1e] ml-1">How do you work?</label>
              <div className="grid grid-cols-3 gap-4">
                {workTypes.map((type) => (
                  <div 
                    key={type.id}
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      work_type: prev.work_type === type.id ? null : type.id 
                    }))}
                    className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      formData.work_type === type.id 
                        ? 'border-[#5C6EFF] bg-[#5C6EFF]/5 shadow-sm' 
                        : 'border-[#e1e2e4] bg-[#f8f9fb] hover:border-[#5C6EFF]/50 group'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl ${
                      formData.work_type === type.id ? 'text-[#5C6EFF]' : 'text-[#757686] group-hover:text-[#191c1e]'
                    }`}>
                      {type.icon}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      formData.work_type === type.id ? 'text-[#5C6EFF]' : 'text-[#454655] group-hover:text-[#191c1e]'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Collapsible Scheduling Defaults */}
            <div className="pt-5 border-t border-[#e1e2e4]">
              <div 
                className="flex items-center justify-between group cursor-pointer"
                onClick={() => setIsDefaultsOpen(!isDefaultsOpen)}
              >
                <h3 className="text-[13px] font-bold text-[#191c1e] flex items-center gap-2">
                  Scheduling Defaults
                  <span className="px-2 py-0.5 bg-gradient-to-br from-[#5C6EFF] to-[#A78BFA] text-[8px] text-white rounded-full font-bold uppercase tracking-wider shadow-sm">✦ Smart</span>
                </h3>
                <span className={`material-symbols-outlined text-[#757686] transition-transform duration-300 ${isDefaultsOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
              
              <div className={`grid grid-cols-2 gap-5 overflow-hidden transition-all duration-500 ease-in-out ${isDefaultsOpen ? 'max-h-32 mt-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#757686] uppercase tracking-widest ml-1">Meeting Duration</label>
                  <div className="relative group">
                    <select 
                      className="w-full h-10 pl-4 pr-10 rounded-xl bg-[#f3f4f6] border border-transparent focus:border-[#5C6EFF]/20 focus:bg-white appearance-none text-sm font-bold transition-all"
                      value={formData.default_meeting_duration}
                      onChange={(e) => setFormData({ ...formData, default_meeting_duration: parseInt(e.target.value) })}
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#757686]">
                      <span className="material-symbols-outlined text-lg">schedule</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#757686] uppercase tracking-widest ml-1">Buffer Time</label>
                  <div className="relative group">
                    <select 
                      className="w-full h-10 pl-4 pr-10 rounded-xl bg-[#f3f4f6] border border-transparent focus:border-[#5C6EFF]/20 focus:bg-white appearance-none text-sm font-bold transition-all"
                      value={formData.default_buffer_time}
                      onChange={(e) => setFormData({ ...formData, default_buffer_time: parseInt(e.target.value) })}
                    >
                      <option value={5}>5 min</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#757686]">
                      <span className="material-symbols-outlined text-lg">timer</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section - Sticky Bottom Layout */}
          <div className="pt-8 flex items-center justify-between border-t border-[#e1e2e4]">
            <button 
              type="button"
              className="text-[13px] font-bold text-[#757686] hover:text-[#191c1e] transition-colors flex items-center gap-1.5 group"
              onClick={() => router.push('/')}
            >
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Back
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className={`bg-[#5C6EFF] hover:bg-[#3649db] text-white px-10 h-12 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#5C6EFF]/20 disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px] group ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Continue</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-2 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
