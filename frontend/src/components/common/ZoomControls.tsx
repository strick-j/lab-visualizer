import { useReactFlow, useStore } from "reactflow";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoomControlsProps {
  className?: string;
}

export function ZoomControls({ className }: ZoomControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      className={cn(
        "absolute bottom-4 right-4 z-10 flex items-center gap-2",
        className,
      )}
    >
      <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg divide-x divide-gray-200 dark:divide-gray-700">
        <button
          onClick={() => zoomOut()}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-l-lg"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center select-none">
          {zoomPercentage}%
        </span>
        <button
          onClick={() => zoomIn()}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-r-lg"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        aria-label="Fit to view"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
