import { useState, useCallback } from 'react';
import { InfrastructureTopology } from '@/components/topology';

export function TopologyPage() {
  const [selectedResource, setSelectedResource] = useState<{
    id: string;
    type: string;
  } | null>(null);

  const handleResourceSelect = useCallback((resourceId: string, resourceType: string) => {
    setSelectedResource({ id: resourceId, type: resourceType });
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Main content - topology visualization */}
      <div className="flex-1 relative bg-gray-50 dark:bg-gray-900">
        <InfrastructureTopology onResourceSelect={handleResourceSelect} />
      </div>

      {/* Resource info toast - shows when a resource is clicked */}
      {selectedResource && (
        <div className="absolute bottom-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-lg max-w-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {selectedResource.type}
              </p>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                {selectedResource.id}
              </p>
            </div>
            <button
              onClick={() => setSelectedResource(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
