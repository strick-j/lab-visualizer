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
import { RoleDetailPanel } from "./RoleDetailPanel";
import { useCyberArkRoles } from "@/hooks";
import type { CyberArkRole, CyberArkFilters } from "@/types";

const terraformOptions = [
  { value: "true", label: "Managed" },
  { value: "false", label: "Unmanaged" },
];

export function RoleList() {
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
  const { data, isLoading, error } = useCyberArkRoles(
    hasFilters ? filters : undefined,
  );

  const handleRowClick = (role: CyberArkRole) => {
    setSearchParams({ selected: role.role_id });
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
      header: "Role Name",
      render: (role: CyberArkRole) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {role.role_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {role.role_id}
          </p>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (role: CyberArkRole) => (
        <span className="truncate text-gray-700 dark:text-gray-300">
          {role.description || "-"}
        </span>
      ),
    },
    {
      key: "terraform",
      header: "Terraform",
      render: (role: CyberArkRole) => (
        <TerraformBadge managed={role.tf_managed} />
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading roles"
        description="There was an error loading the CyberArk roles. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} roles found
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue("")}
            placeholder="Search roles..."
          />
        </div>
        <div className="w-40">
          <Select
            placeholder="All resources"
            options={terraformOptions}
            value={
              filters.tf_managed === undefined
                ? ""
                : String(filters.tf_managed)
            }
            onChange={(e) =>
              setFilters({
                ...filters,
                tf_managed:
                  e.target.value === ""
                    ? undefined
                    : e.target.value === "true",
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
          title="No roles found"
          description="No CyberArk roles match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(role) => role.role_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedId && (
        <RoleDetailPanel roleId={selectedId} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
