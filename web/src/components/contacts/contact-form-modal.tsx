'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Contact } from '@/lib/types/contact';
import { getPhoneValidationError, phoneSchema } from '@/lib/utils/validation';
import PhoneInputField from '@/components/ui/phone-input';

interface ContactFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  type_category: string;
}

interface ContactFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialContact?: Contact | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}

const EMPTY_VALUES: ContactFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  type_category: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPhoneValid = (value: string) => {
  if (!value.trim()) return true;
  return phoneSchema.safeParse(value).success;
};

export function ContactFormModal({
  isOpen,
  mode,
  initialContact,
  isSubmitting,
  onClose,
  onSubmit,
}: ContactFormModalProps) {
  const [form, setForm] = useState<ContactFormValues>(EMPTY_VALUES);
  const [phoneError, setPhoneError] = useState<string>('');
  const initializedSeedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      initializedSeedRef.current = null;
      return;
    }

    const seed = mode === 'edit' ? `edit:${initialContact?.id ?? 'none'}` : 'create';
    if (initializedSeedRef.current === seed) return;
    initializedSeedRef.current = seed;

    if (mode === 'edit' && initialContact) {
      setForm({
        first_name: initialContact.first_name || '',
        last_name: initialContact.last_name || '',
        email: initialContact.email || '',
        phone: initialContact.phone || '',
        type_category: initialContact.type_category || '',
      });
      setPhoneError('');
      return;
    }

    setForm(EMPTY_VALUES);
    setPhoneError('');
  }, [isOpen, mode, initialContact]);

  const emailValid = useMemo(() => EMAIL_REGEX.test(form.email.trim()), [form.email]);
  const phoneValid = useMemo(() => isPhoneValid(form.phone), [form.phone]);

  const canSubmit = useMemo(() => {
    return (
      form.first_name.trim().length > 0 &&
      form.last_name.trim().length > 0 &&
      emailValid &&
      phoneValid &&
      !isSubmitting
    );
  }, [form.first_name, form.last_name, emailValid, phoneValid, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-[16px] font-bold text-slate-900">
            {mode === 'create' ? 'Create Contact' : 'Edit Contact'}
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            void onSubmit({
              ...form,
              first_name: form.first_name.trim(),
              last_name: form.last_name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              type_category: form.type_category.trim(),
            });
          }}
          className="space-y-4 p-5"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">First Name</span>
              <input
                value={form.first_name}
                onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] font-medium outline-none focus:border-primary/30"
                placeholder="John"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Last Name</span>
              <input
                value={form.last_name}
                onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] font-medium outline-none focus:border-primary/30"
                placeholder="Doe"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] font-medium outline-none focus:border-primary/30"
              placeholder="john@company.com"
            />
            {!emailValid && form.email.trim().length > 0 && (
              <span className="text-[10px] font-medium text-red-500">Invalid email format</span>
            )}
          </label>

          <label className="space-y-1 block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Phone</span>
            <PhoneInputField
              value={form.phone}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, phone: value }));

                const error = getPhoneValidationError(value);
                setPhoneError(error || '');
              }}
              error={phoneError}
              disabled={isSubmitting}
            />
            {!phoneError && !phoneValid && form.phone.trim().length > 0 && (
              <span className="text-[10px] font-medium text-red-500">Invalid phone format</span>
            )}
          </label>

          <label className="space-y-1 block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</span>
            <select
              value={form.type_category}
              onChange={(event) => setForm((prev) => ({ ...prev, type_category: event.target.value }))}
              className={`h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] font-medium outline-none focus:border-primary/30 appearance-none bg-slate-50 cursor-pointer transition-colors ${
                form.type_category ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <option value="" disabled hidden>Select Category</option>
              <option value="Client">Client</option>
              <option value="Lead">Lead</option>
              <option value="VIP">VIP</option>
            </select>
          </label>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg px-4 text-[12px] font-semibold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting && (
                <svg className="h-3 w-3 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {mode === 'create' ? 'Create Contact' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
