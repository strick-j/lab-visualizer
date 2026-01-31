import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

describe('EmptyState', () => {
  it('renders title correctly', () => {
    render(<EmptyState title="No data found" />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders title as heading', () => {
    render(<EmptyState title="No data found" />);
    expect(screen.getByRole('heading', { name: /no data found/i })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No data" description="Please add some items" />);
    expect(screen.getByText('Please add some items')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="No data" />);
    expect(screen.queryByText('Please add some items')).not.toBeInTheDocument();
  });

  it('renders default icon when none provided', () => {
    const { container } = render(<EmptyState title="No data" />);
    // Should have the InboxIcon SVG
    const iconContainer = container.querySelector('.rounded-full.bg-gray-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    const CustomIcon = () => <span data-testid="custom-icon">Custom</span>;
    render(<EmptyState title="No data" icon={<CustomIcon />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        title="No data"
        action={<Button>Add Item</Button>}
      />
    );
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('applies dashed border styles', () => {
    const { container } = render(<EmptyState title="No data" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('border-dashed', 'border-2');
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="No data" className="custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('centers content', () => {
    const { container } = render(<EmptyState title="No data" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'text-center');
  });
});
