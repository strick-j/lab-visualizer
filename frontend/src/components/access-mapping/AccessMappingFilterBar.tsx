import { Search, X } from "lucide-react";

interface AccessMappingFilters {
  search: string;
  accessType: "" | "standing" | "jit";
  selectedUser: string;
}

interface AccessMappingFilterBarProps {
  filters: AccessMappingFilters;
  onChange: (filters: AccessMappingFilters) => void;
  users: string[];
  isAdmin: boolean;
}

export type { AccessMappingFilters };

export function AccessMappingFilterBar({
  filters,
  onChange,
  users,
  isAdmin,
}: AccessMappingFilterBarProps) {
  const hasFilters =
    filters.search || filters.accessType || filters.selectedUser;

  const clearFilters = () => {
    onChange({ search: "", accessType: "", selectedUser: "" });
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-40 rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* User selector (admin only) */}
      {isAdmin && (
        <select
          value={filters.selectedUser}
          onChange={(e) =>
            onChange({ ...filters, selectedUser: e.target.value })
          }
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          <option value="">All Users</option>
          {users.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
      )}

      {/* Access type selector */}
      <select
        value={filters.accessType}
        onChange={(e) =>
          onChange({
            ...filters,
            accessType: e.target.value as "" | "standing" | "jit",
          })
        }
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
      >
        <option value="">All Access Types</option>
        <option value="standing">Standing</option>
        <option value="jit">JIT</option>
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Clear filters"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
