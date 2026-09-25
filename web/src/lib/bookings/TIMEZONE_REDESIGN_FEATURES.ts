/**
 * Timezone Selector Redesign - Feature Showcase & Test Cases
 * 
 * This file demonstrates the improved timezone search experience with
 * all the requested features from the redesign specification.
 */

import {
  buildEnhancedTimezoneMetadata,
  createSearchIndex,
  getCurrentTimeInTimezone,
} from '@/lib/bookings/timezoneMetadata';
import { searchTimezones } from '@/lib/bookings/timezoneSearch';

/**
 * FEATURE DEMONSTRATIONS
 * 
 * Run these examples to verify the timezone selector works correctly
 */

export const FEATURE_TESTS = {
  /**
   * 1. ABBREVIATION SEARCH - Timezone abbreviations work correctly
   */
  abbreviationSearch: {
    description: 'Search timezone abbreviations like IST, EST, EDT, PST, CET, GMT, UTC',
    testCases: [
      { query: 'IST', expectedResults: ['Asia/Kolkata'], description: 'Indian Standard Time' },
      { query: 'EST', expectedResults: ['America/New_York'], description: 'Eastern Standard Time' },
      { query: 'EDT', expectedResults: ['America/New_York'], description: 'Eastern Daylight Time' },
      { query: 'PST', expectedResults: ['America/Los_Angeles'], description: 'Pacific Standard Time' },
      { query: 'PDT', expectedResults: ['America/Los_Angeles'], description: 'Pacific Daylight Time' },
      { query: 'CET', expectedResults: ['Europe/Paris'], description: 'Central European Time' },
      { query: 'BST', expectedResults: ['Europe/London'], description: 'British Summer Time' },
      { query: 'GMT', expectedResults: ['Europe/London'], description: 'Greenwich Mean Time' },
      { query: 'UTC', expectedResults: ['UTC'], description: 'Coordinated Universal Time' },
    ],
  },

  /**
   * 2. FULL TIMEZONE NAMES - Complete timezone name search
   */
  fullTimezoneNames: {
    description: 'Search using full timezone names',
    testCases: [
      { query: 'Indian Standard Time', shouldMatch: ['Asia/Kolkata'] },
      { query: 'Eastern Standard Time', shouldMatch: ['America/New_York'] },
      { query: 'British Summer Time', shouldMatch: ['Europe/London'] },
      { query: 'Eastern Time (US)', shouldContain: ['America/New_York'] },
    ],
  },

  /**
   * 3. CITY NAME SEARCH - Search by city names
   */
  citySearch: {
    description: 'Search by city names',
    testCases: [
      { query: 'kolkata', shouldMatch: ['Asia/Kolkata'] },
      { query: 'calcutta', shouldMatch: ['Asia/Kolkata'], description: 'Legacy city name' },
      { query: 'mumbai', shouldMatch: ['Asia/Kolkata'] },
      { query: 'london', shouldMatch: ['Europe/London'] },
      { query: 'paris', shouldMatch: ['Europe/Paris'] },
      { query: 'new york', shouldMatch: ['America/New_York'] },
      { query: 'los angeles', shouldMatch: ['America/Los_Angeles'] },
      { query: 'tokyo', shouldMatch: ['Asia/Tokyo'] },
      { query: 'sydney', shouldMatch: ['Australia/Sydney'] },
      { query: 'auckland', shouldMatch: ['Pacific/Auckland'] },
    ],
  },

  /**
   * 4. COUNTRY/REGION SEARCH - Search by country or region names
   */
  countrySearch: {
    description: 'Search by country or region names',
    testCases: [
      { query: 'India', shouldMatch: ['Asia/Kolkata'] },
      { query: 'UK', shouldMatch: ['Europe/London'] },
      { query: 'France', shouldMatch: ['Europe/Paris'] },
      { query: 'USA', shouldMatch: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'] },
      { query: 'Australia', shouldMatch: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth'] },
      { query: 'Japan', shouldMatch: ['Asia/Tokyo'] },
    ],
  },

  /**
   * 5. IANA TIMEZONE ID SEARCH - Search by IANA timezone identifiers
   */
  ianaIdSearch: {
    description: 'Search by IANA timezone IDs',
    testCases: [
      { query: 'Asia/Kolkata', shouldMatch: ['Asia/Kolkata'] },
      { query: 'Europe/London', shouldMatch: ['Europe/London'] },
      { query: 'America/New_York', shouldMatch: ['America/New_York'] },
      { query: 'Australia/Sydney', shouldMatch: ['Australia/Sydney'] },
    ],
  },

  /**
   * 6. GMT/UTC OFFSET SEARCH - Search by UTC offsets
   */
  offsetSearch: {
    description: 'Search by GMT/UTC offset notations',
    testCases: [
      { query: 'GMT+5:30', shouldMatch: ['Asia/Kolkata'], description: 'IST offset' },
      { query: '+5:30', shouldMatch: ['Asia/Kolkata'] },
      { query: 'UTC-5', shouldContain: ['America/New_York'] },
      { query: 'GMT-8', shouldContain: ['America/Los_Angeles'] },
    ],
  },

  /**
   * 7. FUZZY MATCHING - Partial matches and typos
   */
  fuzzyMatching: {
    description: 'Support for partial/fuzzy matches',
    testCases: [
      { query: 'Kol', shouldMatch: ['Asia/Kolkata'], description: 'Partial city name' },
      { query: 'Cal', shouldMatch: ['Asia/Kolkata'], description: 'Calcutta prefix' },
      { query: 'east', shouldContain: ['America/New_York'], description: 'Eastern prefix' },
      { query: 'lond', shouldMatch: ['Europe/London'], description: 'London typo' },
      { query: 'parry', shouldContain: ['Europe/Paris'], description: 'Paris typo' },
    ],
  },

  /**
   * 8. CURRENT LOCAL TIME DISPLAY - Show current time for each timezone
   */
  currentTimeDisplay: {
    description: 'Display current local time in each timezone',
    examples: [
      'Shows format like "7:11a", "2:30p", etc.',
      'Updates dynamically every minute',
      'Displayed on the right side of each result',
    ],
  },

  /**
   * 9. INTELLIGENT RANKING - Results ranked by relevance
   */
  resultRanking: {
    description: 'Search results ranked by relevance',
    testCases: [
      {
        query: 'EST',
        expectedRanking: [
          'America/New_York (exact abbreviation match)',
          'Other Eastern Time zones',
        ],
        description: 'EST should prioritize Eastern Standard Time',
      },
      {
        query: 'London',
        expectedRanking: [
          'Europe/London (city exact match)',
          'Other locations with London in name',
        ],
        description: 'London should match Europe/London first',
      },
    ],
  },

  /**
   * 10. RESPONSIVE DESIGN
   */
  responsiveDesign: {
    description: 'Works on all screen sizes',
    platforms: ['Mobile (< 640px)', 'Tablet (640px - 1024px)', 'Desktop (> 1024px)'],
    features: [
      'Full-width input on mobile',
      'Properly sized dropdown on all sizes',
      'Touch-friendly on mobile',
      'Hover states on desktop',
    ],
  },

  /**
   * 11. KEYBOARD NAVIGATION
   */
  keyboardNavigation: {
    description: 'Full keyboard support',
    controls: [
      'Arrow Down: Move to next result',
      'Arrow Up: Move to previous result',
      'Enter: Select highlighted timezone',
      'Escape: Close dropdown',
      'Tab: Close dropdown and move focus',
    ],
  },

  /**
   * 12. ACCESSIBILITY FEATURES
   */
  accessibility: {
    description: 'WCAG compliant',
    features: [
      'Semantic HTML structure',
      'Proper ARIA labels',
      'Keyboard navigation support',
      'Screen reader friendly',
      'Focus management',
      'Color contrast compliance',
    ],
  },

  /**
   * 13. PERFORMANCE OPTIMIZATION
   */
  performance: {
    description: 'Optimized for large datasets',
    optimizations: [
      'Search index for O(1) lookup',
      'Memoized computations',
      'Limited results (50 max)',
      'Lazy rendering of dropdown',
      'No unnecessary re-renders',
    ],
  },
};

/**
 * RUN A QUICK TEST
 */
export const runQuickTest = () => {
  console.log('🌍 Timezone Selector Redesign - Quick Test\n');

  // Build metadata
  const metadata = buildEnhancedTimezoneMetadata();
  const searchIndex = createSearchIndex(metadata);

  console.log(`✅ Built metadata for ${metadata.length} timezones\n`);

  // Test searches
  const testQueries = [
    'IST',
    'EST',
    'Kolkata',
    'London',
    'India',
    'GMT+5:30',
    'east',
  ];

  testQueries.forEach(query => {
    const results = searchTimezones(query, metadata, searchIndex);
    console.log(`\n📍 Search: "${query}"`);
    console.log(`   Found ${results.length} result(s):`);
    
    results.slice(0, 3).forEach((result, i) => {
      const tz = result.timezone;
      const time = getCurrentTimeInTimezone(tz.id);
      console.log(
        `   ${i + 1}. ${tz.displayName} (${tz.abbreviations[0]}) - ${time}`
      );
    });
  });

  console.log('\n✨ Test completed!\n');
};

export default FEATURE_TESTS;
