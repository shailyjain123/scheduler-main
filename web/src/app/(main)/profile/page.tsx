'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useModalStore } from '@/store/modalStore';
import { authService } from '@/lib/api/auth';
import { buildLanguageOptions } from '@/lib/preferences/languageOptions';
import { ProfessionalTimezoneSelector } from '@/components/timezone/ProfessionalTimezoneSelector';
import PhoneInputField from '@/components/ui/phone-input';
import Image from 'next/image';
import ProfileAvatar from '@/components/profile/profile-avatar';

export default function ProfilePage() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const { openConfirmation } = useModalStore();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState('');
  const languageRef = useRef<HTMLDivElement>(null);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    password_confirmation: '',
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);

  const languageOptions = useMemo(() => buildLanguageOptions(), []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (passwordForm.new_password !== passwordForm.password_confirmation) {
      setErrorMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await authService.changePassword(passwordForm);
      setSuccessMessage('Password updated successfully!');
      setIsPasswordModalOpen(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        password_confirmation: '',
      });
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessions = async () => {
    setIsSessionsLoading(true);
    try {
      const data = await authService.getSessions();
      setSessions(data);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to fetch sessions');
    } finally {
      setIsSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (isSessionsModalOpen) {
      fetchSessions();
    }
  }, [isSessionsModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setIsLanguageOpen(false);
        setLanguageQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRevokeSession = async (id: number) => {
    try {
      await authService.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to revoke session');
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      await authService.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to revoke sessions');
    }
  };

  const [formData, setFormData] = useState({
    first_name: user?.full_name?.split(' ')[0] || '',
    last_name: user?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
    timezone: user?.timezone || 'UTC',
    language: user?.language || 'en',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.full_name?.split(' ')[0] || '',
        last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        timezone: user?.timezone || 'UTC',
        language: user?.language || 'en',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.');
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage('Image size must be 2MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar_url: reader.result as string }));
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);

    // Allow selecting the same file again after clearing.
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, avatar_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (!user) return;
      const updatedUser = await authService.updateProfile(user.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        phone_number: formData.phone_number,
        avatar_url: formData.avatar_url,
        timezone: formData.timezone,
        language: formData.language,
      });
      setAuth(updatedUser as any);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerificationToggle = async () => {
    if (!user) return;
    const newValue = !user.email_verification_enabled;
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedUser = await authService.updateProfile(user.id, {
        email_verification_enabled: newValue,
      });
      setAuth(updatedUser as any);
      setSuccessMessage(`Email verification ${newValue ? 'enabled' : 'disabled'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update email verification setting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.assign('/login');
  };

  const handleDeleteAccount = () => {
    if (!user) return;

    openConfirmation({
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action is permanent and all your data will be lost.',
      confirmLabel: 'Delete Account',
      variant: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          await authService.deleteAccount(user.id);
          clearAuth();
          window.location.assign('/login');
        } catch (error: any) {
          setErrorMessage(error.message || 'Failed to delete account');
          setIsLoading(false);
        }
      },
    });
  };

  const selectedLanguage = languageOptions.find((lang) => lang.id === formData.language);

  const filteredLanguageOptions = languageOptions.filter((lang) => {
    const q = languageQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      lang.id.toLowerCase().includes(q) ||
      lang.label.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT COLUMN */}
        <div className="col-span-12 flex flex-col gap-6">
          {/* CARD 1: Personal Information */}
          <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#5C6EFF] text-xl">person</span>
              </div>
              <h3 className="flex-1 text-base font-semibold text-slate-900">Personal Information</h3>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isLoading}
                aria-label="Delete account"
                title="Delete account"
                className="group relative w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 hover:bg-red-100 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[19px] leading-none">delete_outline</span>
                <span className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
                  Delete account
                </span>
              </button>
            </div>

            <div className="flex items-center gap-8 mb-10 pb-10 border-b border-[#f0f1f3]">
              <ProfileAvatar 
                avatarUrl={formData.avatar_url}
                fullName={user?.full_name}
                onUpdate={(newUrl) => setFormData((prev) => ({ ...prev, avatar_url: newUrl }))}
                onRemove={handleRemovePhoto}
                isLoading={isLoading}
              />
              
              <div className="flex flex-col gap-1">
                <h4 className="text-xl font-bold text-slate-900">{user?.full_name || 'Your Profile'}</h4>
                <p className="text-sm font-medium text-slate-500">{user?.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-100 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Verified Account
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">First Name</label>
                  <input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-surface-container rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/10 transition-all outline-none font-bold text-sm text-on-surface placeholder:text-outline-variant/40"
                    type="text"
                    placeholder="Alex"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Last Name</label>
                  <input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-surface-container rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/10 transition-all outline-none font-bold text-sm text-on-surface placeholder:text-outline-variant/40"
                    type="text"
                    placeholder="Morgan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Timezone</label>
                  <ProfessionalTimezoneSelector
                    value={formData.timezone}
                    onChange={(timezoneId) => {
                      setFormData((prev) => ({ ...prev, timezone: timezoneId }));
                    }}
                    placeholder="Type city, country, or abbreviation..."
                    className="text-sm"
                    variant="compact"
                  />
                </div>
                <div className="space-y-1.5" ref={languageRef}>
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Language</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={isLanguageOpen ? languageQuery : (selectedLanguage ? `${selectedLanguage.label} - ${selectedLanguage.nativeName}` : '')}
                      onFocus={() => {
                        setIsLanguageOpen(true);
                        setLanguageQuery('');
                      }}
                      onChange={(e) => {
                        setIsLanguageOpen(true);
                        setLanguageQuery(e.target.value);
                      }}
                      placeholder="Search language..."
                      className="w-full px-4 py-3 bg-surface-container rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/10 transition-all outline-none font-bold text-sm text-on-surface placeholder:text-outline-variant/40"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">
                      <span className="material-symbols-outlined text-[18px]">expand_more</span>
                    </span>

                    {isLanguageOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-surface-container-highest rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredLanguageOptions.length > 0 ? (
                          <div className="p-1.5">
                            {filteredLanguageOptions.map((lang) => (
                              <button
                                key={lang.id}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, language: lang.id }));
                                  setIsLanguageOpen(false);
                                  setLanguageQuery('');
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all mb-0.5 last:mb-0 ${
                                  formData.language === lang.id
                                    ? 'bg-[#5C6EFF] text-white font-bold'
                                    : 'text-on-surface hover:bg-surface-container-high font-semibold'
                                }`}
                              >
                                {lang.label} - {lang.nativeName}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-outline-variant">No language found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                  <div className="relative">
                    <input
                      disabled
                      className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl cursor-not-allowed font-semibold text-sm shadow-sm"
                      type="email"
                      value={formData.email}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 bg-green-500/10 rounded-md">
                      <span className="material-symbols-outlined text-green-500 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      <span className="text-[8px] font-semibold text-green-600 uppercase tracking-widest">Verified</span>
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                  <PhoneInputField
                    value={formData.phone_number}
                    onChange={(value) => setFormData((prev) => ({ ...prev, phone_number: value }))}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-container rounded-2xl focus:ring-4 focus:ring-[#5C6EFF]/10 transition-all resize-none outline-none font-bold text-sm text-on-surface placeholder:text-outline-variant/40"
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex flex-col">
                  {successMessage && <p className="text-green-600 text-[10px] font-semibold animate-in fade-in slide-in-from-left-2">{successMessage}</p>}
                  {errorMessage && <p className="text-red-500 text-[10px] font-semibold animate-in fade-in slide-in-from-left-2">{errorMessage}</p>}
                </div>
                <button
                  disabled={isLoading}
                  className="bg-[#5C6EFF] text-white px-8 py-3 rounded-xl font-semibold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#5C6EFF]/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  type="submit"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>

          {/* CARD 2: Account Security */}
          <section className="bg-white rounded-2xl shadow-[0_4px_20_rgba(17,24,39,0.04)] border border-[#f0f1f3] p-6 transition-all hover:shadow-[0_8px_40_rgba(17,24,39,0.08)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#F3F0FF] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#A78BFA] text-xl">lock</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">Account Security</h3>
            </div>

            <div className="divide-y divide-slate-50">
              {user?.signup_method === 'email' && (
                <div className="py-4 flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#5C6EFF] transition-colors">Change Password</p>
                    <p className="text-[10px] font-medium text-slate-400">Regularly updating your password keeps your account secure.</p>
                  </div>
                  <button onClick={() => setIsPasswordModalOpen(true)} className="px-4 py-1.5 text-[10px] font-semibold text-[#5C6EFF] hover:bg-[#5C6EFF]/5 rounded-lg transition-all uppercase tracking-widest border border-[#5C6EFF]/10">Update</button>
                </div>
              )}

              {user?.signup_method && user.signup_method !== 'email' && (
                <div className="py-4 flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#5C6EFF] transition-colors">Authentication</p>
                    <p className="text-[10px] font-medium text-slate-400">Your account is managed via {user.signup_method === 'google_oauth2' ? 'Google' : user.signup_method === 'microsoft_graph' ? 'Microsoft' : user.signup_method.split('_')[0].toUpperCase()}. Password changes are handled by your provider.</p>
                  </div>
                  <span className="px-4 py-1.5 text-[8px] font-semibold text-slate-400 bg-slate-50 rounded-lg uppercase tracking-widest border border-slate-200 shrink-0">SSO Managed</span>
                </div>
              )}

              <div className="py-4 flex items-center justify-between group">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-[#5C6EFF] transition-colors">Email Verification (Verifalia)</p>
                  <p className="text-[10px] font-medium text-slate-400">If enabled, guest emails will be strictly verified via Verifalia API.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  disabled={isLoading}
                  aria-checked={user?.email_verification_enabled || false}
                  onClick={handleEmailVerificationToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5C6EFF] focus:ring-offset-2 ${
                    user?.email_verification_enabled ? 'bg-green-500' : 'bg-slate-200'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      user?.email_verification_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-4 flex items-center justify-between group">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">Connected Devices</p>
                  <p className="text-[10px] font-medium text-slate-400">Manage sessions across browsers and mobile devices.</p>
                </div>
                <button onClick={() => setIsSessionsModalOpen(true)} className="text-[10px] font-semibold text-[#5C6EFF] hover:underline uppercase tracking-widest">Manage</button>
              </div>
            </div>
          </section>


        </div>

      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#f0f1f3] p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">Update Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600 flex items-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Current Password</label>
                <input
                  name="current_password"
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#f0f1f3] rounded-xl focus:ring-4 focus:ring-[#5C6EFF]/5 focus:border-[#5C6EFF] transition-all outline-none font-medium text-sm text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">New Password</label>
                <input
                  name="new_password"
                  type="password"
                  required
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#f0f1f3] rounded-xl focus:ring-4 focus:ring-[#5C6EFF]/5 focus:border-[#5C6EFF] transition-all outline-none font-medium text-sm text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                <input
                  name="password_confirmation"
                  type="password"
                  required
                  value={passwordForm.password_confirmation}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#f0f1f3] rounded-xl focus:ring-4 focus:ring-[#5C6EFF]/5 focus:border-[#5C6EFF] transition-all outline-none font-medium text-sm text-slate-900"
                />
              </div>
              <button
                disabled={isLoading}
                className="w-full bg-[#5C6EFF] text-white py-3 rounded-xl font-semibold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#5C6EFF]/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                type="submit"
              >
                {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isSessionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#f0f1f3] p-6 max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="text-base font-semibold text-slate-900">Connected Devices</h3>
              <button onClick={() => setIsSessionsModalOpen(false)} className="text-slate-400 hover:text-slate-600 flex items-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeOtherSessions}
                className="mb-4 px-4 py-2.5 text-[10px] font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest text-center shrink-0 shadow-sm"
              >
                Log out from all other devices
              </button>
            )}

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {isSessionsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <span className="w-6 h-6 border-2 border-[#5C6EFF]/30 border-t-[#5C6EFF] rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-[10px] font-semibold text-slate-400 text-center py-8 uppercase tracking-widest">No active sessions</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="py-4 flex items-center justify-between gap-6">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-slate-900 truncate">{session.device_info}</p>
                        {session.is_current ? (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-[8px] font-semibold rounded-md uppercase tracking-widest">Current Session</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-slate-400">
                        <span>Started: {new Date(session.created_at).toLocaleDateString()}</span>
                        <span>Expires: {new Date(session.expires_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {!session.is_current && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="px-3 py-1.5 text-[10px] font-semibold text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition-all uppercase tracking-widest shrink-0"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
