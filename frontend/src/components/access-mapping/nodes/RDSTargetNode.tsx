import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface RDSTargetNodeData {
  label: string;
  dbIdentifier: string;
  endpoint?: string;
  displayStatus?: string;
  instanceClass?: string;
  engine?: string;
  vpcId?: string;
  tfManaged?: boolean;
}

const statusColors: Record<string, string> = {
  active: "border-green-500 bg-white dark:bg-gray-900",
  inactive: "border-gray-400 bg-gray-50 dark:bg-gray-800",
  transitioning: "border-yellow-500 bg-white dark:bg-gray-900",
  error: "border-red-500 bg-white dark:bg-gray-900",
  unknown: "border-gray-300 bg-white dark:bg-gray-900",
};

const statusDot: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-gray-400",
  transitioning: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
  unknown: "bg-gray-300",
};

function RDSTargetNodeComponent({ data }: NodeProps<RDSTargetNodeData>) {
  const status = data.displayStatus || "unknown";

  return (
    <div
      className={cn(
        "w-[280px] rounded-lg border-2 p-2.5 shadow-sm",
        statusColors[status] || statusColors.unknown,
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/50 shrink-0">
          <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                statusDot[status] || statusDot.unknown,
              )}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.label || "RDS"}
            </span>
          </div>
        </div>
      </div>

      {(data.engine || data.instanceClass || data.vpcId || data.tfManaged) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {data.engine && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 rounded">
              {data.engine}
            </span>
          )}
          {data.instanceClass && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 rounded">
              {data.instanceClass}
            </span>
          )}
          {data.vpcId && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded">
              {data.vpcId}
            </span>
          )}
          {data.tfManaged && (
            <span className="px-1 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
              TF
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

export const RDSTargetNode = memo(RDSTargetNodeComponent);
