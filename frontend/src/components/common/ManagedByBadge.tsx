import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ManagedByType = "terraform" | "github_actions" | "unmanaged";

interface ManagedByBadgeProps {
  managedBy: ManagedByType;
  className?: string;
}

const CONFIG: Record<
  ManagedByType,
  {
    label: string;
    colors: string;
    darkColors: string;
    icon: "terraform" | "github" | "help";
  }
> = {
  terraform: {
    label: "Terraform",
    colors: "bg-purple-100 text-purple-700 border-purple-200",
    darkColors:
      "dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    icon: "terraform",
  },
  github_actions: {
    label: "GitHub Actions",
    colors: "bg-green-100 text-green-700 border-green-200",
    darkColors:
      "dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    icon: "github",
  },
  unmanaged: {
    label: "Unmanaged",
    colors: "bg-gray-100 text-gray-500 border-gray-200",
    darkColors: "dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600",
    icon: "help",
  },
};

function TerraformIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="currentColor">
      <path d="M44.5 0v47.4L85 23.7V0L44.5 0zM85 34.7L44.5 58.4v47.4L85 82.2V34.7zM0 47.4v47.4l40.5 23.7V71.1L0 47.4zM87.5 34.7v47.4l40.5-23.7V11L87.5 34.7z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function ManagedByBadge({ managedBy, className }: ManagedByBadgeProps) {
  const config = CONFIG[managedBy];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.colors,
        config.darkColors,
        className,
      )}
    >
      {config.icon === "terraform" && <TerraformIcon className="h-3 w-3" />}
      {config.icon === "github" && <GitHubIcon className="h-3 w-3" />}
      {config.icon === "help" && <HelpCircle className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
