import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserNodeData {
  label: string;
  userName: string;
}

function UserNodeComponent({ data }: NodeProps<UserNodeData>) {
  return (
    <div
      className={cn(
        "w-[160px] rounded-lg border-2 p-2.5 shadow-sm",
        "border-blue-500 bg-white dark:bg-gray-900",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/50 shrink-0">
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
            {data.userName || data.label || "User"}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

export const UserNode = memo(UserNodeComponent);
