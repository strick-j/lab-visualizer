import { SearchInput, Select, Button } from '@/components/common';
import { X } from 'lucide-react';
import type { DisplayStatus, ResourceFilters as Filters } from '@/types';

interface ResourceFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  showTerraformFilter?: boolean;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'transitioning', label: 'Transitioning' },
  { value: 'error', label: 'Error' },
];

const terraformOptions = [
  { value: 'true', label: 'Managed' },
  { value: 'false', label: 'Unmanaged' },
];

export function ResourceFilters({
  filters,
  onFilterChange,
  showTerraformFilter = true,
}: ResourceFiltersProps) {
  const hasActiveFilters =
    filters.status || filters.search || filters.tf_managed !== undefined;

  const clearFilters = () => {
    onFilterChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <SearchInput
          placeholder="Search by name or ID..."
          value={filters.search || ''}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value || undefined })
          }
          onClear={() => onFilterChange({ ...filters, search: undefined })}
        />
      </div>

      <div className="w-40">
        <Select
          placeholder="All statuses"
          options={statusOptions}
          value={filters.status || ''}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              status: (e.target.value as DisplayStatus) || undefined,
            })
          }
        />
      </div>

      {showTerraformFilter && (
        <div className="w-40">
          <Select
            placeholder="All resources"
            options={terraformOptions}
            value={filters.tf_managed === undefined ? '' : String(filters.tf_managed)}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                tf_managed:
                  e.target.value === '' ? undefined : e.target.value === 'true',
              })
            }
          />
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
