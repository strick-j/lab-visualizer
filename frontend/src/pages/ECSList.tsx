import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Container } from "lucide-react";
import {
  PageLoading,
  StatusBadge,
  TerraformBadge,
  EmptyState,
} from "@/components/common";
import { ResourceTable, ResourceFilters } from "@/components/resources";
import { ECSDetailPanel } from "@/components/resources/ECSDetailPanel";
import { useECSClusters } from "@/hooks";
import { getResourceName, formatRelativeTime } from "@/lib/utils";
import type { ResourceFilters as Filters, ECSCluster } from "@/types";

export function ECSListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({});

  const selectedArn = searchParams.get("selected");

  const { data, isLoading, error } = useECSClusters(filters);

  const selectedCluster = useMemo(() => {
    if (!selectedArn || !data?.data) return null;
    return data.data.find((c) => c.cluster_arn === selectedArn) || null;
  }, [selectedArn, data?.data]);

  const handleRowClick = (cluster: ECSCluster) => {
    setSearchParams({ selected: cluster.cluster_arn });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: "name",
      header: "Cluster",
      render: (cluster: ECSCluster) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(cluster.name, cluster.cluster_name)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {cluster.cluster_name}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (cluster: ECSCluster) => (
        <StatusBadge status={cluster.display_status} size="sm" />
      ),
    },
    {
      key: "services",
      header: "Services",
      render: (cluster: ECSCluster) => (
        <span className="text-gray-700 dark:text-gray-300">
          {cluster.active_services_count}
        </span>
      ),
    },
    {
      key: "tasks",
      header: "Running Tasks",
      render: (cluster: ECSCluster) => (
        <div className="text-gray-700 dark:text-gray-300">
          <span>{cluster.running_tasks_count}</span>
          {cluster.pending_tasks_count > 0 && (
            <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">
              (+{cluster.pending_tasks_count} pending)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "region",
      header: "Region",
      render: (cluster: ECSCluster) => (
        <span className="text-gray-700 dark:text-gray-300">
          {cluster.region_name || "-"}
        </span>
      ),
    },
    {
      key: "terraform",
      header: "Terraform",
      render: (cluster: ECSCluster) => (
        <TerraformBadge managed={cluster.tf_managed} />
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (cluster: ECSCluster) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatRelativeTime(cluster.updated_at)}
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
        title="Error loading ECS clusters"
        description="Failed to fetch ECS clusters. Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <Container className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ECS Clusters
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Amazon Elastic Container Service clusters and services
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {data?.meta.total || 0} clusters found
      </p>

      <ResourceFilters filters={filters} onFilterChange={setFilters} />

      {data?.data.length === 0 ? (
        <EmptyState
          icon={<Container className="h-8 w-8" />}
          title="No ECS clusters found"
          description={
            Object.keys(filters).length > 0
              ? "Try adjusting your filters"
              : "No ECS clusters are available in your account"
          }
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(cluster) => cluster.cluster_arn}
          onRowClick={handleRowClick}
        />
      )}

      {selectedCluster && (
        <ECSDetailPanel cluster={selectedCluster} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
