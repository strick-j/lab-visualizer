import type { SubnetType } from '@/types';

interface SubnetTypeBadgeProps {
  type: SubnetType;
}

export function SubnetTypeBadge({ type }: SubnetTypeBadgeProps) {
  const variants: Record<SubnetType, string> = {
    public: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    private: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    unknown: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${variants[type]}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}
