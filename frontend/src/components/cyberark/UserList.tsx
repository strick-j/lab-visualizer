import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import {
  PageLoading,
  EmptyState,
  SearchInput,
  StatusBadge,
  Select,
  Button,
} from "@/components/common";
import { ResourceTable } from "@/components/resources";
import { useCyberArkUsers } from "@/hooks";
import type { CyberArkIdentityUser, CyberArkFilters } from "@/types";

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function UserList() {
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
  const { data, isLoading, error } = useCyberArkUsers(
    hasFilters ? filters : undefined,
  );

  const clearFilters = () => {
    setSearchValue("");
    setFilters({});
  };

  const columns = [
    {
      key: "username",
      header: "Username",
      render: (user: CyberArkIdentityUser) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {user.user_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user.user_id}
          </p>
        </div>
      ),
    },
    {
      key: "display_name",
      header: "Display Name",
      render: (user: CyberArkIdentityUser) => (
        <span className="text-gray-700 dark:text-gray-300">
          {user.display_name ?? "-"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (user: CyberArkIdentityUser) => (
        <span className="text-gray-700 dark:text-gray-300">
          {user.email ?? "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user: CyberArkIdentityUser) => (
        <StatusBadge status={user.active ? "active" : "inactive"} size="sm" />
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading users"
        description="There was an error loading the CyberArk users. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} users found
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue("")}
            placeholder="Search users..."
          />
        </div>
        <div className="w-40">
          <Select
            placeholder="All statuses"
            options={statusOptions}
            value={
              filters.active === undefined ? "" : String(filters.active)
            }
            onChange={(e) =>
              setFilters({
                ...filters,
                active:
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
          title="No users found"
          description="No CyberArk users match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(user) => user.user_id}
        />
      )}
    </div>
  );
}
