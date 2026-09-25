import { useState, useEffect, useRef } from 'react';

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

export function useCitySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const res = await fetch(
          `${apiUrl}/api/v1/cities/search?q=${encodeURIComponent(query)}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setResults([...json.data.timezone_groups, ...json.data.cities]);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Timezone search failed:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { query, setQuery, results, loading };
}
