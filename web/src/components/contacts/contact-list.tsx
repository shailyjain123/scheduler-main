'use client';

import { Contact } from '@/lib/types/contact';

interface ContactListProps {
  contacts: Contact[];
  selectedId?: number;
  onSelect: (contact: Contact) => void;
  isLoading: boolean;
}

export function ContactList({ contacts, selectedId, onSelect, isLoading }: ContactListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-50 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-slate-50 animate-pulse rounded" />
              <div className="h-2 w-32 bg-slate-50 animate-pulse rounded opacity-60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">group_off</span>
        <p className="text-sm font-medium">No contacts found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 no-scrollbar">
      {contacts.map((contact) => (
        <div 
          key={contact.id}
          onClick={() => onSelect(contact)}
          className={`flex items-center gap-3 p-3 transition-all rounded-xl cursor-pointer group border ${
            selectedId === contact.id 
            ? 'bg-primary/[0.04] border-primary/20 shadow-sm shadow-primary/5' 
            : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-semibold shadow-sm ${
              contact.type_category === 'Client' ? 'bg-[#5C6EFF]' : 
              contact.type_category === 'Lead' ? 'bg-amber-500' : 
              contact.type_category === 'VIP' ? 'bg-purple-600' : 'bg-slate-400'
            }`}>
              {contact.first_name[0]}{contact.last_name[0]}
            </div>
            {contact.status === 'active' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-[14px] font-semibold truncate transition-colors ${
              selectedId === contact.id ? 'text-primary' : 'text-slate-800'
            }`}>
              {contact.full_name}
            </h4>
            <p className="text-[12px] text-slate-500 truncate">{contact.email}</p>
          </div>
          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
            contact.type_category === 'Client' ? 'bg-emerald-50 text-emerald-700' : 
            contact.type_category === 'Lead' ? 'bg-amber-50 text-amber-700' : 
            contact.type_category === 'VIP' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {contact.type_category || 'Contact'}
          </span>
        </div>
      ))}
    </div>
  );
}
