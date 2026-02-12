import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PageLoading,
  TerraformBadge,
  EmptyState,
  SearchInput,
} from "@/components/common";
import { ResourceTable } from "@/components/resources";
import { RoleDetailPanel } from "./RoleDetailPanel";
import { useCyberArkRoles } from "@/hooks";
import type { CyberArkRole } from "@/types";

export function RoleList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("selected");
  const [search, setSearch] = useState("");

  const filters = search ? { search } : undefined;
  const { data, isLoading, error } = useCyberArkRoles(filters);

  const handleRowClick = (role: CyberArkRole) => {
    setSearchParams({ selected: role.role_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
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

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search roles..."
      />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No roles found"
          description="No CyberArk roles match your current search."
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
