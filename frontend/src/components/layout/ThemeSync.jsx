import { useEffect } from 'react';
import { useSelector } from 'react-redux';

export default function ThemeSync() {
  const theme = useSelector((state) => state.ui.theme);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const resolvedTheme = theme === 'light' ? 'light' : 'dark';

    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    window.localStorage.setItem('crypto-sim-theme', resolvedTheme);

    return undefined;
  }, [theme]);

  return null;
}