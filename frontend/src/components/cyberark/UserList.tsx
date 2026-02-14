import { useState } from "react";
import {
  PageLoading,
  EmptyState,
  SearchInput,
  StatusBadge,
} from "@/components/common";
import { ResourceTable } from "@/components/resources";
import { useCyberArkUsers } from "@/hooks";
import type { CyberArkIdentityUser } from "@/types";

export function UserList() {
  const [search, setSearch] = useState("");

  const filters = search ? { search } : undefined;
  const { data, isLoading, error } = useCyberArkUsers(filters);

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

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search users..."
      />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No CyberArk users match your current search."
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
