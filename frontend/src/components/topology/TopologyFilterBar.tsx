import { Search, X, Filter } from "lucide-react";
import type { TopologyFilters, TopologyVPC } from "@/types/topology";
import { hasActiveFilters } from "./utils/topologyFilter";

interface TopologyFilterBarProps {
  filters: TopologyFilters;
  onChange: (filters: TopologyFilters) => void;
  vpcs: TopologyVPC[];
}

export function TopologyFilterBar({
  filters,
  onChange,
  vpcs,
}: TopologyFilterBarProps) {
  const activeCount = [
    filters.search,
    filters.vpcId,
    filters.subnetType,
    filters.status,
  ].filter(Boolean).length;

  const update = (partial: Partial<TopologyFilters>) =>
    onChange({ ...filters, ...partial });

  const clearAll = () =>
    onChange({ search: "", vpcId: "", subnetType: "", status: "" });

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search resources..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="h-8 w-48 rounded-md border border-gray-300 bg-white pl-8 pr-7 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* VPC select */}
      {vpcs.length > 1 && (
        <select
          value={filters.vpcId}
          onChange={(e) => update({ vpcId: e.target.value })}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All VPCs</option>
          {vpcs.map((vpc) => (
            <option key={vpc.id} value={vpc.id}>
              {vpc.name || vpc.id}
            </option>
          ))}
        </select>
      )}

      {/* Subnet type select */}
      <select
        value={filters.subnetType}
        onChange={(e) =>
          update({
            subnetType: e.target.value as TopologyFilters["subnetType"],
          })
        }
        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="">All Subnets</option>
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>

      {/* Status select */}
      <select
        value={filters.status}
        onChange={(e) =>
          update({ status: e.target.value as TopologyFilters["status"] })
        }
        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="transitioning">Transitioning</option>
        <option value="error">Error</option>
      </select>

      {/* Clear all */}
      {hasActiveFilters(filters) && (
        <button
          onClick={clearAll}
          className="flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Clear ({activeCount})</span>
        </button>
      )}
    </div>
  );
}
