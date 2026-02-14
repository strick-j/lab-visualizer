import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { ShieldCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollapsibleNodeData } from "@/types";

interface RoleNodeData extends CollapsibleNodeData {
  label: string;
  roleName: string;
  tfManaged?: boolean;
}

function RoleNodeComponent({ data }: NodeProps<RoleNodeData>) {
  return (
    <div
      className={cn(
        "w-[280px] rounded-lg border-2 p-2.5 shadow-sm transition-all duration-300 ease-in-out",
        "border-purple-500 bg-white dark:bg-gray-900",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900/50 shrink-0">
          <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
            {data.roleName || data.label || "Role"}
          </span>
        </div>
        {data.onToggleCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
            title={
              data.collapsed
                ? "Expand downstream paths"
                : "Collapse downstream paths"
            }
          >
            {data.collapsed ? (
              <ChevronRight className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Collapsed summary badges */}
      {data.collapsed && data.childSummary && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {(data.childSummary.targetCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
              {data.childSummary.targetCount} target
              {data.childSummary.targetCount !== 1 ? "s" : ""}
            </span>
          )}
          {(data.childSummary.safeCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              {data.childSummary.safeCount} safe
              {data.childSummary.safeCount !== 1 ? "s" : ""}
            </span>
          )}
          {(data.childSummary.policyCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
              {data.childSummary.policyCount} polic
              {data.childSummary.policyCount !== 1 ? "ies" : "y"}
            </span>
          )}
        </div>
      )}

      {!data.collapsed && data.tfManaged && (
        <div className="mt-1.5 flex justify-end">
          <span className="px-1 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
            TF
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

export const RoleNode = memo(RoleNodeComponent);
