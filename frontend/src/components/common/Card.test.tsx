import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies base styles', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('rounded-lg', 'border', 'bg-white', 'shadow-sm');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable</Card>);
    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies hover styles when hover prop is true', () => {
    const { container } = render(<Card hover>Hoverable</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('hover:shadow-md');
  });

  it('applies cursor-pointer when onClick is provided', () => {
    const { container } = render(<Card onClick={() => {}}>Clickable</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('cursor-pointer');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders children correctly', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('applies border styles', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.firstChild;
    expect(header).toHaveClass('border-b', 'px-4', 'py-3');
  });

  it('applies custom className', () => {
    const { container } = render(<CardHeader className="custom-class">Header</CardHeader>);
    const header = container.firstChild;
    expect(header).toHaveClass('custom-class');
  });
});

describe('CardTitle', () => {
  it('renders children correctly', () => {
    render(<CardTitle>Title text</CardTitle>);
    expect(screen.getByText('Title text')).toBeInTheDocument();
  });

  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('applies text styles', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.firstChild;
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });

  it('applies custom className', () => {
    const { container } = render(<CardTitle className="custom-class">Title</CardTitle>);
    const title = container.firstChild;
    expect(title).toHaveClass('custom-class');
  });
});

describe('CardContent', () => {
  it('renders children correctly', () => {
    render(<CardContent>Content text</CardContent>);
    expect(screen.getByText('Content text')).toBeInTheDocument();
  });

  it('applies padding styles', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    const content = container.firstChild;
    expect(content).toHaveClass('p-4');
  });

  it('applies custom className', () => {
    const { container } = render(<CardContent className="custom-class">Content</CardContent>);
    const content = container.firstChild;
    expect(content).toHaveClass('custom-class');
  });
});

describe('Card composition', () => {
  it('renders full card with all components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>Test content</CardContent>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});
