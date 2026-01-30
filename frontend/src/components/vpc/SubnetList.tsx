import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLoading, StatusBadge, TerraformBadge, EmptyState } from '@/components/common';
import { ResourceTable, ResourceFilters } from '@/components/resources';
import { SubnetDetailPanel } from './SubnetDetailPanel';
import { SubnetTypeBadge } from './SubnetTypeBadge';
import { useSubnets } from '@/hooks';
import { getResourceName } from '@/lib/utils';
import type { ResourceFilters as Filters, Subnet } from '@/types';

interface SubnetListProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function SubnetList({ filters, onFilterChange }: SubnetListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('selected');

  const { data, isLoading, error } = useSubnets(filters);

  const selectedSubnet = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return data.data.find((s) => s.subnet_id === selectedId) || null;
  }, [selectedId, data?.data]);

  const handleRowClick = (subnet: Subnet) => {
    setSearchParams({ selected: subnet.subnet_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (subnet: Subnet) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(subnet.name, subnet.subnet_id)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subnet.subnet_id}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (subnet: Subnet) => <SubnetTypeBadge type={subnet.subnet_type} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (subnet: Subnet) => <StatusBadge status={subnet.display_status} size="sm" />,
    },
    {
      key: 'cidr',
      header: 'CIDR Block',
      render: (subnet: Subnet) => (
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {subnet.cidr_block}
        </span>
      ),
    },
    {
      key: 'vpc',
      header: 'VPC',
      render: (subnet: Subnet) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{subnet.vpc_id}</span>
      ),
    },
    {
      key: 'az',
      header: 'Availability Zone',
      render: (subnet: Subnet) => (
        <span className="text-gray-700 dark:text-gray-300">{subnet.availability_zone}</span>
      ),
    },
    {
      key: 'ips',
      header: 'Available IPs',
      render: (subnet: Subnet) => (
        <span className="text-gray-700 dark:text-gray-300">
          {subnet.available_ip_count.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'terraform',
      header: 'Terraform',
      render: (subnet: Subnet) => <TerraformBadge managed={subnet.tf_managed} />,
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading Subnets"
        description="There was an error loading the subnet list. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} Subnets found
        </p>
      </div>

      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No Subnets found"
          description="No subnets match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(subnet) => subnet.subnet_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedSubnet && (
        <SubnetDetailPanel subnet={selectedSubnet} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
