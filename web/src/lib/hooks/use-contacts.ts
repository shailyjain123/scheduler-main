'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/api/contacts';
import { Contact } from '@/lib/types/contact';
import { Event } from '@/lib/types/event';
import { apiClient } from '@/services/apiClient';
import { useToastStore } from '@/store/toastStore';

const CONTACTS_QUERY_KEY = ['contacts'];
const EVENTS_QUERY_KEY = ['contact-events'];

const eventsFetcher = async () => {
  const response = await apiClient.get<Event[]>('/events?per_page=100');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch meetings');
  }
  return response.data;
};

const appendNote = (existingNotes: string | undefined, note: string) => {
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const line = `[${timestamp}] ${note.trim()}`;
  return existingNotes?.trim() ? `${line}\n${existingNotes}` : line;
};

const mergeContact = (contact: Contact, patch: Partial<Contact>) => {
  const next = { ...contact, ...patch };
  next.full_name = `${next.first_name || ''} ${next.last_name || ''}`.trim();
  return next;
};

export function useContacts() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const lastContactsError = useRef<string | null>(null);
  const lastEventsError = useRef<string | null>(null);

  const contactsQuery = useQuery({
    queryKey: CONTACTS_QUERY_KEY,
    queryFn: contactsApi.list,
    refetchOnWindowFocus: true,
  });

  const eventsQuery = useQuery({
    queryKey: EVENTS_QUERY_KEY,
    queryFn: eventsFetcher,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!contactsQuery.error) {
      lastContactsError.current = null;
      return;
    }

    const message = contactsQuery.error instanceof Error ? contactsQuery.error.message : 'Failed to load contacts';
    if (lastContactsError.current === message) return;

    lastContactsError.current = message;
    pushToast(message, 'error');
  }, [contactsQuery.error, pushToast]);

  useEffect(() => {
    if (!eventsQuery.error) {
      lastEventsError.current = null;
      return;
    }

    const message = eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Failed to load meeting history';
    if (lastEventsError.current === message) return;

    lastEventsError.current = message;
    pushToast(message, 'error');
  }, [eventsQuery.error, pushToast]);

  const updateContactMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Contact> }) => contactsApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: CONTACTS_QUERY_KEY });
      const previous = queryClient.getQueryData<Contact[]>(CONTACTS_QUERY_KEY) || [];

      queryClient.setQueryData<Contact[]>(CONTACTS_QUERY_KEY, previous.map((contact) => (
        contact.id === id ? mergeContact(contact, patch) : contact
      )));

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONTACTS_QUERY_KEY, context.previous);
      }
      pushToast(error instanceof Error ? error.message : 'Failed to update contact', 'error');
    },
    onSuccess: (serverContact) => {
      queryClient.setQueryData<Contact[]>(CONTACTS_QUERY_KEY, (current = []) => current.map((contact) => (
        contact.id === serverContact.id ? serverContact : contact
      )));
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      pushToast('Contact updated', 'success');
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (payload: Partial<Contact>) => contactsApi.create(payload),
    onSuccess: (serverContact) => {
      queryClient.setQueryData<Contact[]>(CONTACTS_QUERY_KEY, (current = []) => [serverContact, ...current]);
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      pushToast('Contact created', 'success');
    },
    onError: (error) => {
      pushToast(error instanceof Error ? error.message : 'Failed to create contact', 'error');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => contactsApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CONTACTS_QUERY_KEY });
      const previous = queryClient.getQueryData<Contact[]>(CONTACTS_QUERY_KEY) || [];

      queryClient.setQueryData<Contact[]>(CONTACTS_QUERY_KEY, previous.filter((contact) => contact.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONTACTS_QUERY_KEY, context.previous);
      }
      pushToast(error instanceof Error ? error.message : 'Failed to delete contact', 'error');
    },
    onSuccess: () => {
      pushToast('Contact deleted', 'success');
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ contactId, content }: { contactId: number; content: string }) => contactsApi.addNote(contactId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      pushToast('Note added', 'success');
    },
    onError: (error) => {
      pushToast(error instanceof Error ? error.message : 'Failed to add note', 'error');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ contactId, noteId, content }: { contactId: number; noteId: number; content: string }) => contactsApi.updateNote(contactId, noteId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      pushToast('Note updated', 'success');
    },
    onError: (error) => {
      pushToast(error instanceof Error ? error.message : 'Failed to update note', 'error');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: ({ contactId, noteId }: { contactId: number; noteId: number }) => contactsApi.deleteNote(contactId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      pushToast('Note deleted', 'success');
    },
    onError: (error) => {
      pushToast(error instanceof Error ? error.message : 'Failed to delete note', 'error');
    },
  });

  const contacts = contactsQuery.data || [];
  const events = eventsQuery.data || [];

  const meetingsByEmail = useMemo(() => {
    const map = new Map<string, Event[]>();

    events.forEach((event) => {
      event.attendees?.forEach((attendee) => {
        const email = attendee.email?.toLowerCase();
        if (!email) return;
        const existing = map.get(email) || [];
        map.set(email, [...existing, event]);
      });
    });

    return map;
  }, [events]);

  return {
    contacts,
    meetingsByEmail,
    isContactsLoading: contactsQuery.isLoading,
    isEventsLoading: eventsQuery.isLoading,
    isRefreshingEvents: eventsQuery.isFetching,
    refreshContacts: contactsQuery.refetch,
    createContact: createContactMutation.mutateAsync,
    isCreatingContact: createContactMutation.isPending,
    deleteContact: deleteContactMutation.mutateAsync,
    isDeleting: deleteContactMutation.isPending,
    updateContact: updateContactMutation.mutateAsync,
    isUpdating: updateContactMutation.isPending,
    addNote: addNoteMutation.mutateAsync,
    isAddingNote: addNoteMutation.isPending,
    updateNote: updateNoteMutation.mutateAsync,
    isUpdatingNote: updateNoteMutation.isPending,
    deleteNote: deleteNoteMutation.mutateAsync,
    isDeletingNote: deleteNoteMutation.isPending,
  };
}
