/// <reference types="chrome"/>

import { useState, useEffect } from 'react';

/**
 * Hook for listening to chrome.storage.local changes
 * Returns current values and updates in real-time
 */
export function useStorage<T extends Record<string, unknown>>(keys: (keyof T & string)[]) {
  const [values, setValues] = useState<Partial<T>>({});

  useEffect(() => {
    chrome.storage.local.get(keys, (result) => setValues(result as Partial<T>));

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      setValues((prev) => {
        const updated = { ...prev };
        keys.forEach((key) => {
          if (changes[key]) {
            updated[key] = changes[key].newValue as T[typeof key];
          }
        });
        return updated;
      });
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [keys.join(',')]);

  return values;
}