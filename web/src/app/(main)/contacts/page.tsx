'use client';

import { useEffect, useMemo, useState } from 'react';
import { Contact } from '@/lib/types/contact';
import { Event } from '@/lib/types/event';
import { ContactList } from '@/components/contacts/contact-list';
import { ContactProfile } from '@/components/contacts/contact-profile';
import { ContactFormModal } from '@/components/contacts/contact-form-modal';
import { useContacts } from '@/lib/hooks/use-contacts';
import { useModalStore } from '@/store/modalStore';
import ContactProfileSkeleton from '@/components/skeletons/ContactProfileSkeleton';

export default function ContactsPage() {
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contactFormMode, setContactFormMode] = useState<'create' | 'edit'>('create');
  const openConfirmation = useModalStore((state) => state.openConfirmation);
  const openCreateEventModal = useModalStore((state) => state.openCreateEventModal);

  const {
    contacts,
    meetingsByEmail,
    isContactsLoading,
    isEventsLoading,
    createContact,
    isCreatingContact,
    deleteContact,
    updateContact,
    addNote,
    updateNote,
    deleteNote,
    isAddingNote,
    isUpdatingNote,
    isDeletingNote,
    isUpdating,
  } = useContacts();

  const activeContact = useMemo(
    () => contacts.find((contact) => contact.id === activeContactId) || null,
    [contacts, activeContactId]
  );

  useEffect(() => {
    if (contacts.length === 0) {
      setActiveContactId(null);
      return;
    }

    if (!activeContactId || !contacts.some((contact) => contact.id === activeContactId)) {
      setActiveContactId(contacts[0].id || null);
    }
  }, [contacts, activeContactId]);

  const filteredContacts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const name = contact.full_name?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }, [contacts, searchTerm]);

  const activeMeetings = useMemo<Event[]>(() => {
    if (!activeContact?.email) return [];
    return meetingsByEmail.get(activeContact.email.toLowerCase()) || [];
  }, [activeContact?.email, meetingsByEmail]);

  const handleDelete = async (id: number) => {
    await deleteContact(id);
    if (activeContactId === id) {
      setActiveContactId(null);
    }
  };

  const requestDelete = (contact: Contact) => {
    if (!contact.id) return;

    openConfirmation({
      title: 'Delete contact?',
      message: `This removes ${contact.full_name} from your workspace. This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        void handleDelete(contact.id as number);
      },
    });
  };

  const openCreateContactForm = () => {
    setContactFormMode('create');
    setIsContactFormOpen(true);
    setIsSidebarOpen(false);
  };

  const openEditContactForm = () => {
    setContactFormMode('edit');
    setIsContactFormOpen(true);
  };

  const handleBook = () => {
    if (!activeContact?.email) return;
    openCreateEventModal(undefined, {
      defaultInvitee: {
        name: activeContact.full_name,
        email: activeContact.email,
      },
    });
  };

  const handleSelectContact = (contact: Contact) => {
    setActiveContactId(contact.id || null);
    setIsSidebarOpen(false);
  };

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col lg:flex-row gap-0 overflow-hidden relative isolate bg-white">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Library */}
      <aside className={`
        fixed lg:relative top-0 left-0 bottom-0 z-[111] lg:z-auto
        w-[280px] sm:w-[320px] lg:w-[280px] xl:w-[320px]
        bg-white border-r border-slate-200/60 flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-3 border-b border-slate-50 space-y-2">
          <button
            onClick={openCreateContactForm}
            className="w-full h-10 rounded-lg bg-primary text-white text-[13px] font-semibold shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Create Contact
          </button>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input 
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent focus:border-primary/30 focus:bg-white rounded-lg text-[13px] font-medium transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ContactList
          contacts={filteredContacts}
          selectedId={activeContact?.id}
          onSelect={handleSelectContact}
          isLoading={isContactsLoading}
        />
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 bg-white flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b border-slate-100 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <span className="ml-2 text-sm font-bold text-slate-900">Contacts</span>
        </div>

        {isContactsLoading ? (
          <ContactProfileSkeleton />
        ) : activeContact ? (
          <ContactProfile
            contact={activeContact}
            meetings={activeMeetings}
            isMeetingsLoading={isEventsLoading}
            isAddingNote={isAddingNote}
            onDelete={() => requestDelete(activeContact)}
            onEdit={openEditContactForm}
            onBook={handleBook}
            onAddNote={async (content) => {
              if (!activeContact.id) return;
              await addNote({ contactId: activeContact.id, content });
            }}
            onUpdateNote={async (noteId, content) => {
              if (!activeContact.id) return;
              await updateNote({ contactId: activeContact.id, noteId, content });
            }}
            onDeleteNote={async (noteId) => {
              if (!activeContact.id) return;
              await deleteNote({ contactId: activeContact.id, noteId });
            }}
          />
        ) : contacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20 animate-in fade-in duration-700">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-5 text-slate-300">
              <span className="material-symbols-outlined text-3xl">contacts</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1.5">No contacts yet</h3>
            <p className="text-slate-500 text-[13px] max-w-[260px] leading-relaxed">Start building your directory by adding your first contact.</p>
            <button 
                onClick={openCreateContactForm}
                className="mt-6 px-5 py-2.5 bg-primary text-white rounded-lg text-[13px] font-semibold shadow-md shadow-primary/10 hover:bg-primary/90 transition-all active:scale-95"
            >
                Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-5 text-slate-300">
              <span className="material-symbols-outlined text-3xl">touch_app</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1.5">Select a contact</h3>
            <p className="text-slate-500 text-[13px] max-w-[260px] leading-relaxed">Select a contact from the list to view their profile and insights.</p>
          </div>
        )}
      </section>

      <ContactFormModal
        isOpen={isContactFormOpen}
        mode={contactFormMode}
        initialContact={contactFormMode === 'edit' ? activeContact : null}
        isSubmitting={contactFormMode === 'edit' ? isUpdating : isCreatingContact}
        onClose={() => setIsContactFormOpen(false)}
        onSubmit={async (values) => {
          if (contactFormMode === 'edit') {
            if (!activeContact?.id) return;
            await updateContact({ id: activeContact.id, patch: values });
          } else {
            const newContact = await createContact(values);
            if (newContact?.id) setActiveContactId(newContact.id);
          }
          setIsContactFormOpen(false);
        }}
      />
    </div>
  );
}
