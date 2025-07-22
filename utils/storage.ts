import { storage } from 'wxt/storage';

// WXT Storage docs: https://wxt.dev/storage.html#defining-storage-items
export const popupCurrentPage = storage.defineItem(
  'local:popupCurrentPage',
  {
    defaultValue: 'context-manager',
  }
);

type WordPreferences = {
  usage: boolean;
  etymology: boolean;
  connotations: boolean;
  'related-terms': boolean;
}

type SentencePreferences = {
  translate: string;
  summarize: boolean;
}

export type PreferenceKeys = "description" | keyof WordPreferences | keyof SentencePreferences;

export type Preferences = {
  word: WordPreferences;
  sentence: SentencePreferences;
}

export const defaultPreferences = {
  word: {
    usage: true,
    etymology: false,
    connotations: false,
    'related-terms': false,
  },
  sentence: {
    translate: 'en',
    summarize: true,
  }
}

export const preferences = storage.defineItem(
  'local:preferences',
  {
    defaultValue: defaultPreferences,
  }
);