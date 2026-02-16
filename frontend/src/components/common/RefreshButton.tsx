import { RefreshCw } from "lucide-react";
import { useRefreshData } from "@/hooks/useResources";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  lastRefreshed?: string | null;
  className?: string;
  size?: "sm" | "md";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

export function RefreshButton({
  lastRefreshed,
  className,
  size = "sm",
}: RefreshButtonProps) {
  const refreshMutation = useRefreshData();

  const handleRefresh = () => {
    refreshMutation.mutate(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {lastRefreshed && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Updated {formatRelativeTime(lastRefreshed)}
        </span>
      )}
      <button
        onClick={handleRefresh}
        disabled={refreshMutation.isPending}
        title="Refresh data from AWS"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        )}
      >
        <RefreshCw
          className={cn(
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
            refreshMutation.isPending && "animate-spin",
          )}
        />
        {size === "md" &&
          (refreshMutation.isPending ? "Refreshing..." : "Refresh")}
      </button>
    </div>
  );
}
