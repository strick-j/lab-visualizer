import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Vault, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollapsibleNodeData } from "@/types";

interface SafeNodeData extends CollapsibleNodeData {
  label: string;
  safeName: string;
  accountCount?: number;
  tfManaged?: boolean;
}

function SafeNodeComponent({ data }: NodeProps<SafeNodeData>) {
  return (
    <div
      className={cn(
        "w-[280px] rounded-lg border-2 p-2.5 shadow-sm transition-all duration-300 ease-in-out",
        "border-amber-500 bg-white dark:bg-gray-900",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-900/50 shrink-0">
          <Vault className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
            {data.safeName || data.label || "Safe"}
          </span>
          {!data.collapsed && data.accountCount !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {data.accountCount}{" "}
              {data.accountCount === 1 ? "account" : "accounts"}
            </div>
          )}
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
          {(data.childSummary.accountCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {data.childSummary.accountCount} account
              {data.childSummary.accountCount !== 1 ? "s" : ""}
            </span>
          )}
          {(data.childSummary.targetCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
              {data.childSummary.targetCount} target
              {data.childSummary.targetCount !== 1 ? "s" : ""}
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

export const SafeNode = memo(SafeNodeComponent);
