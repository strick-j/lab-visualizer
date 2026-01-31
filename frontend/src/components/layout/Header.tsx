import { RefreshCw, ScanEye } from 'lucide-react';
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
            <ScanEye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
