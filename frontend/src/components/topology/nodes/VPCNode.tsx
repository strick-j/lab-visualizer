import { memo } from "react";
import { NodeProps, Handle, Position, NodeResizer } from "reactflow";
import { Network, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VPCNodeData } from "@/types/topology";

const statusColors = {
  active: "border-green-500 bg-green-50 dark:bg-green-950/30",
  inactive: "border-gray-400 bg-gray-50 dark:bg-gray-800",
  transitioning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
  error: "border-red-500 bg-red-50 dark:bg-red-950/30",
  unknown: "border-gray-300 bg-gray-50 dark:bg-gray-800",
};

function VPCNodeComponent({ data, selected }: NodeProps<VPCNodeData>) {
  return (
    <div
      className={cn(
        "w-full h-full rounded-lg border-2 border-dashed p-4 transition-all duration-300 ease-in-out",
        statusColors[data.displayStatus],
      )}
    >
      <NodeResizer
        minWidth={data.minWidth ?? 400}
        minHeight={data.minHeight ?? 200}
        isVisible={selected}
        lineClassName="!border-purple-400"
        handleClassName="!h-3 !w-3 !bg-purple-500 !border-purple-600 !rounded-sm"
      />

      <Handle type="target" position={Position.Top} className="opacity-0" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900/50">
          <Network className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {data.label || "VPC"}
            </span>
            {data.tfManaged && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
                TF
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{data.cidrBlock}</span>
            <span>|</span>
            <span className="font-mono">{data.vpcId}</span>
          </div>
        </div>
        {data.onToggleCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={data.collapsed ? "Expand VPC" : "Collapse VPC"}
          >
            {data.collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Collapsed summary badges */}
      {data.collapsed && data.childSummary && (
        <div className="flex flex-wrap gap-1.5">
          {data.childSummary.subnetCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {data.childSummary.subnetCount} subnet
              {data.childSummary.subnetCount !== 1 ? "s" : ""}
            </span>
          )}
          {data.childSummary.ec2Count > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
              {data.childSummary.ec2Count} EC2
            </span>
          )}
          {data.childSummary.rdsCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {data.childSummary.rdsCount} RDS
            </span>
          )}
          {data.childSummary.ecsCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              {data.childSummary.ecsCount} ECS
            </span>
          )}
          {data.childSummary.natCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
              {data.childSummary.natCount} NAT
            </span>
          )}
          {data.childSummary.igwCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
              {data.childSummary.igwCount} IGW
            </span>
          )}
        </div>
      )}

      {/* Children will be rendered inside by React Flow */}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const VPCNode = memo(VPCNodeComponent);
