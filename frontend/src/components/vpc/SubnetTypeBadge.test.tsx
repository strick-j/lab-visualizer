import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SubnetTypeBadge } from './SubnetTypeBadge';

describe('SubnetTypeBadge', () => {
  it('renders public type correctly', () => {
    render(<SubnetTypeBadge type="public" />);
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('renders private type correctly', () => {
    render(<SubnetTypeBadge type="private" />);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('renders unknown type correctly', () => {
    render(<SubnetTypeBadge type="unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('applies public styling', () => {
    render(<SubnetTypeBadge type="public" />);
    const badge = screen.getByText('Public');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-800');
  });

  it('applies private styling', () => {
    render(<SubnetTypeBadge type="private" />);
    const badge = screen.getByText('Private');
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('applies unknown styling', () => {
    render(<SubnetTypeBadge type="unknown" />);
    const badge = screen.getByText('Unknown');
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-800');
  });

  it('capitalizes first letter', () => {
    render(<SubnetTypeBadge type="public" />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.queryByText('public')).not.toBeInTheDocument();
  });

  it('renders as span element', () => {
    const { container } = render(<SubnetTypeBadge type="public" />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });
});
