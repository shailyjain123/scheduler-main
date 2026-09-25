import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  pushToast: (message: string, variant?: ToastVariant) => number;
  removeToast: (id: number) => void;
}

let nextToastId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (message, variant = 'info') => {
    const id = nextToastId;
    nextToastId += 1;

    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));

    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
