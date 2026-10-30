import { useCallback, useState } from 'react';

// Things a shopper sets once and expects us to remember: how much they usually buy and where they live.
const KEY = 'perround:prefs';

export interface Prefs {
  want: number;
  state: string;
}

const DEFAULTS: Prefs = { want: 500, state: '' };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    // private windows and blocked storage just fall back to defaults
  }
  return DEFAULTS;
}

export function usePrefs(): [Prefs, (next: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState(load);
  const update = useCallback((next: Partial<Prefs>) => {
    setPrefs((cur) => {
      const merged = { ...cur, ...next };
      try {
        localStorage.setItem(KEY, JSON.stringify(merged));
      } catch {
        // not fatal
      }
      return merged;
    });
  }, []);
  return [prefs, update];
}

export const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD',
  'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];
