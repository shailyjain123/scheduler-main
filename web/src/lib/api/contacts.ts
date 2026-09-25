import { apiClient, ApiResponse } from '@/services/apiClient';
import { Contact, ContactNote } from '@/lib/types/contact';

interface ContactsIndexResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

interface ContactEntityResponse {
  contact: Contact;
}

const toErrorMessage = (response: ApiResponse<unknown>, fallback: string) => {
  return response.error?.message || fallback;
};

const requireSuccess = (response: ApiResponse<unknown>, fallback: string) => {
  if (!response.success) {
    throw new Error(toErrorMessage(response, fallback));
  }
};

const requireData = <T>(response: ApiResponse<T>, fallback: string): T => {
  requireSuccess(response, fallback);
  if (response.data === undefined || response.data === null) {
    throw new Error(fallback);
  }
  return response.data;
};

export const contactsApi = {
  list: async () => {
    const response = await apiClient.get<ContactsIndexResponse>('/contacts?per_page=100');
    const data = requireData(response, 'Failed to fetch contacts');
    return data.contacts || [];
  },

  create: async (contact: Partial<Contact>) => {
    const response = await apiClient.post<ContactEntityResponse>('/contacts', { contact });
    const data = requireData(response, 'Failed to create contact');
    return data.contact;
  },

  update: async (id: number, contact: Partial<Contact>) => {
    const response = await apiClient.patch<ContactEntityResponse>(`/contacts/${id}`, { contact });
    const data = requireData(response, 'Failed to update contact');
    return data.contact;
  },

  remove: async (id: number) => {
    const response = await apiClient.delete(`/contacts/${id}`);
    requireSuccess(response, 'Failed to delete contact');
  },

  addNote: async (contactId: number, content: string) => {
    const response = await apiClient.post<{ note: ContactNote }>(`/contacts/${contactId}/notes`, {
      note: { content },
    });
    const data = requireData(response, 'Failed to add note');
    return data.note;
  },

  updateNote: async (contactId: number, noteId: number, content: string) => {
    const response = await apiClient.patch<{ note: ContactNote }>(`/contacts/${contactId}/notes/${noteId}`, {
      note: { content },
    });
    const data = requireData(response, 'Failed to update note');
    return data.note;
  },

  deleteNote: async (contactId: number, noteId: number) => {
    const response = await apiClient.delete(`/contacts/${contactId}/notes/${noteId}`);
    requireSuccess(response, 'Failed to delete note');
  },

  // Deprecated: used for legacy string-based notes
  saveNote: async (id: number, notes: string) => {
    const response = await apiClient.patch<ContactEntityResponse>(`/contacts/${id}`, {
      contact: { notes },
    });
    const data = requireData(response, 'Failed to save note');
    return data.contact;
  },
};
