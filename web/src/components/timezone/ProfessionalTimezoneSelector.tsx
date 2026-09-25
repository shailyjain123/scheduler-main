'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';

export interface CitySearchResponse {
  timezone_groups: TimezoneGroup[];
  cities: CityResult[];
}

export interface TimezoneGroup {
  type: 'timezone_group';
  display_name: string;
  abbreviations: string[];
  label: string;
  iana: string;
  utc_offset: string;
  current_time: string;
}

export interface CityResult {
  type: 'city';
  id: number;
  city: string;
  country: string;
  country_code: string;
  timezone: string;
  timezone_abbr: string;
  utc_offset: string;
  current_time: string;
}

export type SearchResult = TimezoneGroup | CityResult;

export const SUGGESTED_TIMEZONES: SearchResult[] = [
  { iana: 'UTC', label: 'Universal Coordinated Time', current_time: '', utc_offset: '+00:00', type: 'timezone_group' } as TimezoneGroup,
  { iana: 'Europe/London', label: 'London, UK', current_time: '', utc_offset: '+01:00', type: 'timezone_group' } as TimezoneGroup,
  { iana: 'America/New_York', label: 'New York, USA', current_time: '', utc_offset: '-04:00', type: 'timezone_group' } as TimezoneGroup,
  { iana: 'Asia/Calcutta', label: 'Mumbai, India', current_time: '', utc_offset: '+05:30', type: 'timezone_group' } as TimezoneGroup,
  { iana: 'Asia/Tokyo', label: 'Tokyo, Japan', current_time: '', utc_offset: '+09:00', type: 'timezone_group' } as TimezoneGroup,
  { iana: 'Australia/Sydney', label: 'Sydney, Australia', current_time: '', utc_offset: '+11:00', type: 'timezone_group' } as TimezoneGroup,
];

interface Props {
  value?: string;
  onChange: (iana: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'compact' | 'full';
  hostTimezone?: string;
  label?: string;
}

const HighlightedText = ({ text, query, isActive }: { text: string; query: string; isActive?: boolean }) => {
  if (!query.trim()) return <span>{text}</span>;

  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span 
              key={i} 
              className={`font-bold underline underline-offset-4 decoration-2 ${
                isActive ? 'text-white decoration-white/40' : 'text-primary decoration-primary/30'
              }`}
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  } catch {
    return <span>{text}</span>;
  }
};

export const ProfessionalTimezoneSelector = ({
  value,
  onChange,
  placeholder = "Search city or timezone...",
  className = "",
  variant = 'full',
  hostTimezone,
  label,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggested timezones with real-time updates
  const suggestedResults = useMemo(() => {
    const now = new Date();
    return SUGGESTED_TIMEZONES.map(tz => {
      try {
        const time = new Intl.DateTimeFormat('en-US', {
          timeZone: tz.iana,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(now);
        const offset = new Intl.DateTimeFormat('en-US', {
          timeZone: tz.iana,
          timeZoneName: 'shortOffset'
        }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || tz.utc_offset;
        
        return { ...tz, current_time: time, utc_offset: offset };
      } catch {
        return tz;
      }
    });
  }, [isOpen]);

  const displayResults = searchQuery.length < 2 ? suggestedResults : searchResults;

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await apiClient.get<CitySearchResponse>(
          `/cities/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.success && res.data) {
          const groups = (res.data.timezone_groups || []).map(g => ({ ...g, type: 'timezone_group' as const }));
          const cities = (res.data.cities || []).map(c => ({ ...c, type: 'city' as const }));
          setSearchResults([...groups, ...cities]);
          setIsOpen(true);
          setActiveIndex(0);
        }
      } catch (err) {
        console.error('Timezone search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (city: SearchResult) => {
    onChange(city.iana || (city as CityResult).timezone);
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < displayResults.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (displayResults[activeIndex]) handleSelect(displayResults[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const selectedInfo = useMemo(() => {
    if (!value) return null;
    try {
      const now = new Date();
      return {
        iana: value,
        label: value.split('/').pop()?.replace(/_/g, ' ') || value,
        currentTime: new Intl.DateTimeFormat('en-US', {
          timeZone: value,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(now),
        offset: new Intl.DateTimeFormat('en-US', {
          timeZone: value,
          timeZoneName: 'shortOffset'
        }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '',
        hour24: parseInt(new Intl.DateTimeFormat('en-US', { timeZone: value, hour: 'numeric', hour12: false }).format(now))
      };
    } catch {
      return null;
    }
  }, [value]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box / Selected Display */}
      <div className="relative group">
        {!isOpen && selectedInfo && variant === 'compact' ? (
          <div 
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="w-full px-4 py-3 bg-surface-container rounded-2xl cursor-pointer flex items-center justify-between hover:bg-surface-container-high transition-all group/val"
          >
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-xl text-outline-variant group-hover/val:text-primary transition-colors">schedule</span>
               <div className="flex flex-col">
                  {label && <span className="text-[10px] font-bold text-outline-variant uppercase tracking-tight leading-none mb-1">{label}</span>}
                  <span className="text-sm font-bold text-on-surface leading-none">{selectedInfo.label}</span>
                  {!label && <span className="text-[10px] font-bold text-outline-variant opacity-60 uppercase tracking-widest mt-1">{selectedInfo.iana}</span>}
               </div>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-sm font-bold text-primary tabular-nums">{selectedInfo.currentTime}</span>
               <span className="material-symbols-outlined text-outline-variant text-[18px]">expand_more</span>
             </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline-variant group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined text-xl">schedule</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full pl-12 pr-12 py-3.5 bg-surface-container rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-on-surface placeholder:text-outline-variant/40 placeholder:font-medium shadow-sm"
            />
            {isLoading && (
              <div className="absolute inset-y-0 right-4 flex items-center">
                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute z-[100] mt-3 w-full bg-surface-container-highest rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-h-[350px] overflow-y-auto no-scrollbar py-2">
            {searchQuery.length < 2 && (
              <div className="px-6 py-3 border-b border-on-surface/[0.03]">
                <p className="text-[9px] font-bold text-outline-variant uppercase tracking-[0.2em]">Suggested Timezones</p>
              </div>
            )}
            
            {displayResults.length > 0 ? (
              displayResults.map((city, idx) => {
                const isActive = idx === activeIndex;
                const isGroup = city.type === 'timezone_group';
                
                return (
                  <div
                    key={isGroup ? `group-${city.iana}` : `city-${city.id}`}
                    onClick={() => handleSelect(city)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-all border-b border-on-surface/[0.03] last:border-0 ${
                      isActive ? 'bg-primary text-white z-10 shadow-lg' : 'hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">
                          <HighlightedText 
                            text={isGroup ? city.label : `${city.city}, ${city.country}`} 
                            query={searchQuery} 
                            isActive={isActive}
                          />
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isActive ? 'text-white/80' : 'text-outline-variant opacity-60'}`}>
                        {isGroup ? city.iana : `${city.timezone} · ${city.timezone_abbr}`}
                      </span>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 ml-4">
                      <span className={`text-base font-bold tabular-nums ${isActive ? 'text-white' : 'text-on-surface'}`}>
                        {city.current_time}
                      </span>
                      <span className={`text-[10px] font-bold ${isActive ? 'text-white/70' : 'text-outline-variant opacity-60'}`}>
                        UTC {city.utc_offset}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : searchQuery.length >= 2 && !isLoading ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-bold text-outline-variant">No results found</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Display Card when not searching (Full variant only) */}
      {!isOpen && selectedInfo && variant === 'full' && (
        <div className="mt-4 overflow-hidden rounded-3xl transition-all duration-700 relative bg-surface-container-low p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex flex-col gap-4 z-10">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all w-12 h-12">
                <span className="material-symbols-outlined text-xl">language</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold text-on-surface tracking-tight leading-none text-lg">
                  {selectedInfo.label}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline-variant opacity-60">
                    {selectedInfo.iana}
                  </span>
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                    {selectedInfo.offset}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-600/70 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                AI Synced
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end z-10">
            <div className="font-bold text-on-surface tabular-nums tracking-tighter transition-all text-6xl text-primary drop-shadow-sm">
              {selectedInfo.currentTime}
            </div>
            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-[0.2em] mt-1">Local Time</p>
          </div>

          <div className="hidden lg:block w-[240px] h-[120px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-40">
            <svg viewBox="0 0 1000 500" className="w-full h-full text-primary fill-current">
              <path d="M150,100 C200,50 350,150 450,100 S650,50 850,200" stroke="currentColor" fill="none" strokeWidth="2" strokeDasharray="10 10" />
              <circle cx="500" cy="250" r="10" className="animate-pulse" />
              <circle cx="500" cy="250" r="30" className="stroke-current fill-none animate-ping opacity-30" />
            </svg>
          </div>
        </div>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ProfessionalTimezoneSelector;
