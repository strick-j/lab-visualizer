import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { Select } from './Select';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders with placeholder', () => {
    render(<Select options={options} placeholder="Select an option" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select options={options} placeholder="Select" />);
    expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option 3' })).toBeInTheDocument();
  });

  it('handles value change', () => {
    const handleChange = vi.fn();
    render(<Select options={options} placeholder="Select" onChange={handleChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'option2' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays selected value', () => {
    render(<Select options={options} placeholder="Select" value="option2" />);
    expect(screen.getByRole('combobox')).toHaveValue('option2');
  });

  it('applies custom className', () => {
    render(<Select options={options} placeholder="Select" className="custom-class" />);
    expect(screen.getByRole('combobox')).toHaveClass('custom-class');
  });

  it('shows placeholder as first option', () => {
    render(<Select options={options} placeholder="Choose..." />);
    const firstOption = screen.getByRole('option', { name: 'Choose...' });
    expect(firstOption).toBeInTheDocument();
    expect(firstOption).toHaveValue('');
  });
});
