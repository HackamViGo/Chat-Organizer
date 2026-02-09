/// <reference types="chrome"/>

import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Load theme from storage and apply to DOM
  useEffect(() => {
    chrome.storage.local.get(['theme'], (result) => {
      const savedTheme = result.theme || 'dark';
      setTheme(savedTheme);
      applyTheme(savedTheme);
    });
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
    // console.debug('[Popup] Theme toggled to:', newTheme);
  };

  return { theme, toggleTheme };
}
