import { useState, useMemo } from "react";
import {
  GitBranch,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageLoading,
  EmptyState,
  Button,
} from "@/components/common";
import { useTerraformStates, useDrift } from "@/hooks";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { TerraformStateInfo, DriftItem } from "@/types";

interface BucketGroup {
  bucketName: string;
  region: string | null;
  states: TerraformStateInfo[];
  totalResources: number;
}

function StateFileRow({ state }: { state: TerraformStateInfo }) {
  const statusColors = {
    synced:
      "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30",
    error: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30",
    unknown: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-700",
  };

  const statusIcons = {
    synced: <CheckCircle className="h-3.5 w-3.5" />,
    error: <XCircle className="h-3.5 w-3.5" />,
    unknown: <FileText className="h-3.5 w-3.5" />,
  };

  const statusConfig =
    statusColors[state.status as keyof typeof statusColors] ||
    statusColors.unknown;
  const StatusIcon =
    statusIcons[state.status as keyof typeof statusIcons] ||
    statusIcons.unknown;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className={cn("flex-shrink-0 rounded p-1", statusConfig)}>
          {StatusIcon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {state.name}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {state.key}
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <span className="whitespace-nowrap rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          {state.resource_count} resources
        </span>
        {(state.skipped_resource_count ?? 0) > 0 && (
          <span
            className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            title={
              state.all_resource_types
                ? `Unrecognized types: ${Object.keys(state.all_resource_types).join(", ")}`
                : undefined
            }
          >
            {state.skipped_resource_count} skipped
          </span>
        )}
        <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
          {formatRelativeTime(state.last_modified)}
        </span>
      </div>
    </div>
  );
}

function BucketGroupCard({
  group,
  expanded,
  onToggle,
}: {
  group: BucketGroup;
  expanded: boolean;
  onToggle: () => void;
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
          <Database className="h-4 w-4 flex-shrink-0 text-purple-500" />
          <div>
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
              {group.bucketName}
            </span>
            {group.region && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                ({group.region})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {group.states.length} state file
            {group.states.length !== 1 ? "s" : ""}
          </span>
          <span className="whitespace-nowrap rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            {group.totalResources} resources
          </span>
        </div>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700">
          {group.states.map((state) => (
            <StateFileRow key={state.key} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}

function DriftItemCard({ item }: { item: DriftItem }) {
  const driftConfig = {
    unmanaged: {
      color:
        "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800",
      icon: <AlertTriangle className="h-4 w-4" />,
      label: "Unmanaged",
    },
    orphaned: {
      color:
        "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800",
      icon: <XCircle className="h-4 w-4" />,
      label: "Orphaned",
    },
    modified: {
      color:
        "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800",
      icon: <FileText className="h-4 w-4" />,
      label: "Modified",
    },
  };

  const config = driftConfig[item.drift_type] || driftConfig.unmanaged;

  return (
    <div className={cn("rounded-lg border p-4", config.color)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.resource_id}</span>
            <span className="rounded bg-white/50 px-1.5 py-0.5 text-xs dark:bg-gray-800/50">
              {config.label}
            </span>
          </div>
          <p className="text-sm opacity-80">{item.resource_type}</p>
          {item.details && (
            <p className="mt-1 text-sm opacity-70">{item.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TerraformPage() {
  const {
    data: statesData,
    isLoading: statesLoading,
    error: statesError,
  } = useTerraformStates();
  const {
    data: driftData,
    isLoading: driftLoading,
    refetch: refetchDrift,
  } = useDrift();
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(
    new Set(),
  );

  const bucketGroups = useMemo((): BucketGroup[] => {
    if (!statesData?.states.length) return [];
    const groupMap = new Map<string, BucketGroup>();
    for (const state of statesData.states) {
      const bucketName = state.bucket?.name ?? "Unknown";
      const existing = groupMap.get(bucketName);
      if (existing) {
        existing.states.push(state);
        existing.totalResources += state.resource_count;
      } else {
        groupMap.set(bucketName, {
          bucketName,
          region: state.bucket?.region ?? null,
          states: [state],
          totalResources: state.resource_count,
        });
      }
    }
    return Array.from(groupMap.values());
  }, [statesData]);

  const toggleBucket = (bucketName: string) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucketName)) {
        next.delete(bucketName);
      } else {
        next.add(bucketName);
      }
      return next;
    });
  };

  if (statesLoading) {
    return <PageLoading />;
  }

  if (statesError) {
    return (
      <EmptyState
        icon={<GitBranch className="h-8 w-8" />}
        title="Error loading Terraform states"
        description="Failed to fetch Terraform state information. Make sure TF_STATE_BUCKET is configured."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <GitBranch className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Terraform
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage and monitor your Terraform state files
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-purple-100 p-3">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                State Files
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {statesData?.states.length || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Managed Resources
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {statesData?.total_tf_managed_resources || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div
              className={cn(
                "rounded-lg p-3",
                driftData?.drift_detected ? "bg-amber-100" : "bg-green-100",
              )}
            >
              {driftData?.drift_detected ? (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Drift Items
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {driftData?.items.length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* State Files grouped by bucket */}
      <Card>
        <CardHeader>
          <CardTitle>State Files</CardTitle>
        </CardHeader>
        <CardContent>
          {bucketGroups.length === 0 ? (
            <p className="py-4 text-center text-gray-500 dark:text-gray-400">
              No state files configured
            </p>
          ) : (
            <div className="space-y-3">
              {bucketGroups.map((group) => (
                <BucketGroupCard
                  key={group.bucketName}
                  group={group}
                  expanded={expandedBuckets.has(group.bucketName)}
                  onToggle={() => toggleBucket(group.bucketName)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drift Detection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Drift Detection</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDrift()}
            loading={driftLoading}
          >
            Check Drift
          </Button>
        </CardHeader>
        <CardContent>
          {!driftData ? (
            <p className="py-4 text-center text-gray-500 dark:text-gray-400">
              Click &quot;Check Drift&quot; to detect configuration drift
            </p>
          ) : driftData.items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-green-600 dark:text-green-400">
              <CheckCircle className="h-6 w-6" />
              <span className="text-lg font-medium">No drift detected</span>
            </div>
          ) : (
            <div className="space-y-3">
              {driftData.items.map((item, index) => (
                <DriftItemCard
                  key={`${item.resource_id}-${index}`}
                  item={item}
                />
              ))}
            </div>
          )}
          {driftData && (
            <p className="mt-4 text-center text-sm text-gray-400 dark:text-gray-500">
              Last checked: {formatRelativeTime(driftData.checked_at)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
