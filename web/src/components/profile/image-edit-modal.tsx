'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl?: string;
  fullName?: string;
  onUpdate: (newUrl: string) => void;
  onRemove: () => void;
}

export default function ImageEditModal({
  isOpen,
  onClose,
  avatarUrl,
  fullName,
  onUpdate,
  onRemove
}: ImageEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, GIF).');
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      setError('Image size must be 2MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdate(reader.result as string);
      setError(null);
      onClose();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-[400px] bg-white rounded-[32px] shadow-[0_20px_70px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-500 transform ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-10 opacity-0'}`}>
        
        {/* Decorative Top Bar */}
        <div className="h-1.5 w-12 bg-slate-100 rounded-full mx-auto mt-4 mb-2" />

        <div className="px-8 pb-10 pt-6">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Profile Photo</h3>
            <p className="text-xs font-medium text-slate-400">Update your public avatar</p>
          </div>

          {/* Large Preview Area */}
          <div className="relative group mb-10 mx-auto w-44 h-44">
            <div className="absolute inset-0 bg-[#5C6EFF]/5 rounded-full animate-pulse scale-110" />
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-[0_10px_40px_rgba(92,110,255,0.15)] bg-slate-50 flex items-center justify-center">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Preview" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-300">
                  <span className="material-symbols-outlined text-5xl">person</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <p className="text-[11px] font-bold text-red-600 leading-tight">{error}</p>
            </div>
          )}

          {/* Action Menu */}
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-4 px-5 py-4 bg-[#5C6EFF]/5 hover:bg-[#5C6EFF] group rounded-2xl transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#5C6EFF] shadow-sm group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[22px]">upload</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 group-hover:text-white transition-colors">Upload new photo</p>
                <p className="text-[10px] font-medium text-slate-400 group-hover:text-[#5C6EFF]/30 transition-colors">JPG, PNG or GIF • Max 2MB</p>
              </div>
            </button>

            {avatarUrl && (
              <button
                onClick={onRemove}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 group rounded-2xl transition-all duration-300 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">delete</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">Remove current photo</p>
                  <p className="text-[10px] font-medium text-slate-400">Revert to default initials</p>
                </div>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-4 mt-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
