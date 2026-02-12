import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  Lock,
  Key,
  Zap,
  Server,
  Database,
} from "lucide-react";
interface AccessMappingLegendProps {
  stats: {
    total_users: number;
    total_targets: number;
    total_standing_paths: number;
    total_jit_paths: number;
  } | null;
}

export function AccessMappingLegend({ stats }: AccessMappingLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {stats.total_users}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {stats.total_targets}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Targets</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {stats.total_standing_paths}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Standing</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {stats.total_jit_paths}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">JIT</p>
          </div>
        </div>
      )}

      {/* Legend toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Legend
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 px-3 pb-3">
          {/* Node types */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
              Nodes
            </p>
            <LegendItem
              icon={<User className="h-3.5 w-3.5 text-blue-600" />}
              label="User"
              color="bg-blue-100"
            />
            <LegendItem
              icon={<ShieldCheck className="h-3.5 w-3.5 text-purple-600" />}
              label="Role"
              color="bg-purple-100"
            />
            <LegendItem
              icon={<Lock className="h-3.5 w-3.5 text-amber-600" />}
              label="Safe"
              color="bg-amber-100"
            />
            <LegendItem
              icon={<Key className="h-3.5 w-3.5 text-gray-600" />}
              label="Account"
              color="bg-gray-100"
            />
            <LegendItem
              icon={<Zap className="h-3.5 w-3.5 text-orange-600" />}
              label="SIA Policy"
              color="bg-orange-100"
            />
            <LegendItem
              icon={<Server className="h-3.5 w-3.5 text-orange-600" />}
              label="EC2 Target"
              color="bg-orange-100"
            />
            <LegendItem
              icon={<Database className="h-3.5 w-3.5 text-blue-600" />}
              label="RDS Target"
              color="bg-blue-100"
            />
          </div>

          {/* Edge types */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
              Connections
            </p>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Standing Access
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-0.5 w-6 bg-orange-500"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #f97316 0, #f97316 4px, transparent 4px, transparent 8px)",
                  backgroundSize: "8px 2px",
                  backgroundColor: "transparent",
                }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                JIT Access
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded p-1 ${color} dark:opacity-80`}>{icon}</div>
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}
