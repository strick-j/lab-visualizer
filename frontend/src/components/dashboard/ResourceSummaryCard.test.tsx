import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ResourceSummaryCard } from './ResourceSummaryCard';
import { Server } from 'lucide-react';

const mockCounts = {
  total: 10,
  active: 5,
  inactive: 2,
  transitioning: 2,
  error: 1,
};

describe('ResourceSummaryCard', () => {
  it('renders title correctly', () => {
    render(
      <ResourceSummaryCard
        title="EC2 Instances"
        icon={<Server data-testid="icon" />}
        counts={mockCounts}
      />
    );
    expect(screen.getByText('EC2 Instances')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(
      <ResourceSummaryCard
        title="EC2 Instances"
        icon={<Server data-testid="icon" />}
        counts={mockCounts}
      />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('displays total count', () => {
    render(
      <ResourceSummaryCard
        title="EC2 Instances"
        icon={<Server data-testid="icon" />}
        counts={mockCounts}
      />
    );
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays all status counts', () => {
    render(
      <ResourceSummaryCard
        title="EC2 Instances"
        icon={<Server data-testid="icon" />}
        counts={mockCounts}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    // '2' appears twice (inactive and transitioning)
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getByText('Transitioning')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders status labels correctly', () => {
    render(
      <ResourceSummaryCard
        title="EC2 Instances"
        icon={<Server data-testid="icon" />}
        counts={mockCounts}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Transitioning')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders status indicators with correct styling', () => {
    const { container } = render(
      <ResourceSummaryCard
        title="EC2 Instances"
        icon={<Server data-testid="icon" />}
        counts={mockCounts}
      />
    );
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots.length).toBe(4); // active, inactive, transitioning, error
  });

  it('renders with zero counts', () => {
    const zeroCounts = {
      total: 0,
      active: 0,
      inactive: 0,
      transitioning: 0,
      error: 0,
    };
    render(
      <ResourceSummaryCard
        title="EC2 Instances"
        icon={<Server data-testid="icon" />}
        counts={zeroCounts}
      />
    );
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });
});
