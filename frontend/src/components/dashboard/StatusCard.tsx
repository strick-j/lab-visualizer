import { cn, getStatusConfig } from '@/lib/utils';
import type { DisplayStatus } from '@/types';

interface StatusCardProps {
  title: string;
  count: number;
  status: DisplayStatus;
  icon: React.ReactNode;
  onClick?: () => void;
}

export function StatusCard({ title, count, status, icon, onClick }: StatusCardProps) {
  const config = getStatusConfig(status);

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md'
      )}
      onClick={onClick}
    >
      <div className={cn('rounded-lg p-3', config.bgColor)}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
      </div>
    </div>
  );
}
