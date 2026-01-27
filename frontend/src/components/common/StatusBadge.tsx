import { cn, getStatusConfig } from '@/lib/utils';
import type { DisplayStatus } from '@/types';

interface StatusBadgeProps {
  status: DisplayStatus;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  showDot = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            config.dotColor,
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
            status === 'transitioning' && 'animate-pulse'
          )}
        />
      )}
      {config.label}
    </span>
  );
}
