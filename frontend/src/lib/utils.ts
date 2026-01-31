import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import type { DisplayStatus } from '@/types';

// =============================================================================
// Class Name Utilities
// =============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================================================
// Date Utilities
// =============================================================================

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy HH:mm:ss');
  } catch {
    return 'Invalid date';
  }
}

// =============================================================================
// Status Utilities
// =============================================================================

export const statusConfig: Record<
  DisplayStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  active: {
    label: 'Active',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    dotColor: 'bg-green-500',
  },
  inactive: {
    label: 'Inactive',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-700',
    dotColor: 'bg-gray-400 dark:bg-gray-500',
  },
  transitioning: {
    label: 'Transit',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    dotColor: 'bg-yellow-500',
  },
  error: {
    label: 'Error',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    dotColor: 'bg-red-500',
  },
  unknown: {
    label: 'Unknown',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-700',
    dotColor: 'bg-gray-300 dark:bg-gray-500',
  },
};

export function getStatusConfig(status: DisplayStatus) {
  return statusConfig[status] || statusConfig.unknown;
}

// =============================================================================
// Resource Utilities
// =============================================================================

export function getResourceName(
  name: string | null | undefined,
  id: string
): string {
  return name || id;
}

export function truncateId(id: string, maxLength = 20): string {
  if (id.length <= maxLength) return id;
  return `${id.slice(0, maxLength - 3)}...`;
}

// =============================================================================
// Filter Utilities
// =============================================================================

export function buildQueryString(params: Record<string, string | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}
