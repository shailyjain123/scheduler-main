'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  size,
} from '@floating-ui/react';
import { cn } from '@/lib/utils';

export type CountryOption = {
  iso: CountryCode;
  name: string;
  dialCode: string;
};

interface CountrySelectProps {
  value: CountryCode;
  onChange: (iso: CountryCode) => void;
  className?: string;
}

export default function CountrySelect({ value, onChange, className }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const phoneCountries: CountryOption[] = useMemo(() => {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const countries = getCountries().map((iso) => ({
      iso,
      name: regionNames.of(iso) || iso,
      dialCode: `+${getCountryCallingCode(iso)}`,
    }));

    return countries.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return phoneCountries;
    const lowerSearch = search.toLowerCase();
    return phoneCountries.filter(
      (c) => 
        c.name.toLowerCase().includes(lowerSearch) || 
        c.iso.toLowerCase().includes(lowerSearch) || 
        c.dialCode.includes(lowerSearch)
    );
  }, [phoneCountries, search]);

  const selectedCountry = useMemo(
    () => phoneCountries.find((c) => c.iso === value) || phoneCountries[0],
    [phoneCountries, value]
  );

  const { refs: { setReference, setFloating }, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (!open) setSearch('');
    },
    middleware: [
      offset(4),
      flip({ fallbackAxisSideDirection: 'end' }),
      shift(),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight, 350)}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (iso: CountryCode) => {
    onChange(iso);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block w-full", className)}>
      <button
        ref={setReference}
        {...getReferenceProps()}
        className={cn(
          "w-full bg-[#f8f9fb] border-none rounded-lg h-10 pl-3 pr-8 text-[12px] font-bold text-slate-900 transition-all cursor-pointer flex items-center justify-between outline-none group",
          isOpen ? "ring-2 ring-[#5C6EFF]/10" : "hover:bg-slate-100"
        )}
      >
        <span className="truncate">{selectedCountry.iso} ({selectedCountry.dialCode})</span>
        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none transition-transform group-active:scale-95">
          expand_more
        </span>
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[200] w-[240px] bg-white border border-slate-100 rounded-xl shadow-2xl shadow-slate-900/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-slate-50 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full bg-slate-50 border-none rounded-lg h-8 pl-8 pr-3 text-[11px] font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-0"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto thin-scrollbar p-1">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No results</div>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.iso}
                    onClick={() => handleSelect(country.iso)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between group",
                      country.iso === value 
                        ? "bg-[#5C6EFF] text-white" 
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="truncate pr-2">{country.name}</span>
                    <span className={cn(
                      "flex-shrink-0 opacity-60",
                      country.iso === value ? "text-white" : "text-slate-400"
                    )}>{country.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
