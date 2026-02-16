import { useState, useRef, useEffect } from "react";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import type { TopologyFilters, TopologyVPC } from "@/types/topology";
import { hasActiveFilters } from "./utils/topologyFilter";

interface TopologyFilterBarProps {
  filters: TopologyFilters;
  onChange: (filters: TopologyFilters) => void;
  vpcs: TopologyVPC[];
}

const RESOURCE_TYPE_OPTIONS = [
  { value: "ec2", label: "EC2" },
  { value: "rds", label: "RDS" },
  { value: "ecs", label: "ECS" },
  { value: "igw", label: "IGW" },
  { value: "nat", label: "NAT GW" },
  { value: "eip", label: "EIP" },
];

function ResourceTypeDropdown({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (types: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const label =
    selected.length === 0
      ? "All Types"
      : selected.length <= 2
        ? selected
            .map((s) => RESOURCE_TYPE_OPTIONS.find((o) => o.value === s)?.label)
            .join(", ")
        : `${selected.length} types`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 z-20">
          {RESOURCE_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-200">
                {opt.label}
              </span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full border-t border-gray-100 px-3 py-1.5 text-left text-xs text-blue-600 hover:bg-gray-50 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-gray-700"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TopologyFilterBar({
  filters,
  onChange,
  vpcs,
}: TopologyFilterBarProps) {
  const activeCount =
    [
      filters.search,
      filters.vpcId,
      filters.subnetType,
      filters.status,
      filters.tfManaged,
    ].filter(Boolean).length + (filters.resourceTypes.length > 0 ? 1 : 0);

  const update = (partial: Partial<TopologyFilters>) =>
    onChange({ ...filters, ...partial });

  const clearAll = () =>
    onChange({
      search: "",
      vpcId: "",
      subnetType: "",
      status: "",
      tfManaged: "",
      resourceTypes: [],
    });

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 flex-wrap">
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

      {/* Management status select */}
      <select
        value={filters.tfManaged}
        onChange={(e) =>
          update({ tfManaged: e.target.value as TopologyFilters["tfManaged"] })
        }
        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="">All Management</option>
        <option value="true">Terraform Managed</option>
        <option value="false">Unmanaged</option>
      </select>

      {/* Resource type multi-select */}
      <ResourceTypeDropdown
        selected={filters.resourceTypes}
        onChange={(types) => update({ resourceTypes: types })}
      />

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
