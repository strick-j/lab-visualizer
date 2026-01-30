import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLoading, StatusBadge, TerraformBadge, EmptyState } from '@/components/common';
import { ResourceTable, ResourceFilters } from '@/components/resources';
import { ElasticIPDetailPanel } from './ElasticIPDetailPanel';
import { useElasticIPs } from '@/hooks';
import { getResourceName } from '@/lib/utils';
import type { ResourceFilters as Filters, ElasticIP } from '@/types';

interface ElasticIPListProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function ElasticIPList({ filters, onFilterChange }: ElasticIPListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('selected');

  const { data, isLoading, error } = useElasticIPs(filters);

  const selectedElasticIP = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return data.data.find((eip) => eip.allocation_id === selectedId) || null;
  }, [selectedId, data?.data]);

  const handleRowClick = (eip: ElasticIP) => {
    setSearchParams({ selected: eip.allocation_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (eip: ElasticIP) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(eip.name, eip.allocation_id)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{eip.allocation_id}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (eip: ElasticIP) => <StatusBadge status={eip.display_status} size="sm" />,
    },
    {
      key: 'public_ip',
      header: 'Public IP',
      render: (eip: ElasticIP) => (
        <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
          {eip.public_ip}
        </span>
      ),
    },
    {
      key: 'private_ip',
      header: 'Private IP',
      render: (eip: ElasticIP) => (
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {eip.private_ip || '-'}
        </span>
      ),
    },
    {
      key: 'association',
      header: 'Association',
      render: (eip: ElasticIP) => {
        if (!eip.association_id) {
          return (
            <span className="text-sm text-gray-500 dark:text-gray-400">Unassociated</span>
          );
        }
        if (eip.instance_id) {
          return (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Instance
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{eip.instance_id}</p>
            </div>
          );
        }
        if (eip.network_interface_id) {
          return (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Network Interface
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {eip.network_interface_id}
              </p>
            </div>
          );
        }
        return (
          <span className="text-sm text-gray-700 dark:text-gray-300">Associated</span>
        );
      },
    },
    {
      key: 'domain',
      header: 'Domain',
      render: (eip: ElasticIP) => (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          {eip.domain}
        </span>
      ),
    },
    {
      key: 'terraform',
      header: 'Terraform',
      render: (eip: ElasticIP) => <TerraformBadge managed={eip.tf_managed} />,
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading Elastic IPs"
        description="There was an error loading the Elastic IP list. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} Elastic IPs found
        </p>
      </div>

      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No Elastic IPs found"
          description="No Elastic IPs match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(eip) => eip.allocation_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedElasticIP && (
        <ElasticIPDetailPanel elasticIP={selectedElasticIP} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
