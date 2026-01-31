import { memo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VPCNodeData } from '@/types/topology';

const statusColors = {
  active: 'border-green-500 bg-green-50 dark:bg-green-950/30',
  inactive: 'border-gray-400 bg-gray-50 dark:bg-gray-800',
  transitioning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  error: 'border-red-500 bg-red-50 dark:bg-red-950/30',
  unknown: 'border-gray-300 bg-gray-50 dark:bg-gray-800',
};

function VPCNodeComponent({ data }: NodeProps<VPCNodeData>) {
  return (
    <div
      className={cn(
        'w-full h-full rounded-lg border-2 border-dashed p-4',
        statusColors[data.displayStatus]
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900/50">
          <Network className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {data.label || 'VPC'}
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
      </div>

      {/* Children will be rendered inside by React Flow */}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const VPCNode = memo(VPCNodeComponent);
