'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import ImageEditModal from './image-edit-modal';

interface ProfileAvatarProps {
  avatarUrl?: string;
  fullName?: string;
  onUpdate: (newUrl: string) => void;
  onRemove: () => void;
  isLoading?: boolean;
}

export default function ProfileAvatar({ 
  avatarUrl, 
  fullName, 
  onUpdate, 
  onRemove,
  isLoading 
}: ProfileAvatarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '';

  return (
    <>
      <div className="relative group">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading}
          aria-label="Edit profile photo"
          className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#5C6EFF]/20 relative"
        >
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt={fullName || 'Profile'} 
              fill 
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-[#5C6EFF] font-black text-2xl tracking-tighter">
              {initials || <span className="material-symbols-outlined text-4xl">person</span>}
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="material-symbols-outlined text-white text-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
              edit
            </span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#5C6EFF] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* Small Overlay Icon (Always visible) */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="absolute -bottom-1 -right-1 w-9 h-9 bg-[#5C6EFF] rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110 active:scale-90 transition-all border-2 border-white"
        >
          <span className="material-symbols-outlined text-[18px]">camera_alt</span>
        </div>
      </div>

      <ImageEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        avatarUrl={avatarUrl}
        fullName={fullName}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    </>
  );
}
