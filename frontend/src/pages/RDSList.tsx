import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Database } from "lucide-react";
import {
  PageLoading,
  StatusBadge,
  TerraformBadge,
  EmptyState,
  RefreshButton,
} from "@/components/common";
import {
  ResourceTable,
  ResourceFilters,
  RDSDetailPanel,
} from "@/components/resources";
import { useRDSInstances } from "@/hooks";
import { getResourceName, formatRelativeTime } from "@/lib/utils";
import type { ResourceFilters as Filters, RDSInstance } from "@/types";

export function RDSListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({});

  const selectedId = searchParams.get("selected");

  const { data, isLoading, error } = useRDSInstances(filters);

  const selectedInstance = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return (
      data.data.find((i) => i.db_instance_identifier === selectedId) || null
    );
  }, [selectedId, data?.data]);

  const handleRowClick = (instance: RDSInstance) => {
    setSearchParams({ selected: instance.db_instance_identifier });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (instance: RDSInstance) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(instance.name, instance.db_instance_identifier)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {instance.db_instance_identifier}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (instance: RDSInstance) => (
        <StatusBadge status={instance.display_status} size="sm" />
      ),
    },
    {
      key: "engine",
      header: "Engine",
      render: (instance: RDSInstance) => (
        <div>
          <p className="text-gray-700 dark:text-gray-300">{instance.engine}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {instance.engine_version}
          </p>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (instance: RDSInstance) => (
        <span className="text-gray-700 dark:text-gray-300">
          {instance.db_instance_class}
        </span>
      ),
    },
    {
      key: "storage",
      header: "Storage",
      render: (instance: RDSInstance) => (
        <span className="text-gray-700 dark:text-gray-300">
          {instance.allocated_storage} GB
        </span>
      ),
    },
    {
      key: "multiaz",
      header: "Multi-AZ",
      render: (instance: RDSInstance) => (
        <span
          className={
            instance.multi_az
              ? "text-green-600 dark:text-green-400"
              : "text-gray-400 dark:text-gray-500"
          }
        >
          {instance.multi_az ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "terraform",
      header: "Terraform",
      render: (instance: RDSInstance) => (
        <TerraformBadge managed={instance.tf_managed} />
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (instance: RDSInstance) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatRelativeTime(instance.updated_at)}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<Database className="h-8 w-8" />}
        title="Error loading RDS instances"
        description="Failed to fetch RDS instances. Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
            <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              RDS Databases
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Amazon Relational Database Service instances
            </p>
          </div>
        </div>
        <RefreshButton size="md" />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {data?.total || 0} databases found
      </p>

      <ResourceFilters filters={filters} onFilterChange={setFilters} />

      {data?.data.length === 0 ? (
        <EmptyState
          icon={<Database className="h-8 w-8" />}
          title="No RDS databases found"
          description={
            Object.keys(filters).length > 0
              ? "Try adjusting your filters"
              : "No RDS databases are available in your account"
          }
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(instance) => instance.db_instance_identifier}
          onRowClick={handleRowClick}
        />
      )}

      {selectedInstance && (
        <RDSDetailPanel
          instance={selectedInstance}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
