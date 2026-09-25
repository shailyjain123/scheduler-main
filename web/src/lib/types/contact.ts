export interface ContactNote {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id?: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  type_category: string;
  notes?: string;
  contact_notes?: ContactNote[];
  created_at?: string;
  updated_at?: string;
}

export type ContactsResponse = Contact[];
