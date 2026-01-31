import { useCallback } from "react";
import { AlertCircle, RefreshCw, Waypoints } from "lucide-react";
import { useTopology, useRefreshData } from "@/hooks/useResources";
import { TopologyCanvas } from "./TopologyCanvas";
import { TopologyLegend } from "./TopologyLegend";
import { Loading } from "@/components/common";
import type { TopologyNodeData } from "@/types/topology";

interface InfrastructureTopologyProps {
  vpcId?: string;
  onResourceSelect?: (nodeData: TopologyNodeData) => void;
}

export function InfrastructureTopology({
  vpcId,
  onResourceSelect,
}: InfrastructureTopologyProps) {
  const { data, isLoading, isError, error, refetch } = useTopology(
    vpcId ? { vpc_id: vpcId } : undefined,
  );
  const refreshMutation = useRefreshData();

  const handleRefresh = useCallback(async () => {
    await refreshMutation.mutateAsync(false);
    await refetch();
  }, [refreshMutation, refetch]);

  const handleNodeClick = useCallback(
    (_nodeId: string, _nodeType: string, nodeData: TopologyNodeData) => {
      onResourceSelect?.(nodeData);
    },
    [onResourceSelect],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading text="Loading infrastructure topology..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Failed to load topology
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.vpcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Waypoints className="h-16 w-16 text-gray-300 dark:text-gray-600" />
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No Terraform-managed infrastructure found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This visualization only shows resources that are managed by
            Terraform. Make sure your Terraform state files are configured and
            resources have been refreshed.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
          />
          {refreshMutation.isPending ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <TopologyCanvas data={data} onNodeClick={handleNodeClick} />
      <TopologyLegend stats={data.meta} />
    </div>
  );
}
