import { useEffect, useState } from 'react';
import { get } from './api.ts';

export type Loadable<T> = { status: 'loading'; data?: T } | { status: 'ok'; data: T } | { status: 'error'; error: string; data?: T };

/** Fetches `path` and refetches when it changes, keeping the last good data on screen while the next loads. */
export function useApi<T>(path: string | null): Loadable<T> & { reload: () => void } {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    setState((s) => ({ status: 'loading', data: s.data }));
    get<T>(path, ctrl.signal)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setState((s) => ({ status: 'error', error: e.message, data: s.data }));
      });
    return () => ctrl.abort();
  }, [path, attempt]);
  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
