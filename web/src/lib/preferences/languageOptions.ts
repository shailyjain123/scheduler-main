export type LanguageOption = {
  id: string; // Language code (e.g., 'en', 'es', 'fr')
  label: string; // Display label (e.g., 'English (US)')
  nativeName: string; // Native language name (e.g., 'English')
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  // English variants
  { id: 'en', label: 'English', nativeName: 'English' },
  { id: 'en-US', label: 'English (US)', nativeName: 'English' },
  { id: 'en-GB', label: 'English (UK)', nativeName: 'English' },
  { id: 'en-AU', label: 'English (Australia)', nativeName: 'English' },

  // Spanish variants
  { id: 'es', label: 'Spanish', nativeName: 'Español' },
  { id: 'es-ES', label: 'Spanish (Spain)', nativeName: 'Español' },
  { id: 'es-MX', label: 'Spanish (Mexico)', nativeName: 'Español' },

  // French variants
  { id: 'fr', label: 'French', nativeName: 'Français' },
  { id: 'fr-FR', label: 'French (France)', nativeName: 'Français' },
  { id: 'fr-CA', label: 'French (Canada)', nativeName: 'Français' },

  // German
  { id: 'de', label: 'German', nativeName: 'Deutsch' },
  { id: 'de-DE', label: 'German (Germany)', nativeName: 'Deutsch' },

  // Italian
  { id: 'it', label: 'Italian', nativeName: 'Italiano' },

  // Portuguese variants
  { id: 'pt', label: 'Portuguese', nativeName: 'Português' },
  { id: 'pt-BR', label: 'Portuguese (Brazil)', nativeName: 'Português' },
  { id: 'pt-PT', label: 'Portuguese (Portugal)', nativeName: 'Português' },

  // Dutch
  { id: 'nl', label: 'Dutch', nativeName: 'Nederlands' },

  // Swedish
  { id: 'sv', label: 'Swedish', nativeName: 'Svenska' },

  // Norwegian
  { id: 'no', label: 'Norwegian', nativeName: 'Norsk' },

  // Danish
  { id: 'da', label: 'Danish', nativeName: 'Dansk' },

  // Polish
  { id: 'pl', label: 'Polish', nativeName: 'Polski' },

  // Russian
  { id: 'ru', label: 'Russian', nativeName: 'Русский' },

  // Japanese
  { id: 'ja', label: 'Japanese', nativeName: '日本語' },

  // Chinese variants
  { id: 'zh', label: 'Chinese (Simplified)', nativeName: '简体中文' },
  { id: 'zh-CN', label: 'Chinese (Simplified, China)', nativeName: '简体中文' },
  { id: 'zh-TW', label: 'Chinese (Traditional, Taiwan)', nativeName: '繁體中文' },

  // Korean
  { id: 'ko', label: 'Korean', nativeName: '한국어' },

  // Hindi
  { id: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },

  // Arabic
  { id: 'ar', label: 'Arabic', nativeName: 'العربية' },

  // Thai
  { id: 'th', label: 'Thai', nativeName: 'ไทย' },

  // Vietnamese
  { id: 'vi', label: 'Vietnamese', nativeName: 'Tiếng Việt' },

  // Indonesian
  { id: 'id', label: 'Indonesian', nativeName: 'Bahasa Indonesia' },

  // Tagalog / Filipino
  { id: 'tl', label: 'Tagalog', nativeName: 'Tagalog' },

  // Turkish
  { id: 'tr', label: 'Turkish', nativeName: 'Türkçe' },

  // Greek
  { id: 'el', label: 'Greek', nativeName: 'Ελληνικά' },

  // Hebrew
  { id: 'he', label: 'Hebrew', nativeName: 'עברית' },
];

export const buildLanguageOptions = (): LanguageOption[] => {
  return LANGUAGE_OPTIONS.sort((a, b) => a.label.localeCompare(b.label));
};

export const resolveLanguage = (value?: string | null): string => {
  if (!value) return 'en';
  const v = value.trim();
  const found = LANGUAGE_OPTIONS.find(
    (opt) => opt.id.toLowerCase() === v.toLowerCase()
  );
  return found ? found.id : 'en';
};
