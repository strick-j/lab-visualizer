import { memo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { Globe, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InternetGatewayNodeData, NATGatewayNodeData } from '@/types/topology';

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

function InternetGatewayNodeComponent({ data }: NodeProps<InternetGatewayNodeData>) {
  return (
    <div
      className={cn(
        'w-[140px] rounded-lg border-2 p-2 shadow-sm',
        statusColors[data.displayStatus]
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-cyan-100 dark:bg-cyan-900/50 shrink-0">
          <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot[data.displayStatus])} />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.label || 'IGW'}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-mono">
            {data.igwId}
          </div>
        </div>
      </div>

      {data.tfManaged && (
        <div className="mt-1 flex justify-end">
          <span className="px-1 py-0.5 text-[9px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
            TF
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

function NATGatewayNodeComponent({ data }: NodeProps<NATGatewayNodeData>) {
  return (
    <div
      className={cn(
        'w-[140px] rounded-lg border-2 p-2 shadow-sm',
        statusColors[data.displayStatus]
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-violet-100 dark:bg-violet-900/50 shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot[data.displayStatus])} />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.label || 'NAT'}
            </span>
          </div>
          {data.publicIp && (
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-mono">
              {data.publicIp}
            </div>
          )}
        </div>
      </div>

      {data.tfManaged && (
        <div className="mt-1 flex justify-end">
          <span className="px-1 py-0.5 text-[9px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
            TF
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const InternetGatewayNode = memo(InternetGatewayNodeComponent);
export const NATGatewayNode = memo(NATGatewayNodeComponent);
