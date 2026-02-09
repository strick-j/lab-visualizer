import { memo } from "react";
import { NodeProps, Handle, Position, NodeResizer } from "reactflow";
import { Boxes } from "lucide-react";
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
        "w-full h-full rounded-lg border-2 p-3",
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
      <div className="flex items-center gap-2 mb-2">
        <Boxes className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.label || "Subnet"}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 text-xs font-medium rounded",
                subnetTypeBadge[data.subnetType],
              )}
            >
              {data.subnetType}
            </span>
            {data.tfManaged && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
                TF
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {data.cidrBlock} | {data.availabilityZone}
          </div>
        </div>
      </div>

      {/* Children will be rendered inside by React Flow */}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const SubnetNode = memo(SubnetNodeComponent);
