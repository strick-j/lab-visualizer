import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PageLoading,
  TerraformBadge,
  EmptyState,
  SearchInput,
} from "@/components/common";
import { ResourceTable } from "@/components/resources";
import { SafeDetailPanel } from "./SafeDetailPanel";
import { useCyberArkSafes } from "@/hooks";
import type { CyberArkSafe } from "@/types";

export function SafeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedName = searchParams.get("selected");
  const [search, setSearch] = useState("");

  const filters = search ? { search } : undefined;
  const { data, isLoading, error } = useCyberArkSafes(filters);

  const handleRowClick = (safe: CyberArkSafe) => {
    setSearchParams({ selected: safe.safe_name });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
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
      key: "cpm",
      header: "Managing CPM",
      render: (safe: CyberArkSafe) => (
        <span className="text-gray-700 dark:text-gray-300">
          {safe.managing_cpm || "-"}
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

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search safes..."
      />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No safes found"
          description="No CyberArk safes match your current search."
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
