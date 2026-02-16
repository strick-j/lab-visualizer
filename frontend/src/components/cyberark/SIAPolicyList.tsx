import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import {
  PageLoading,
  TerraformBadge,
  EmptyState,
  SearchInput,
  Select,
  Button,
} from "@/components/common";
import { ResourceTable } from "@/components/resources";
import { SIAPolicyDetailPanel } from "./SIAPolicyDetailPanel";
import { useCyberArkSIAPolicies } from "@/hooks";
import type { CyberArkSIAPolicy, CyberArkFilters } from "@/types";

const typeOptions = [
  { value: "vm", label: "VM" },
  { value: "database", label: "Database" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const terraformOptions = [
  { value: "true", label: "Managed" },
  { value: "false", label: "Unmanaged" },
];

export function SIAPolicyList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("selected");
  const [filters, setFilters] = useState<CyberArkFilters>({});
  const [searchValue, setSearchValue] = useState("");

  const filtersRef = useRef(filters);
  const setFiltersRef = useRef(setFilters);

  useEffect(() => {
    filtersRef.current = filters;
    setFiltersRef.current = setFilters;
  }, [filters]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filtersRef.current;
      if (searchValue !== (current.search || "")) {
        setFiltersRef.current({
          ...current,
          search: searchValue || undefined,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const syncSearch = useCallback((s: string | undefined) => {
    setSearchValue(s || "");
  }, []);

  useEffect(() => {
    syncSearch(filters.search);
  }, [filters.search, syncSearch]);

  const hasFilters = Object.keys(filters).length > 0;
  const { data, isLoading, error } = useCyberArkSIAPolicies(
    hasFilters ? filters : undefined,
  );

  const handleRowClick = (policy: CyberArkSIAPolicy) => {
    setSearchParams({ selected: policy.policy_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const clearFilters = () => {
    setSearchValue("");
    setFilters({});
  };

  const columns = [
    {
      key: "name",
      header: "Policy Name",
      render: (policy: CyberArkSIAPolicy) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {policy.policy_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {policy.policy_id}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (policy: CyberArkSIAPolicy) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            policy.policy_type === "vm"
              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          }`}
        >
          {policy.policy_type === "vm" ? "VM" : "Database"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (policy: CyberArkSIAPolicy) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            policy.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {policy.status}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (policy: CyberArkSIAPolicy) => (
        <span className="truncate text-gray-700 dark:text-gray-300">
          {policy.description || "-"}
        </span>
      ),
    },
    {
      key: "terraform",
      header: "Terraform",
      render: (policy: CyberArkSIAPolicy) => (
        <TerraformBadge managed={policy.tf_managed} />
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading SIA policies"
        description="There was an error loading the CyberArk SIA policies. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} policies found
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue("")}
            placeholder="Search policies..."
          />
        </div>
        <div className="w-40">
          <Select
            placeholder="All types"
            options={typeOptions}
            value={filters.policy_type || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                policy_type: e.target.value || undefined,
              })
            }
          />
        </div>
        <div className="w-40">
          <Select
            placeholder="All statuses"
            options={statusOptions}
            value={filters.status || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value || undefined,
              })
            }
          />
        </div>
        <div className="w-40">
          <Select
            placeholder="All resources"
            options={terraformOptions}
            value={
              filters.tf_managed === undefined ? "" : String(filters.tf_managed)
            }
            onChange={(e) =>
              setFilters({
                ...filters,
                tf_managed:
                  e.target.value === "" ? undefined : e.target.value === "true",
              })
            }
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      {data?.data.length === 0 ? (
        <EmptyState
          title="No SIA policies found"
          description="No CyberArk SIA policies match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(policy) => policy.policy_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedId && (
        <SIAPolicyDetailPanel
          policyId={selectedId}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
