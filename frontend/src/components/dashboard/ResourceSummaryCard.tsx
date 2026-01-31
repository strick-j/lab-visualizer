import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common';
import { cn, getStatusConfig } from '@/lib/utils';
import type { ResourceCount, DisplayStatus } from '@/types';

interface ResourceSummaryCardProps {
  title: string;
  icon: React.ReactNode;
  counts: ResourceCount;
  href?: string;
  linkText?: string;
}

const statusOrder: (keyof Omit<ResourceCount, 'total'>)[] = ['active', 'inactive', 'transitioning', 'error'];

export function ResourceSummaryCard({
  title,
  icon,
  counts,
  href,
  linkText = 'View details',
}: ResourceSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{counts.total}</span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {statusOrder.map((status) => {
            const config = getStatusConfig(status as DisplayStatus);
            const count = counts[status];
            return (
              <div
                key={status}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn('h-2.5 w-2.5 rounded-full', config.dotColor)}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{config.label}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            );
          })}
        </div>
        {href && (
          <Link
            to={href}
            className="mt-3 block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {linkText} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
