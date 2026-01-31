import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { StatusCard } from './StatusCard';
import { Server } from 'lucide-react';

describe('StatusCard', () => {
  it('renders title correctly', () => {
    render(
      <StatusCard
        title="Running Instances"
        count={5}
        status="active"
        icon={<Server data-testid="icon" />}
      />
    );
    expect(screen.getByText('Running Instances')).toBeInTheDocument();
  });

  it('renders count correctly', () => {
    render(
      <StatusCard
        title="Running Instances"
        count={5}
        status="active"
        icon={<Server data-testid="icon" />}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(
      <StatusCard
        title="Running Instances"
        count={5}
        status="active"
        icon={<Server data-testid="icon" />}
      />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies active status styling', () => {
    const { container } = render(
      <StatusCard
        title="Running"
        count={5}
        status="active"
        icon={<Server />}
      />
    );
    const iconContainer = container.querySelector('.bg-green-50');
    expect(iconContainer).toBeInTheDocument();
  });

  it('applies error status styling', () => {
    const { container } = render(
      <StatusCard
        title="Failed"
        count={1}
        status="error"
        icon={<Server />}
      />
    );
    const iconContainer = container.querySelector('.bg-red-50');
    expect(iconContainer).toBeInTheDocument();
  });

  it('applies inactive status styling', () => {
    const { container } = render(
      <StatusCard
        title="Stopped"
        count={2}
        status="inactive"
        icon={<Server />}
      />
    );
    const iconContainer = container.querySelector('.bg-gray-50');
    expect(iconContainer).toBeInTheDocument();
  });

  it('applies transitioning status styling', () => {
    const { container } = render(
      <StatusCard
        title="Pending"
        count={1}
        status="transitioning"
        icon={<Server />}
      />
    );
    const iconContainer = container.querySelector('.bg-yellow-50');
    expect(iconContainer).toBeInTheDocument();
  });

  it('handles click when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <StatusCard
        title="Running"
        count={5}
        status="active"
        icon={<Server />}
        onClick={handleClick}
      />
    );

    const card = screen.getByText('Running').closest('div');
    fireEvent.click(card!.parentElement!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies hover styling when clickable', () => {
    const { container } = render(
      <StatusCard
        title="Running"
        count={5}
        status="active"
        icon={<Server />}
        onClick={() => {}}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('cursor-pointer');
  });

  it('does not apply cursor-pointer when not clickable', () => {
    const { container } = render(
      <StatusCard
        title="Running"
        count={5}
        status="active"
        icon={<Server />}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).not.toHaveClass('cursor-pointer');
  });

  it('displays large counts correctly', () => {
    render(
      <StatusCard
        title="Resources"
        count={9999}
        status="active"
        icon={<Server />}
      />
    );
    expect(screen.getByText('9999')).toBeInTheDocument();
  });

  it('displays zero count correctly', () => {
    render(
      <StatusCard
        title="Resources"
        count={0}
        status="inactive"
        icon={<Server />}
      />
    );
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
