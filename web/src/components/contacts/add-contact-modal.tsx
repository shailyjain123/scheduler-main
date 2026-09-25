'use client';

import { useState, useMemo } from 'react';
import { useFieldErrors } from '@/hooks/useFieldErrors';
import { apiClient } from '@/lib/api/client';
import { ApiResponse } from '@/lib/api/client';
import { getPhoneValidationError, phoneSchema } from '@/lib/utils/validation';
import PhoneInputField from '@/components/ui/phone-input';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddContactModal({ isOpen, onClose, onSuccess }: AddContactModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    type_category: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, setFieldError, setFieldErrors, clearFieldError, captureApiErrors } = useFieldErrors<typeof formData>();

  const isPhoneValid = useMemo(() => phoneSchema.safeParse(formData.phone).success, [formData.phone]);
  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()), [formData.email]);
  const canSubmit = useMemo(() => {
    return (
      formData.first_name.trim().length > 0 &&
      formData.last_name.trim().length > 0 &&
      isEmailValid &&
      isPhoneValid
    );
  }, [formData.first_name, formData.last_name, isEmailValid, isPhoneValid]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    let hasClientErrors = false;

    if (!formData.first_name.trim()) {
      setFieldError('first_name', 'First name is required');
      hasClientErrors = true;
    }

    if (!formData.last_name.trim()) {
      setFieldError('last_name', 'Last name is required');
      hasClientErrors = true;
    }

    if (!formData.email.trim()) {
      setFieldError('email', 'Email is required');
      hasClientErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFieldError('email', 'Please enter a valid email address');
      hasClientErrors = true;
    }

    const phoneError = getPhoneValidationError(formData.phone);
    if (phoneError) {
      setFieldError('phone', phoneError);
      hasClientErrors = true;
    }

    if (hasClientErrors) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        phone: formData.phone.trim(),
      };

      const response = await apiClient.post<ApiResponse>('/contacts', { contact: payload });
      if (response.success) {
        onSuccess();
        onClose();
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          type_category: '',
        });
      } else {
        captureApiErrors(response);
        setError(response.error?.message || 'Failed to create contact');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="w-full max-w-[460px] bg-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Add New Contact</h3>
            <p className="text-[12px] text-slate-500 font-medium">Create a new entry in your directory.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm group"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform duration-300">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[12px] font-semibold flex items-center gap-2 border border-red-100">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">First Name</label>
              <input 
                type="text" 
                required 
                className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-transparent focus:border-primary/30 focus:bg-white transition-all text-[13px] font-medium placeholder:text-slate-300 outline-none"
                placeholder="John"
                value={formData.first_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
              />
              {fieldErrors.first_name && <p className="text-[10px] text-red-500 ml-1">{fieldErrors.first_name}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
              <input 
                type="text" 
                required 
                className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-transparent focus:border-primary/30 focus:bg-white transition-all text-[13px] font-medium placeholder:text-slate-300 outline-none"
                placeholder="Doe"
                value={formData.last_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
              />
              {fieldErrors.last_name && <p className="text-[10px] text-red-500 ml-1">{fieldErrors.last_name}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
            <input 
              type="email" 
              autoComplete="email"
              required 
              className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-transparent focus:border-primary/30 focus:bg-white transition-all text-[13px] font-medium placeholder:text-slate-300 outline-none"
              placeholder="john.doe@company.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
            {fieldErrors.email && <p className="text-[10px] text-red-500 ml-1">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
            <PhoneInputField
              value={formData.phone}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, phone: val }));
                const result = phoneSchema.safeParse(val);
                if (result.success) {
                  clearFieldError('phone');
                } else {
                  setFieldError('phone', result.error.issues[0]?.message || 'Invalid phone number');
                }
              }}
              error={fieldErrors.phone}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Category (Optional)</label>
            <select
              className={`w-full h-10 px-3 rounded-lg bg-slate-50 border border-transparent focus:border-primary/30 focus:bg-white transition-all text-[13px] font-medium outline-none appearance-none cursor-pointer ${
                formData.type_category ? 'text-slate-900' : 'text-slate-400'
              }`}
              value={formData.type_category}
              onChange={(e) => setFormData((prev) => ({ ...prev, type_category: e.target.value }))}
            >
              <option value="" disabled hidden>Select Category</option>
              <option value="Client">Client</option>
              <option value="Lead">Lead</option>
              <option value="VIP">VIP</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
             <button 
                type="button" 
                onClick={onClose}
                className="flex-1 h-10 rounded-lg text-[13px] font-semibold text-slate-500 hover:bg-slate-50 transition-all"
             >
                Cancel
             </button>
             <button 
                type="submit" 
              disabled={isLoading || !canSubmit}
                className="flex-[2] h-10 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-[13px] transition-all shadow-md shadow-primary/10 active:scale-95 disabled:opacity-50"
             >
                {isLoading ? 'Creating...' : 'Add Contact'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
