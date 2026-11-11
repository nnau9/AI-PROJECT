import { useCallback, useEffect, useState } from 'react';
import { contentRepository } from '../services.js';

/**
 * Загружает несколько коллекций контента сразу.
 * @param {Record<string, (repo: typeof contentRepository) => Promise<any>>} loaders
 */
export function useContent(loaders) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  // loaders объявляются на уровне модуля страниц, поэтому зависимость стабильна.
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    const entries = Object.entries(loaders);
    Promise.all(entries.map(([, load]) => load(contentRepository)))
      .then((values) => {
        if (cancelled) return;
        setState({
          status: 'success',
          data: Object.fromEntries(entries.map(([key], i) => [key, values[i]])),
          error: null,
        });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [loaders, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

/** Состояние в localStorage (только неличные данные, например отметки чек-листа). */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* хранилище недоступно — работаем без сохранения */
    }
  }, [key, value]);
  return [value, setValue];
}
