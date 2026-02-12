import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeNodeData {
  label: string;
  safeName: string;
  accountCount?: number;
  tfManaged?: boolean;
}

function SafeNodeComponent({ data }: NodeProps<SafeNodeData>) {
  return (
    <div
      className={cn(
        "w-[170px] rounded-lg border-2 p-2.5 shadow-sm",
        "border-amber-500 bg-white dark:bg-gray-900",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-900/50 shrink-0">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
            {data.safeName || data.label || "Safe"}
          </span>
          {data.accountCount !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {data.accountCount}{" "}
              {data.accountCount === 1 ? "account" : "accounts"}
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

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

export const SafeNode = memo(SafeNodeComponent);
