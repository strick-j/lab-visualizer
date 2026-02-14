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
import { SafeDetailPanel } from "./SafeDetailPanel";
import { useCyberArkSafes } from "@/hooks";
import type { CyberArkSafe, CyberArkFilters } from "@/types";

const terraformOptions = [
  { value: "true", label: "Managed" },
  { value: "false", label: "Unmanaged" },
];

export function SafeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedName = searchParams.get("selected");
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
  const { data, isLoading, error } = useCyberArkSafes(
    hasFilters ? filters : undefined,
  );

  const handleRowClick = (safe: CyberArkSafe) => {
    setSearchParams({ selected: safe.safe_name });
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
      header: "Safe Name",
      render: (safe: CyberArkSafe) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {safe.safe_name}
          </p>
          {safe.description && (
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {safe.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "members",
      header: "Members",
      render: (safe: CyberArkSafe) => (
        <span className="text-gray-700 dark:text-gray-300">
          {safe.number_of_members}
        </span>
      ),
    },
    {
      key: "accounts",
      header: "Accounts",
      render: (safe: CyberArkSafe) => (
        <span className="text-gray-700 dark:text-gray-300">
          {safe.number_of_accounts}
        </span>
      ),
    },
    {
      key: "terraform",
      header: "Terraform",
      render: (safe: CyberArkSafe) => (
        <TerraformBadge managed={safe.tf_managed} />
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading safes"
        description="There was an error loading the CyberArk safes. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} safes found
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue("")}
            placeholder="Search safes..."
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
          title="No safes found"
          description="No CyberArk safes match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(safe) => safe.safe_name}
          onRowClick={handleRowClick}
        />
      )}

      {selectedName && (
        <SafeDetailPanel safeName={selectedName} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
