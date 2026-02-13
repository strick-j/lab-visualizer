import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PageLoading,
  TerraformBadge,
  EmptyState,
  SearchInput,
} from "@/components/common";
import { ResourceTable } from "@/components/resources";
import { SIAPolicyDetailPanel } from "./SIAPolicyDetailPanel";
import { useCyberArkSIAPolicies } from "@/hooks";
import type { CyberArkSIAPolicy } from "@/types";

export function SIAPolicyList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("selected");
  const [search, setSearch] = useState("");
  const [policyType, setPolicyType] = useState("");

  const filters = {
    ...(search ? { search } : {}),
    ...(policyType ? { policy_type: policyType } : {}),
  };
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

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search policies..."
          />
        </div>
        <select
          value={policyType}
          onChange={(e) => setPolicyType(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          <option value="">All Types</option>
          <option value="vm">VM</option>
          <option value="database">Database</option>
        </select>
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
