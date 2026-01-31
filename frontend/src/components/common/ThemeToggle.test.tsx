import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ThemeToggle } from './ThemeToggle';

// Mock the ThemeContext but preserve ThemeProvider for test-utils
const mockToggleTheme = vi.fn();
let mockTheme = 'light';

vi.mock('../../contexts/ThemeContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/ThemeContext')>();
  return {
    ...actual,
    useTheme: () => ({
      theme: mockTheme,
      toggleTheme: mockToggleTheme,
    }),
  };
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
  });

  it('renders toggle button', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays "Dark" text when in light mode', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('displays "Light" text when in dark mode', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('calls toggleTheme when clicked', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label for light mode', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to dark mode'
    );
  });

  it('has correct aria-label for dark mode', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to light mode'
    );
  });

  it('renders moon icon in light mode', () => {
    mockTheme = 'light';
    const { container } = render(<ThemeToggle />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders sun icon in dark mode', () => {
    mockTheme = 'dark';
    const { container } = render(<ThemeToggle />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
