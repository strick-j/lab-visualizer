import { cn } from "@/lib/utils";

interface TerraformBadgeProps {
  managed: boolean;
  className?: string;
}

export function TerraformBadge({ managed, className }: TerraformBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        managed
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
        className,
      )}
    >
      <svg className="h-3 w-3" viewBox="0 0 128 128" fill="currentColor">
        <path d="M44.5 0v47.4L85 23.7V0L44.5 0zM85 34.7L44.5 58.4v47.4L85 82.2V34.7zM0 47.4v47.4l40.5 23.7V71.1L0 47.4zM87.5 34.7v47.4l40.5-23.7V11L87.5 34.7z" />
      </svg>
      {managed ? "Managed" : "Unmanaged"}
    </span>
  );
}
