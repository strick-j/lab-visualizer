import { Shield, Database, Users, Lock } from "lucide-react";

export type SettingsTabType =
  | "authentication"
  | "s3-buckets"
  | "user-management"
  | "cyberark";

interface Tab {
  key: SettingsTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { key: "authentication", label: "Authentication", icon: Shield },
  { key: "user-management", label: "User Management", icon: Users },
  { key: "s3-buckets", label: "S3 Buckets", icon: Database },
  { key: "cyberark", label: "CyberArk", icon: Lock },
];

interface SettingsTabNavigationProps {
  activeTab: SettingsTabType;
  onTabChange: (tab: SettingsTabType) => void;
}

export function SettingsTabNavigation({
  activeTab,
  onTabChange,
}: SettingsTabNavigationProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                transition-colors
                ${
                  isActive
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }
              `}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
