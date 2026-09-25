'use client';

interface ConflictWarningModalProps {
  isOpen: boolean;
  conflictsCount: number;
  onCancel: () => void;
  onGoToMeetings: () => void;
}

export default function ConflictWarningModal({
  isOpen,
  conflictsCount,
  onCancel,
  onGoToMeetings
}: ConflictWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-red-500 text-4xl">event_busy</span>
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-2">⚠️ Existing Meetings Found</h3>
          
          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            You already have <span className="font-bold text-slate-900">{conflictsCount}</span> meeting{conflictsCount !== 1 ? 's' : ''} scheduled for this period. 
            You should <span className="font-bold text-red-600">cancel them first</span> then override for this day or time.
          </p>

          <div className="space-y-3">
            <button
              onClick={onGoToMeetings}
              className="w-full bg-[#5C6EFF] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#5C6EFF]/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">calendar_today</span>
              Go to Meetings
            </button>
            
            <button
              onClick={onCancel}
              className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Always double check your calendar before blocking times.
          </p>
        </div>
      </div>
    </div>
  );
}
