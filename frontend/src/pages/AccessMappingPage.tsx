import { useState, useCallback, useMemo } from "react";
import { AlertCircle, RefreshCw, Map } from "lucide-react";
import {
  useAccessMapping,
  useAccessMappingUsers,
  useRefreshData,
} from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { AccessMappingCanvas } from "@/components/access-mapping/AccessMappingCanvas";
import { AccessMappingDetailPanel } from "@/components/access-mapping/AccessMappingDetailPanel";
import {
  AccessMappingFilterBar,
  type AccessMappingFilters,
} from "@/components/access-mapping/AccessMappingFilterBar";
import { AccessMappingLegend } from "@/components/access-mapping/AccessMappingLegend";
import { Loading } from "@/components/common";

const EMPTY_FILTERS: AccessMappingFilters = {
  search: "",
  accessType: "",
  selectedUser: "",
};

interface SelectedNode {
  nodeType: string;
  nodeData: Record<string, unknown>;
}

export function AccessMappingPage() {
  const { user: authUser } = useAuth();
  const [filters, setFilters] = useState<AccessMappingFilters>(EMPTY_FILTERS);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const handleNodeClick = useCallback(
    (_nodeId: string, nodeType: string, nodeData: Record<string, unknown>) => {
      setSelectedNode({ nodeType, nodeData });
    },
    [],
  );

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Fetch data - pass user filter to API if selected
  const apiParams = filters.selectedUser
    ? { user: filters.selectedUser }
    : undefined;
  const { data, isLoading, isError, error, refetch } =
    useAccessMapping(apiParams);
  const { data: usersData } = useAccessMappingUsers();
  const refreshMutation = useRefreshData();

  const canvasFilters = useMemo(
    () => ({
      accessType: filters.accessType || undefined,
      selectedUser: filters.selectedUser || undefined,
    }),
    [filters.accessType, filters.selectedUser],
  );

  const handleRefresh = async () => {
    await refreshMutation.mutateAsync(false);
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Loading text="Loading access mapping data..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Failed to load access mapping
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.users.length === 0) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] flex-col items-center justify-center gap-4">
        <Map className="h-16 w-16 text-gray-300 dark:text-gray-600" />
        <div className="max-w-md text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No access mapping data found
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Configure CyberArk integration in Settings and refresh data to see
            user access mappings. Make sure CyberArk safes, roles, and accounts
            are synced.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col overflow-hidden">
      <div className="relative flex-1 bg-gray-50 dark:bg-gray-900">
        <AccessMappingCanvas
          data={data}
          filters={canvasFilters}
          onNodeClick={handleNodeClick}
        />
        <AccessMappingFilterBar
          filters={filters}
          onChange={setFilters}
          users={usersData?.users || []}
          isAdmin={authUser?.is_admin ?? false}
        />
        <AccessMappingLegend
          stats={{
            total_users: data.total_users,
            total_targets: data.total_targets,
            total_standing_paths: data.total_standing_paths,
            total_jit_paths: data.total_jit_paths,
          }}
        />
        {selectedNode && (
          <AccessMappingDetailPanel
            selectedNode={selectedNode}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
}
