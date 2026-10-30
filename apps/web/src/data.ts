import { useEffect, useState } from 'react';

const BASE = `${import.meta.env.BASE_URL}data/`;

// prices change only when the site is rebuilt, so each file is fetched once per visit
const cache = new Map<string, Promise<unknown>>();

export class DataError extends Error {}

export function fetchData<T>(file: string): Promise<T> {
  let p = cache.get(file);
  if (!p) {
    p = fetch(BASE + file)
      .then((res) => {
        if (!res.ok) throw new DataError("We couldn't load prices. Try again in a minute.");
        return res.json();
      })
      .catch((e: Error) => {
        cache.delete(file);
        throw e instanceof DataError ? e : new DataError("We couldn't reach PerRound. Check your connection and try again.");
      });
    cache.set(file, p);
  }
  return p as Promise<T>;
}

export type Loadable<T> = { status: 'loading'; data?: undefined } | { status: 'ok'; data: T } | { status: 'error'; error: string; data?: undefined };

/** Loads a data file, and loads it again when `file` changes or `reload` is called. */
export function useData<T>(file: string | null): Loadable<T> & { reload: () => void } {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!file) return;
    let live = true;
    setState({ status: 'loading' });
    fetchData<T>(file).then(
      (data) => live && setState({ status: 'ok', data }),
      (e: Error) => live && setState({ status: 'error', error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [file, attempt]);
  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
