import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleNodeData {
  label: string;
  roleName: string;
}

function RoleNodeComponent({ data }: NodeProps<RoleNodeData>) {
  return (
    <div
      className={cn(
        "w-[160px] rounded-lg border-2 p-2.5 shadow-sm",
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
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

export const RoleNode = memo(RoleNodeComponent);
