import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Container,
  ChevronDown,
  ChevronRight,
  Server,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageLoading,
  StatusBadge,
  ManagedByBadge,
  EmptyState,
  SearchInput,
  RefreshButton,
} from "@/components/common";
import { ECSDetailPanel } from "@/components/resources";
import { useECSClusters } from "@/hooks";
import { getResourceName, formatRelativeTime, cn } from "@/lib/utils";
import type { ECSContainer, ECSClusterSummary } from "@/types";

function ContainerRow({
  container,
  onSelect,
}: {
  container: ECSContainer;
  onSelect: (container: ECSContainer) => void;
}) {
  const formatMemory = (mb: number) =>
    mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  return (
    <button
      onClick={() => onSelect(container)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700/50"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <StatusBadge status={container.display_status} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(container.name, container.task_id)}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {container.task_id}
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        {container.image && (
          <span className="hidden max-w-[200px] truncate text-xs text-gray-400 dark:text-gray-500 md:inline">
            {container.image.split("/").pop()}
          </span>
        )}
        <span className="whitespace-nowrap rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {container.launch_type}
        </span>
        <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
          {container.cpu} CPU / {formatMemory(container.memory)}
        </span>
        <ManagedByBadge managedBy={container.managed_by} />
        <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
          {formatRelativeTime(container.updated_at)}
        </span>
      </div>
    </button>
  );
}

function ClusterGroupCard({
  cluster,
  expanded,
  onToggle,
  onSelectContainer,
}: {
  cluster: ECSClusterSummary;
  expanded: boolean;
  onToggle: () => void;
  onSelectContainer: (container: ECSContainer) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
          <Server className="h-4 w-4 flex-shrink-0 text-teal-500" />
          <div>
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
              {cluster.cluster_name}
            </span>
            {cluster.region_name && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                ({cluster.region_name})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cluster.running_tasks > 0 && (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle className="h-3 w-3" />
              {cluster.running_tasks} running
            </span>
          )}
          {cluster.stopped_tasks > 0 && (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <XCircle className="h-3 w-3" />
              {cluster.stopped_tasks} stopped
            </span>
          )}
          {cluster.pending_tasks > 0 && (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              <Clock className="h-3 w-3" />
              {cluster.pending_tasks} pending
            </span>
          )}
          <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
            {cluster.total_tasks} task{cluster.total_tasks !== 1 ? "s" : ""}
          </span>
          <ManagedByBadge managedBy={cluster.managed_by} />
        </div>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700">
          {cluster.containers.map((container) => (
            <ContainerRow
              key={container.task_id}
              container={container}
              onSelect={onSelectContainer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ECSListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set(),
  );

  // Debounce search input - only update query after user stops typing
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchRef.current) {
        setSearch(searchValue);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Sync external resets back to local state
  const syncSearch = useCallback((val: string) => {
    setSearchValue(val);
  }, []);

  useEffect(() => {
    syncSearch(search);
  }, [search, syncSearch]);

  const selectedId = searchParams.get("selected");

  const { data, isLoading, error } = useECSClusters(
    search ? { search } : undefined,
  );

  const clusters = useMemo(() => data?.data ?? [], [data?.data]);

  const totalTasks = useMemo(
    () => clusters.reduce((sum, c) => sum + c.total_tasks, 0),
    [clusters],
  );

  const totalRunning = useMemo(
    () => clusters.reduce((sum, c) => sum + c.running_tasks, 0),
    [clusters],
  );

  const totalStopped = useMemo(
    () => clusters.reduce((sum, c) => sum + c.stopped_tasks, 0),
    [clusters],
  );

  const selectedContainer = useMemo(() => {
    if (!selectedId || !clusters.length) return null;
    for (const cluster of clusters) {
      const found = cluster.containers.find((c) => c.task_id === selectedId);
      if (found) return found;
    }
    return null;
  }, [selectedId, clusters]);

  const toggleCluster = (clusterName: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterName)) {
        next.delete(clusterName);
      } else {
        next.add(clusterName);
      }
      return next;
    });
  };

  const handleSelectContainer = (container: ECSContainer) => {
    setSearchParams({ selected: container.task_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<Container className="h-8 w-8" />}
        title="Error loading ECS clusters"
        description="Failed to fetch ECS cluster information. Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
            <Container className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ECS Containers
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Amazon Elastic Container Service clusters and tasks
            </p>
          </div>
        </div>
        <RefreshButton size="md" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900/50">
              <Server className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Clusters
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {clusters.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/50">
              <Container className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Tasks
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalTasks}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/50">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Running
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalRunning}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div
              className={cn(
                "rounded-lg p-3",
                totalStopped > 0
                  ? "bg-gray-100 dark:bg-gray-700"
                  : "bg-green-100 dark:bg-green-900/50",
              )}
            >
              <XCircle
                className={cn(
                  "h-6 w-6",
                  totalStopped > 0
                    ? "text-gray-600 dark:text-gray-400"
                    : "text-green-600 dark:text-green-400",
                )}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stopped
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalStopped}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cluster list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clusters</CardTitle>
            <div className="w-64">
              <SearchInput
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onClear={() => {
                  setSearchValue("");
                  setSearch("");
                }}
                placeholder="Search clusters..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <EmptyState
              icon={<Container className="h-8 w-8" />}
              title="No ECS clusters found"
              description={
                searchValue
                  ? "Try adjusting your search"
                  : "No ECS clusters are available in your account"
              }
            />
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster) => (
                <ClusterGroupCard
                  key={cluster.cluster_name}
                  cluster={cluster}
                  expanded={expandedClusters.has(cluster.cluster_name)}
                  onToggle={() => toggleCluster(cluster.cluster_name)}
                  onSelectContainer={handleSelectContainer}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedContainer && (
        <ECSDetailPanel
          container={selectedContainer}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
