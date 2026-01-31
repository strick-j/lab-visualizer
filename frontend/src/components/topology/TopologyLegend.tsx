import { useState } from "react";
import {
  Network,
  Boxes,
  Server,
  Database,
  Globe,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopologyStats {
  total_vpcs: number;
  total_subnets: number;
  total_ec2: number;
  total_rds: number;
}

interface TopologyLegendProps {
  stats?: TopologyStats;
}

const legendItems = [
  {
    icon: Network,
    label: "VPC",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/50",
  },
  {
    icon: Boxes,
    label: "Subnet",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-700",
  },
  {
    icon: Server,
    label: "EC2 Instance",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/50",
  },
  {
    icon: Database,
    label: "RDS Database",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/50",
  },
  {
    icon: Globe,
    label: "Internet Gateway",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-900/50",
  },
  {
    icon: ArrowUpDown,
    label: "NAT Gateway",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-900/50",
  },
];

const statusItems = [
  { label: "Active", color: "bg-green-500" },
  { label: "Inactive", color: "bg-gray-400" },
  { label: "Transitioning", color: "bg-yellow-500" },
  { label: "Error", color: "bg-red-500" },
];

const subnetTypes = [
  {
    label: "Public",
    color: "border-green-400 bg-green-50 dark:bg-green-950/20",
  },
  { label: "Private", color: "border-blue-400 bg-blue-50 dark:bg-blue-950/20" },
];

export function TopologyLegend({ stats }: TopologyLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden min-w-[200px]">
      {/* Stats - always visible */}
      {stats && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">VPCs:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {stats.total_vpcs}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Subnets:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {stats.total_subnets}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">EC2:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {stats.total_ec2}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">RDS:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {stats.total_rds}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend header - collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Legend
        </h3>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Collapsible legend content */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isExpanded
            ? "max-h-96 opacity-100"
            : "max-h-0 opacity-0 overflow-hidden",
        )}
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Resource Types */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Resources
            </p>
            <div className="grid grid-cols-2 gap-2">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`p-1 rounded ${item.bg}`}>
                    <item.icon className={`h-3 w-3 ${item.color}`} />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Status
            </p>
            <div className="flex flex-wrap gap-3">
              {statusItems.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subnet Types */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Subnet Types
            </p>
            <div className="flex gap-3">
              {subnetTypes.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-4 h-3 rounded border-2 ${item.color}`} />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Terraform Badge */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
                TF
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Terraform Managed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
