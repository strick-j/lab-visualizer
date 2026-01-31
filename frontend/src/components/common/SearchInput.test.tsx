import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders input element', () => {
    render(<SearchInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<SearchInput placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('displays value', () => {
    render(<SearchInput value="test query" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('test query');
  });

  it('handles input change', () => {
    const handleChange = vi.fn();
    render(<SearchInput onChange={handleChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('shows clear button when value is present', () => {
    render(<SearchInput value="test" onChange={() => {}} onClear={() => {}} />);
    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('calls onClear when clear button clicked', () => {
    const handleClear = vi.fn();
    render(<SearchInput value="test" onChange={() => {}} onClear={handleClear} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('does not show clear button when value is empty', () => {
    render(<SearchInput value="" onChange={() => {}} onClear={() => {}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className to input', () => {
    render(<SearchInput className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });
});
