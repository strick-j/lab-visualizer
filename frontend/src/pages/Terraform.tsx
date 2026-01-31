import {
  GitBranch,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
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

function StateFileCard({ state }: { state: TerraformStateInfo }) {
  const statusColors = {
    synced:
      "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30",
    error: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30",
    unknown: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-700",
  };

  const statusIcons = {
    synced: <CheckCircle className="h-4 w-4" />,
    error: <XCircle className="h-4 w-4" />,
    unknown: <FileText className="h-4 w-4" />,
  };

  const statusConfig =
    statusColors[state.status as keyof typeof statusColors] ||
    statusColors.unknown;
  const StatusIcon =
    statusIcons[state.status as keyof typeof statusIcons] ||
    statusIcons.unknown;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={cn("flex-shrink-0 rounded-lg p-2", statusConfig)}>
            {StatusIcon}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {state.name}
            </h4>
            <p className="break-all text-sm text-gray-500 dark:text-gray-400">
              {state.key}
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-purple-100 px-2.5 py-0.5 text-sm font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          {state.resource_count} resources
        </span>
      </div>
      {state.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {state.description}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Last modified: {formatRelativeTime(state.last_modified)}
      </p>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Terraform</h1>
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

      {/* State Files */}
      <Card>
        <CardHeader>
          <CardTitle>State Files</CardTitle>
        </CardHeader>
        <CardContent>
          {statesData?.states.length === 0 ? (
            <p className="text-center text-gray-500 py-4 dark:text-gray-400">
              No state files configured
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {statesData?.states.map((state) => (
                <StateFileCard key={state.key} state={state} />
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
            <p className="text-center text-gray-500 py-4 dark:text-gray-400">
              Click "Check Drift" to detect configuration drift
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
