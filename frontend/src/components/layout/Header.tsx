import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/common';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useRefreshData, useStatusSummary } from '@/hooks';
import { formatRelativeTime } from '@/lib/utils';

export function Header() {
  const { data: summary } = useStatusSummary();
  const refreshMutation = useRefreshData();

  const handleRefresh = () => {
    refreshMutation.mutate(false);
  };

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-aws-squid">
            <svg className="h-5 w-5 text-aws-orange" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.75 3.94L12 .638 5.25 3.94 12 7.243l6.75-3.304zM4.5 5.01v8.232l6.75 3.304V8.314L4.5 5.01zm15 0L12.75 8.314v8.232l6.75-3.304V5.01zM5.25 20.06L12 23.362l6.75-3.303L12 16.757 5.25 20.06z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AWS Infrastructure Visualizer
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {formatRelativeTime(summary?.last_refreshed)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pr-6">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshMutation.isPending}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}
