import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleClick = () => {
    console.log('ThemeToggle button clicked');
    toggleTheme();
  };

  console.log('ThemeToggle rendering, current theme:', theme);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      icon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </Button>
  );
}
