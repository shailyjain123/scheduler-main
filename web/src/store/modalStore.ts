import { create } from 'zustand';
import { Event } from '@/lib/types/event';

interface ModalState {
  // Create / Edit Event Modal
  isCreateEventModalOpen: boolean;
  isEditMode: boolean;
  editingEvent: Event | null;
  createEventPrefill: { date: string; time: string } | null;
  createEventDefaultInvitee: { name: string; email: string } | null;
  openCreateEventModal: (
    prefill?: { date: string; time: string },
    options?: { defaultInvitee?: { name: string; email: string } | null }
  ) => void;
  openEditEventModal: (event: Event) => void;
  closeCreateEventModal: () => void;

  // Event Detail Drawer
  isEventDetailOpen: boolean;
  selectedEvent: Event | null;
  openEventDetail: (event: Event) => void;
  closeEventDetail: () => void;

  // Confirmation Modal
  isConfirmationOpen: boolean;
  confirmationConfig: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'info' | 'warning';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null;
  openConfirmation: (config: ModalState['confirmationConfig']) => void;
  closeConfirmation: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  // Create / Edit Event Modal
  isCreateEventModalOpen: false,
  isEditMode: false,
  editingEvent: null,
  createEventPrefill: null,
  createEventDefaultInvitee: null,
  openCreateEventModal: (prefill, options) => set({ 
    isCreateEventModalOpen: true, 
    isEditMode: false, 
    editingEvent: null, 
    createEventPrefill: prefill || null,
    createEventDefaultInvitee: options?.defaultInvitee || null,
  }),
  openEditEventModal: (event) => set({ 
    isCreateEventModalOpen: true, 
    isEditMode: true, 
    editingEvent: event, 
    createEventPrefill: null,
    createEventDefaultInvitee: null,
  }),
  closeCreateEventModal: () => set({ 
    isCreateEventModalOpen: false, 
    isEditMode: false, 
    editingEvent: null, 
    createEventPrefill: null,
    createEventDefaultInvitee: null,
  }),

  isEventDetailOpen: false,
  selectedEvent: null,
  openEventDetail: (event: Event) => set({ isEventDetailOpen: true, selectedEvent: event }),
  closeEventDetail: () => set({ isEventDetailOpen: false, selectedEvent: null }),

  // Confirmation Modal
  isConfirmationOpen: false,
  confirmationConfig: null,
  openConfirmation: (config) => set({ isConfirmationOpen: true, confirmationConfig: config }),
  closeConfirmation: () => set({ isConfirmationOpen: false, confirmationConfig: null }),
}));


