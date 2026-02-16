import { memo } from "react";
import { NodeProps, Handle, Position, NodeResizer } from "reactflow";
import { Boxes, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubnetNodeData } from "@/types/topology";

const subnetTypeStyles = {
  public: "border-green-400 bg-green-50/50 dark:bg-green-950/20",
  private: "border-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
  unknown: "border-gray-300 bg-gray-50/50 dark:bg-gray-800/50",
};

const subnetTypeBadge = {
  public:
    "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  private: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  unknown: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const resizerLineColors = {
  public: "!border-green-400",
  private: "!border-blue-400",
  unknown: "!border-gray-400",
};

const resizerHandleColors = {
  public: "!bg-green-500 !border-green-600",
  private: "!bg-blue-500 !border-blue-600",
  unknown: "!bg-gray-500 !border-gray-600",
};

function SubnetNodeComponent({ data, selected }: NodeProps<SubnetNodeData>) {
  return (
    <div
      className={cn(
        "w-full rounded-lg border-2 p-3 transition-all duration-300 ease-in-out",
        !data.collapsed && "h-full",
        subnetTypeStyles[data.subnetType],
      )}
    >
      <NodeResizer
        minWidth={data.minWidth ?? 250}
        minHeight={data.minHeight ?? 90}
        isVisible={selected}
        lineClassName={resizerLineColors[data.subnetType]}
        handleClassName={cn(
          "!h-2.5 !w-2.5 !rounded-sm",
          resizerHandleColors[data.subnetType],
        )}
      />

      <Handle type="target" position={Position.Top} className="opacity-0" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2 overflow-hidden">
        <Boxes className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.label || "Subnet"}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 text-xs font-medium rounded shrink-0",
                subnetTypeBadge[data.subnetType],
              )}
            >
              {data.subnetType}
            </span>
            {data.tfManaged && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded shrink-0">
                TF
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {data.cidrBlock} | {data.availabilityZone}
          </div>
        </div>
        {data.onToggleCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={data.collapsed ? "Expand subnet" : "Collapse subnet"}
          >
            {data.collapsed ? (
              <ChevronRight className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Collapsed summary badges */}
      {data.collapsed && data.childSummary && (
        <div className="flex flex-wrap gap-1">
          {data.childSummary.ec2Count > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
              {data.childSummary.ec2Count} EC2
            </span>
          )}
          {data.childSummary.rdsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {data.childSummary.rdsCount} RDS
            </span>
          )}
          {data.childSummary.ecsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              {data.childSummary.ecsCount} ECS
            </span>
          )}
          {data.childSummary.natCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
              {data.childSummary.natCount} NAT
            </span>
          )}
        </div>
      )}

      {/* Children will be rendered inside by React Flow */}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const SubnetNode = memo(SubnetNodeComponent);
