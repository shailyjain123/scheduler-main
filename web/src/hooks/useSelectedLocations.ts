import { useState, useEffect } from 'react';
import { SearchResult } from './useCitySearch';

export interface SelectedLocation {
  id: string;
  label: string;
  sublabel: string;
  timezone: string;
  iana: string;
}

const STORAGE_KEY = 'wtb_selected_locations';

export function useSelectedLocations() {
  const [selected, setSelected] = useState<SelectedLocation[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelected(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved locations:', e);
      }
    }
  }, []);

  const addLocation = (result: SearchResult) => {
    const location: SelectedLocation =
      result.type === 'timezone_group'
        ? {
            id: result.iana,
            label: result.display_name,
            sublabel: result.abbreviations.join(' / '),
            timezone: result.iana,
            iana: result.iana,
          }
        : {
            id: `city-${result.id}`,
            label: result.city,
            sublabel: `${result.country} · ${result.timezone_abbr}`,
            timezone: result.timezone,
            iana: result.timezone,
          };

    setSelected((prev) => {
      if (prev.find((l) => l.id === location.id)) return prev;
      const updated = [...prev, location].slice(0, 8); // Max 8
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeLocation = (id: string) => {
    setSelected((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const reorderLocations = (newOrder: SelectedLocation[]) => {
    setSelected(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  };

  return { selected, addLocation, removeLocation, reorderLocations };
}
