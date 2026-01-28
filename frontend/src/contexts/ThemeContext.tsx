import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'aws-visualizer-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    // Fall back to system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  useEffect(() => {
    console.log('Theme effect running, theme:', theme);
    const root = document.documentElement;

    if (theme === 'dark') {
      console.log('Adding dark class to documentElement');
      root.classList.add('dark');
    } else {
      console.log('Removing dark class from documentElement');
      root.classList.remove('dark');
    }

    // Persist to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    console.log('Theme saved to localStorage:', theme);
  }, [theme]);

  const toggleTheme = () => {
    console.log('toggleTheme called, current theme:', theme);
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      console.log('Setting theme to:', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
