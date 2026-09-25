'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Contact } from '@/lib/types/contact';
import { Event } from '@/lib/types/event';

interface ContactProfileProps {
  contact: Contact;
  meetings: Event[];
  isMeetingsLoading: boolean;
  isAddingNote: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onBook: () => void;
  onAddNote: (content: string) => Promise<void>;
  onUpdateNote: (noteId: number, content: string) => Promise<void>;
  onDeleteNote: (noteId: number) => Promise<void>;
}

const EMOJIS = ['😀', '😊', '👍', '🎯', '🚀', '📌', '✅', '🤝'];

export function ContactProfile({
  contact,
  meetings,
  isMeetingsLoading,
  isAddingNote,
  onDelete,
  onEdit,
  onBook,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: ContactProfileProps) {
  const [activeTab, setActiveTab] = useState<'Meeting History' | 'Notes' | 'Activity'>('Meeting History');
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setActiveTab('Meeting History');
    setNoteDraft('');
    setPendingAttachment(null);
    setEmojiOpen(false);
  }, [contact.id]);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // ~4-5 rows max
    textarea.style.height = `${newHeight}px`;
  }, [noteDraft]);

  const sortedMeetings = useMemo(
    () => [...meetings].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
    [meetings]
  );

  const noteLines = useMemo(() => {
    return contact.notes ? contact.notes.split('\n').filter((line) => line.trim().length > 0) : [];
  }, [contact.notes]);

  const saveNote = async () => {
    if (!noteDraft.trim() || isAddingNote) return;

    const prepared = pendingAttachment
      ? `${noteDraft.trim()} [File: ${pendingAttachment.name}]`
      : noteDraft.trim();

    const rollback = noteDraft;
    setNoteDraft('');
    setPendingAttachment(null);

    try {
      await onAddNote(prepared);
    } catch {
      setNoteDraft(rollback);
    }
  };

  const handleUpdateNote = async (id: number) => {
    if (!editContent.trim()) return;
    await onUpdateNote(id, editContent);
    setEditingNoteId(null);
    setEditContent('');
  };

  const startEditing = (id: number, content: string) => {
    setEditingNoteId(id);
    setEditContent(content);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header section with actions */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between border-b border-slate-100 bg-white px-4 py-3 lg:px-5 lg:py-4 gap-3">
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <div className="relative flex-shrink-0">
            <div
              className={`flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full text-lg lg:text-xl font-semibold text-white shadow-sm ${
                contact.type_category === 'Client'
                  ? 'bg-[#5C6EFF]'
                  : contact.type_category === 'Lead'
                    ? 'bg-amber-500'
                    : contact.type_category === 'VIP'
                      ? 'bg-purple-600'
                      : 'bg-slate-400'
              }`}
            >
              {contact.first_name?.[0]}
              {contact.last_name?.[0]}
            </div>
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] lg:text-lg font-bold leading-tight text-slate-900 truncate">{contact.full_name}</h2>
              <button
                onClick={onEdit}
                className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:h-7 lg:w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                title="Edit contact"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-base text-slate-400">mail</span>
                <span className="truncate">{contact.email}</span>
              </a>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined text-base text-slate-400">smartphone</span>
                  {contact.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0 lg:ml-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-50 lg:border-transparent">
          <button
            onClick={onDelete}
            className="flex h-10 w-10 lg:h-9 lg:w-9 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
            title="Delete contact"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
          <a
            href={`mailto:${contact.email}`}
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 lg:px-4 py-2 min-h-[44px] lg:min-h-0 text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-lg text-slate-400">send</span>
            Email
          </a>
          <button
            onClick={onBook}
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 lg:px-4 py-2 min-h-[44px] lg:min-h-0 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-lg">calendar_today</span>
            Book
          </button>
        </div>
      </div>

      {/* Tabs and Content - Occupies full height */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/10">
        <div className="flex gap-6 border-b border-slate-100 bg-white px-5 px-6 pt-2">
          {(['Meeting History', 'Notes', 'Activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 text-[13px] font-semibold transition-all ${
                activeTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 no-scrollbar">
          <div className="h-full">
            {activeTab === 'Meeting History' && (
              <div className="grid grid-cols-1 gap-3">
                {isMeetingsLoading && (
                  <>
                    <div className="h-16 w-full animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-16 w-full animate-pulse rounded-xl bg-slate-100" />
                  </>
                )}

                {!isMeetingsLoading && sortedMeetings.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                      <span className="material-symbols-outlined text-2xl">event_busy</span>
                    </div>
                    <p className="text-[13px] font-semibold text-slate-600">No meetings found</p>
                    <p className="mt-1 text-[11px] text-slate-400">Once this contact joins meetings, history appears here.</p>
                  </div>
                )}

                {!isMeetingsLoading &&
                  sortedMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="group flex items-center gap-4 rounded-xl border border-slate-200/50 bg-white p-3.5 shadow-sm transition-all hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-lg bg-slate-50 text-primary transition-colors group-hover:bg-white">
                        <span className="material-symbols-outlined text-[20px]">video_camera_front</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-start justify-between gap-3">
                          <h5 className="truncate text-[13.5px] font-semibold text-slate-900">{meeting.title}</h5>
                          <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-tight text-slate-400">
                            {new Date(meeting.start_time).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">timer</span>
                            {new Date(meeting.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                          <span className="truncate text-[10px] uppercase tracking-wide">{meeting.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'Notes' && (
              <div className="space-y-4">
                {(!contact.contact_notes || contact.contact_notes.length === 0) && (
                   <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                      <span className="material-symbols-outlined text-2xl">notes</span>
                    </div>
                    <p className="text-[13px] font-semibold text-slate-600">No notes yet</p>
                    <p className="mt-1 text-[11px] text-slate-400">Add notes below to keep track of this contact.</p>
                  </div>
                )}
                {contact.contact_notes?.map((note) => (
                  <div key={note.id} className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                    {editingNoteId === note.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full rounded-lg border-slate-200 bg-slate-50 p-3 text-[13px] font-medium transition-all focus:border-primary/30 focus:bg-white focus:ring-0 min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => void handleUpdateNote(note.id)}
                            className="rounded-lg bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-primary/90"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {new Date(note.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(note.id, note.content)}
                              className="p-1 text-slate-400 hover:text-primary transition-colors"
                              title="Edit note"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => void onDeleteNote(note.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete note"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">{note.content}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Activity' && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">Contact Updated</p>
                    <p className="text-[11px] text-slate-500">
                      {contact.updated_at ? new Date(contact.updated_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      }) : 'Recently'}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Notes Input - Fixed at bottom */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/30 p-2 transition-all focus-within:border-primary/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/5">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={1}
              className="flex-1 resize-none border-none bg-transparent py-1.5 px-2 text-[13px] font-medium placeholder:text-slate-400 focus:ring-0 min-h-[36px] no-scrollbar"
              placeholder={`Quick note for ${contact.first_name}...`}
              spellCheck="false"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void saveNote();
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 px-1">
            <div className="flex items-center gap-1.5 relative">
              <button
                onClick={() => setEmojiOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-primary active:scale-90"
                title="Insert emoji"
              >
                <span className="material-symbols-outlined text-[20px]">mood</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-primary active:scale-90"
                title="Attach file"
              >
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setPendingAttachment(file);
                }}
              />

              {emojiOpen && (
                <div className="absolute bottom-10 left-0 z-20 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl w-48">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNoteDraft((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${emoji}`);
                        setEmojiOpen(false);
                        textareaRef.current?.focus();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[18px] hover:bg-slate-50 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {pendingAttachment && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
                  <span className="text-[11px] font-semibold text-primary truncate max-w-[120px]">
                    {pendingAttachment.name}
                  </span>
                  <button 
                    onClick={() => setPendingAttachment(null)}
                    className="flex h-4 w-4 items-center justify-center text-primary/40 hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => void saveNote()}
              disabled={!noteDraft.trim() || isAddingNote}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-md shadow-primary/10 transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              {isAddingNote ? (
                <svg className="h-3.5 w-3.5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
