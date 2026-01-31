import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLoading, StatusBadge, TerraformBadge, EmptyState } from '@/components/common';
import { ResourceTable, ResourceFilters } from '@/components/resources';
import { VPCDetailPanel } from './VPCDetailPanel';
import { useVPCs } from '@/hooks';
import { getResourceName } from '@/lib/utils';
import type { ResourceFilters as Filters, VPC } from '@/types';

interface VPCListProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function VPCList({ filters, onFilterChange }: VPCListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('selected');

  const { data, isLoading, error } = useVPCs(filters);

  const selectedVPC = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return data.data.find((v) => v.vpc_id === selectedId) || null;
  }, [selectedId, data?.data]);

  const handleRowClick = (vpc: VPC) => {
    setSearchParams({ selected: vpc.vpc_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (vpc: VPC) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(vpc.name, vpc.vpc_id)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{vpc.vpc_id}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (vpc: VPC) => <StatusBadge status={vpc.display_status} size="sm" />,
    },
    {
      key: 'cidr',
      header: 'CIDR Block',
      render: (vpc: VPC) => (
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {vpc.cidr_block}
        </span>
      ),
    },
    {
      key: 'default',
      header: 'Default',
      render: (vpc: VPC) => (
        <span className="text-gray-700 dark:text-gray-300">
          {vpc.is_default ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'dns',
      header: 'DNS',
      render: (vpc: VPC) => (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {vpc.enable_dns_support && <div>✓ DNS Support</div>}
          {vpc.enable_dns_hostnames && <div>✓ DNS Hostnames</div>}
          {!vpc.enable_dns_support && !vpc.enable_dns_hostnames && '-'}
        </div>
      ),
    },
    {
      key: 'terraform',
      header: 'Terraform',
      render: (vpc: VPC) => <TerraformBadge managed={vpc.tf_managed} />,
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading VPCs"
        description="There was an error loading the VPC list. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} VPCs found
        </p>
      </div>

      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No VPCs found"
          description="No VPCs match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(vpc) => vpc.vpc_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedVPC && (
        <VPCDetailPanel vpc={selectedVPC} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
