import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Server } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EC2NodeData } from "@/types/topology";

const statusColors = {
  active: "border-green-500 bg-white dark:bg-gray-900",
  inactive: "border-gray-400 bg-gray-50 dark:bg-gray-800",
  transitioning: "border-yellow-500 bg-white dark:bg-gray-900",
  error: "border-red-500 bg-white dark:bg-gray-900",
  unknown: "border-gray-300 bg-white dark:bg-gray-900",
};

const statusDot = {
  active: "bg-green-500",
  inactive: "bg-gray-400",
  transitioning: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
  unknown: "bg-gray-300",
};

function EC2NodeComponent({ data }: NodeProps<EC2NodeData>) {
  return (
    <div
      className={cn(
        "w-[170px] rounded-lg border-2 p-2.5 shadow-sm",
        statusColors[data.displayStatus],
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-900/50 shrink-0">
          <Server className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                statusDot[data.displayStatus],
              )}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.label || "EC2"}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {data.instanceType}
          </div>
          {data.privateIp && (
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
              {data.privateIp}
            </div>
          )}
        </div>
      </div>

      {data.tfManaged && (
        <div className="mt-1.5 flex justify-end">
          <span className="px-1 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
            TF
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const EC2Node = memo(EC2NodeComponent);
