import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SIAPolicyNodeData {
  label: string;
  policyName: string;
  policyType?: string;
  tfManaged?: boolean;
}

function SIAPolicyNodeComponent({ data }: NodeProps<SIAPolicyNodeData>) {
  return (
    <div
      className={cn(
        "w-[170px] rounded-lg border-2 p-2.5 shadow-sm",
        "border-orange-500 bg-white dark:bg-gray-900",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-900/50 shrink-0">
          <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
            {data.policyName || data.label || "Policy"}
          </span>
          {data.policyType && (
            <div className="mt-1">
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 rounded">
                {data.policyType}
              </span>
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

export const SIAPolicyNode = memo(SIAPolicyNodeComponent);
