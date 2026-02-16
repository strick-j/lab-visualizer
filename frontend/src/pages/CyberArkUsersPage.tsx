import { useState, useEffect, useRef, useCallback } from "react";
import { Users, X } from "lucide-react";
import {
  PageLoading,
  SearchInput,
  StatusBadge,
  Select,
  Button,
} from "@/components/common";
import { useCyberArkUsers } from "@/hooks";
import type { CyberArkFilters } from "@/types";

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function CyberArkUsersPage() {
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
  const { data, isLoading } = useCyberArkUsers(
    hasFilters ? filters : undefined,
  );

  const clearFilters = () => {
    setSearchValue("");
    setFilters({});
  };

  if (isLoading && !data) {
    return <PageLoading />;
  }

  const users = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            CyberArk Users
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identity users synced via SCIM ({data?.meta.total ?? 0} total)
          </p>
        </div>
      </div>

      {/* Filters */}
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
            value={filters.active === undefined ? "" : String(filters.active)}
            onChange={(e) =>
              setFilters({
                ...filters,
                active:
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

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Display Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {hasFilters
                    ? "No users match your current filters"
                    : "No users found"}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.user_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.user_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {user.display_name ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {user.email ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <StatusBadge
                      status={user.active ? "active" : "inactive"}
                      size="sm"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
