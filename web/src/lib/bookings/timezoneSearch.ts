/**
 * Smart timezone search and ranking engine
 * Implements fuzzy matching, intelligent ranking, and semantic awareness
 */

import { EnhancedTimezoneMetadata, createSearchIndex } from './timezoneMetadata';

export type SearchResult = {
  timezone: EnhancedTimezoneMetadata;
  score: number;
  relevance: 'exact' | 'abbreviation' | 'city' | 'country' | 'keyword' | 'fuzzy';
};

/**
 * Calculate Levenshtein distance for fuzzy matching
 * Used to support typos and partial matches
 */
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculate fuzzy match score (0-100)
 * Higher score = better match
 */
const calculateFuzzyScore = (query: string, target: string): number => {
  if (query === target) return 100;
  if (target.includes(query)) return 90;
  
  const distance = levenshteinDistance(query, target);
  const maxLength = Math.max(query.length, target.length);
  
  // Convert distance to similarity score (0-100)
  return Math.max(0, 100 - (distance / maxLength) * 100);
};

/**
 * Main timezone search function with intelligent ranking
 */
export const searchTimezones = (
  query: string,
  metadata: EnhancedTimezoneMetadata[],
  searchIndex: Map<string, EnhancedTimezoneMetadata[]>
): SearchResult[] => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    // Return limited set of most common timezones sorted by offset
    return metadata.slice(0, 20).map(tz => ({
      timezone: tz,
      score: 50,
      relevance: 'keyword' as const,
    }));
  }

  const results = new Map<string, SearchResult>();

  // PHASE 1: Exact matches and direct lookups
  
  // Exact ID match (highest priority)
  const exactIdMatch = metadata.find(tz => tz.id.toLowerCase() === normalizedQuery);
  if (exactIdMatch) {
    results.set(exactIdMatch.id, {
      timezone: exactIdMatch,
      score: 1000,
      relevance: 'exact',
    });
  }

  // Exact abbreviation match
  const abbrevMatch = metadata.find(tz =>
    tz.abbreviations.some(a => a.toLowerCase() === normalizedQuery)
  );
  if (abbrevMatch && !results.has(abbrevMatch.id)) {
    results.set(abbrevMatch.id, {
      timezone: abbrevMatch,
      score: 950,
      relevance: 'abbreviation',
    });
  }

  // PHASE 2: Keyword-based search using index
  
  const queryParts = normalizedQuery.split(/[\s+-]+/).filter(p => p.length > 0);
  const keywordMatches = new Set<string>();

  queryParts.forEach(part => {
    // Look for exact keyword matches
    if (searchIndex.has(part)) {
      searchIndex.get(part)!.forEach(tz => {
        keywordMatches.add(tz.id);
      });
    }

    // Look for prefix matches
    searchIndex.forEach((timezones, keyword) => {
      if (keyword.startsWith(part) && part.length > 1) {
        timezones.forEach(tz => {
          keywordMatches.add(tz.id);
        });
      }
    });
  });

  // Score keyword matches
  keywordMatches.forEach(tzId => {
    const tz = metadata.find(t => t.id === tzId);
    if (!tz || results.has(tzId)) return;

    let score = 0;
    let relevance: SearchResult['relevance'] = 'keyword';

    // Check how many query parts match
    const matchedParts = queryParts.filter(part =>
      tz.keywords.some(kw => kw.startsWith(part))
    );

    const partMatchRatio = matchedParts.length / queryParts.length;

    const cityOrAliasMatchesQuery =
      tz.cities.some(c => c.includes(normalizedQuery)) ||
      tz.aliases.some(a => a.includes(normalizedQuery));

    const countryMatchesQuery =
      !!tz.country &&
      (tz.country.toLowerCase().startsWith(normalizedQuery) ||
        tz.country.toLowerCase().includes(normalizedQuery));

    // Score based on match type and completeness
    if (cityOrAliasMatchesQuery) {
      score = 800 * partMatchRatio;
      relevance = 'city';
    } else if (countryMatchesQuery) {
      score = 750 * partMatchRatio;
      relevance = 'country';
    } else if (matchedParts.length === queryParts.length) {
      // All parts match
      score = 700 * partMatchRatio;
    } else if (matchedParts.length > 0) {
      // Partial match
      score = 400 * partMatchRatio;
    }

    if (score > 0) {
      results.set(tzId, {
        timezone: tz,
        score,
        relevance,
      });
    }
  });

  // PHASE 3: Fuzzy matching for typos and unusual inputs
  
  // Only apply fuzzy matching if we don't have enough exact matches
  if (results.size < 5) {
    metadata.forEach(tz => {
      if (results.has(tz.id)) return; // Already scored

      let bestFuzzyScore = 0;
      let bestRelevance: SearchResult['relevance'] = 'fuzzy';

      // Fuzzy match against all keywords
      tz.keywords.forEach(keyword => {
        const fuzzyScore = calculateFuzzyScore(normalizedQuery, keyword);
        if (fuzzyScore > bestFuzzyScore && fuzzyScore > 60) {
          bestFuzzyScore = fuzzyScore;
          // Determine relevance based on keyword type
          if (tz.cities.includes(keyword) || tz.aliases.includes(keyword)) {
            bestRelevance = 'city';
          } else if (
            tz.country &&
            (tz.country.toLowerCase() === keyword || tz.country.toLowerCase().includes(keyword))
          ) {
            bestRelevance = 'country';
          }
        }
      });

      if (bestFuzzyScore > 60) {
        results.set(tz.id, {
          timezone: tz,
          score: bestFuzzyScore * 7, // Scale up fuzzy scores
          relevance: bestRelevance,
        });
      }
    });
  }

  // PHASE 4: Sort results by score and format output
  
  const sorted = Array.from(results.values())
    .sort((a, b) => {
      // Primary: score
      if (b.score !== a.score) return b.score - a.score;
      
      // Secondary: relevance ranking
      const relevanceOrder: Record<SearchResult['relevance'], number> = {
        exact: 1,
        abbreviation: 2,
        city: 3,
        country: 4,
        keyword: 5,
        fuzzy: 6,
      };
      
      return relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
    })
    .slice(0, 50); // Limit results

  return sorted;
};

/**
 * Get suggestions similar to a query (for autocomplete/recommendations)
 */
export const getTimezoneSuggestions = (
  query: string,
  metadata: EnhancedTimezoneMetadata[],
  limit: number = 10
): EnhancedTimezoneMetadata[] => {
  const searchIndex = createSearchIndex(metadata);
  const results = searchTimezones(query, metadata, searchIndex);
  return results.slice(0, limit).map(r => r.timezone);
};
