import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface DataFreshnessIndicatorProps {
  lastRefreshed: string | null;
  className?: string;
}

function getRelativeTime(dateStr: string): {
  text: string;
  level: "fresh" | "stale" | "old";
} {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  let text: string;
  if (diffMin < 1) {
    text = "Just now";
  } else if (diffMin < 60) {
    text = `${diffMin}m ago`;
  } else {
    const hours = Math.floor(diffMin / 60);
    text = `${hours}h ${diffMin % 60}m ago`;
  }

  let level: "fresh" | "stale" | "old";
  if (diffMin < 5) {
    level = "fresh";
  } else if (diffMin < 15) {
    level = "stale";
  } else {
    level = "old";
  }

  return { text, level };
}

const levelColors = {
  fresh: "text-green-600 dark:text-green-400",
  stale: "text-yellow-600 dark:text-yellow-400",
  old: "text-red-600 dark:text-red-400",
};

export function DataFreshnessIndicator({
  lastRefreshed,
  className = "",
}: DataFreshnessIndicatorProps) {
  const [, setTick] = useState(0);

  // Re-render every 30 seconds to update relative time
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!lastRefreshed) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 ${className}`}
      >
        <Clock className="h-3 w-3" />
        No data
      </span>
    );
  }

  const { text, level } = getRelativeTime(lastRefreshed);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${levelColors[level]} ${className}`}
      title={`Last updated: ${new Date(lastRefreshed).toLocaleString()}`}
    >
      <Clock className="h-3 w-3" />
      Updated {text}
    </span>
  );
}
