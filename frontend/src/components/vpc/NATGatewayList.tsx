import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLoading, StatusBadge, TerraformBadge, EmptyState } from '@/components/common';
import { ResourceTable, ResourceFilters } from '@/components/resources';
import { NATGatewayDetailPanel } from './NATGatewayDetailPanel';
import { useNATGateways } from '@/hooks';
import { getResourceName } from '@/lib/utils';
import type { ResourceFilters as Filters, NATGateway } from '@/types';

interface NATGatewayListProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function NATGatewayList({ filters, onFilterChange }: NATGatewayListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('selected');

  const { data, isLoading, error } = useNATGateways(filters);

  const selectedNATGateway = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return data.data.find((ng) => ng.nat_gateway_id === selectedId) || null;
  }, [selectedId, data?.data]);

  const handleRowClick = (natGateway: NATGateway) => {
    setSearchParams({ selected: natGateway.nat_gateway_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (natGw: NATGateway) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(natGw.name, natGw.nat_gateway_id)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{natGw.nat_gateway_id}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (natGw: NATGateway) => <StatusBadge status={natGw.display_status} size="sm" />,
    },
    {
      key: 'type',
      header: 'Type',
      render: (natGw: NATGateway) => (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {natGw.connectivity_type}
        </span>
      ),
    },
    {
      key: 'vpc',
      header: 'VPC',
      render: (natGw: NATGateway) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{natGw.vpc_id}</span>
      ),
    },
    {
      key: 'subnet',
      header: 'Subnet',
      render: (natGw: NATGateway) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{natGw.subnet_id}</span>
      ),
    },
    {
      key: 'public_ip',
      header: 'Public IP',
      render: (natGw: NATGateway) => (
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {natGw.primary_public_ip || '-'}
        </span>
      ),
    },
    {
      key: 'private_ip',
      header: 'Private IP',
      render: (natGw: NATGateway) => (
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {natGw.primary_private_ip || '-'}
        </span>
      ),
    },
    {
      key: 'terraform',
      header: 'Terraform',
      render: (natGw: NATGateway) => <TerraformBadge managed={natGw.tf_managed} />,
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading NAT Gateways"
        description="There was an error loading the NAT Gateway list. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} NAT Gateways found
        </p>
      </div>

      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No NAT Gateways found"
          description="No NAT Gateways match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(natGw) => natGw.nat_gateway_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedNATGateway && (
        <NATGatewayDetailPanel natGateway={selectedNATGateway} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
