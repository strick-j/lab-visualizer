import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Container } from "lucide-react";
import {
  PageLoading,
  StatusBadge,
  TerraformBadge,
  EmptyState,
} from "@/components/common";
import {
  ResourceTable,
  ResourceFilters,
  ECSDetailPanel,
} from "@/components/resources";
import { useECSContainers } from "@/hooks";
import { getResourceName, formatRelativeTime } from "@/lib/utils";
import type { ResourceFilters as Filters, ECSContainer } from "@/types";

export function ECSListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({});

  const selectedId = searchParams.get("selected");

  const { data, isLoading, error } = useECSContainers(filters);

  const selectedContainer = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return data.data.find((c) => c.task_id === selectedId) || null;
  }, [selectedId, data?.data]);

  const handleRowClick = (container: ECSContainer) => {
    setSearchParams({ selected: container.task_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const formatMemory = (mb: number) =>
    mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (container: ECSContainer) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(container.name, container.task_id)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {container.task_id}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (container: ECSContainer) => (
        <StatusBadge status={container.display_status} size="sm" />
      ),
    },
    {
      key: "cluster",
      header: "Cluster",
      render: (container: ECSContainer) => (
        <span className="text-gray-700 dark:text-gray-300">
          {container.cluster_name}
        </span>
      ),
    },
    {
      key: "launch_type",
      header: "Launch Type",
      render: (container: ECSContainer) => (
        <span className="text-gray-700 dark:text-gray-300">
          {container.launch_type}
        </span>
      ),
    },
    {
      key: "resources",
      header: "CPU / Memory",
      render: (container: ECSContainer) => (
        <span className="text-gray-700 dark:text-gray-300">
          {container.cpu} / {formatMemory(container.memory)}
        </span>
      ),
    },
    {
      key: "ip",
      header: "Private IP",
      render: (container: ECSContainer) => (
        <span className="text-gray-700 dark:text-gray-300">
          {container.private_ip || "-"}
        </span>
      ),
    },
    {
      key: "terraform",
      header: "Terraform",
      render: (container: ECSContainer) => (
        <TerraformBadge managed={container.tf_managed} />
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (container: ECSContainer) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatRelativeTime(container.updated_at)}
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
        icon={<Container className="h-8 w-8" />}
        title="Error loading ECS containers"
        description="Failed to fetch ECS containers. Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
          <Container className="h-6 w-6 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ECS Containers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Amazon Elastic Container Service tasks
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {data?.meta.total || 0} containers found
      </p>

      <ResourceFilters filters={filters} onFilterChange={setFilters} />

      {data?.data.length === 0 ? (
        <EmptyState
          icon={<Container className="h-8 w-8" />}
          title="No ECS containers found"
          description={
            Object.keys(filters).length > 0
              ? "Try adjusting your filters"
              : "No ECS containers are available in your account"
          }
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(container) => container.task_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedContainer && (
        <ECSDetailPanel
          container={selectedContainer}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
