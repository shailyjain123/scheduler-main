'use client';

interface AiSuggestionCardProps {
  onApplySuggestion?: () => Promise<void> | void;
  disabled?: boolean;
}

export default function AiSuggestionCard({ onApplySuggestion, disabled = false }: AiSuggestionCardProps) {
  return (
    <section className="relative rounded-xl p-6 bg-white border-[1.5px] border-transparent before:content-[''] before:absolute before:inset-0 before:-m-[1.5px] before:rounded-[inherit] before:z-[-1] before:bg-[linear-gradient(135deg,#5C6EFF,#A78BFA)] mt-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-[#5C6EFF]/10 px-2 py-1 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] bg-[linear-gradient(135deg,#5C6EFF,#A78BFA)] bg-clip-text text-transparent" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <span className="text-[10px] font-bold bg-[linear-gradient(135deg,#5C6EFF,#A78BFA)] bg-clip-text text-transparent uppercase tracking-tight">AI Insight</span>
        </div>
      </div>
      <h5 className="text-base font-bold text-slate-900 mb-2 leading-tight">Maximize evening slots</h5>
      <p className="text-xs text-slate-600 leading-relaxed">
        Data shows <span className="font-bold text-[#5C6EFF]">32%</span> of your clients book sessions between 6:00 PM and 8:00 PM. Extending your Thursday hours could increase bookings by <span className="font-bold text-[#5C6EFF]">12%</span>.
      </p>
      <button
        disabled={disabled}
        onClick={() => onApplySuggestion?.()}
        className="mt-4 w-full text-[13px] font-bold bg-[linear-gradient(135deg,#5C6EFF,#A78BFA)] bg-clip-text text-transparent hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Apply Suggestion
      </button>
    </section>
  );
}
