import { memo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RDSNodeData } from '@/types/topology';

const statusColors = {
  active: 'border-green-500 bg-white dark:bg-gray-900',
  inactive: 'border-gray-400 bg-gray-50 dark:bg-gray-800',
  transitioning: 'border-yellow-500 bg-white dark:bg-gray-900',
  error: 'border-red-500 bg-white dark:bg-gray-900',
  unknown: 'border-gray-300 bg-white dark:bg-gray-900',
};

const statusDot = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  transitioning: 'bg-yellow-500 animate-pulse',
  error: 'bg-red-500',
  unknown: 'bg-gray-300',
};

function RDSNodeComponent({ data }: NodeProps<RDSNodeData>) {
  return (
    <div
      className={cn(
        'w-[170px] rounded-lg border-2 p-2.5 shadow-sm',
        statusColors[data.displayStatus]
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/50 shrink-0">
          <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full shrink-0', statusDot[data.displayStatus])} />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.label || 'RDS'}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {data.engine}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {data.instanceClass}
          </div>
        </div>
      </div>

      {data.tfManaged && (
        <div className="mt-1.5 flex justify-end">
          <span className="px-1 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
            TF
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const RDSNode = memo(RDSNodeComponent);
