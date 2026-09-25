'use client';

import { useModalStore } from '@/store/modalStore';
import { cn } from '@/lib/utils';

export default function ConfirmationModal() {
  const { isConfirmationOpen, confirmationConfig, closeConfirmation } = useModalStore();

  if (!isConfirmationOpen || !confirmationConfig) return null;

  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
  } = confirmationConfig;

  const handleConfirm = () => {
    onConfirm();
    closeConfirmation();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    closeConfirmation();
  };

  const variantStyles = {
    danger: {
      icon: 'warning',
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-500',
      btnBg: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200',
    },
    warning: {
      icon: 'error',
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-500',
      btnBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    },
    info: {
      icon: 'info',
      iconBg: 'bg-indigo-50',
      iconText: 'text-indigo-500',
      btnBg: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200',
    },
  };

  const style = variantStyles[variant as keyof typeof variantStyles] || variantStyles.info;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
        onClick={closeConfirmation}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-[360px] bg-white rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 pb-4 flex flex-col items-center text-center">
           {/* Icon Circle */}
           <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-6", style.iconBg)}>
              <span className={cn("material-symbols-outlined text-[28px]", style.iconText)}>{style.icon}</span>
           </div>

           <h3 className="text-[17px] font-bold text-slate-900 tracking-tight mb-2">
             {title}
           </h3>
           
           <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
             {message}
           </p>
        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-4 flex flex-col space-y-3">
           <button
             onClick={handleConfirm}
             className={cn(
               "w-full h-12 rounded-[16px] text-[13px] font-bold text-white transition-all active:scale-95 shadow-lg",
               style.btnBg
             )}
           >
             {confirmLabel}
           </button>
           
           <button
             onClick={handleCancel}
             className="w-full h-12 bg-slate-50 hover:bg-slate-100 rounded-[16px] text-[13px] font-bold text-slate-500 transition-all active:scale-95"
           >
             {cancelLabel}
           </button>
        </div>
      </div>
    </div>
  );
}
