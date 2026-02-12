import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Key } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountNodeData {
  label: string;
  accountName: string;
  address?: string;
}

function AccountNodeComponent({ data }: NodeProps<AccountNodeData>) {
  return (
    <div
      className={cn(
        "w-[160px] rounded-lg border-2 p-2.5 shadow-sm",
        "border-gray-500 bg-white dark:bg-gray-900",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 shrink-0">
          <Key className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
            {data.accountName || data.label || "Account"}
          </span>
          {data.address && (
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
              {data.address}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

export const AccountNode = memo(AccountNodeComponent);
