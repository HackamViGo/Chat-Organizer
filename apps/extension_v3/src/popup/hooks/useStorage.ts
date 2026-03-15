/// \u003creference types="chrome"/>

import { useState, useEffect } from 'react';

/**
 * Hook for listening to chrome.storage.local changes
 * Returns current values and updates in real-time
 */
export function useStorage(keys: string[]) {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    // Initial load
    chrome.storage.local.get(keys, setValues);

    // Listen for changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      setValues((prev) => {
        const updated = { ...prev };
        keys.forEach((key) => {
          if (changes[key]) {
            updated[key] = changes[key].newValue;
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
