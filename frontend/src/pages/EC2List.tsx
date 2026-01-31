import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Server } from 'lucide-react';
import { PageLoading, StatusBadge, TerraformBadge, EmptyState } from '@/components/common';
import { ResourceTable, ResourceFilters, EC2DetailPanel } from '@/components/resources';
import { useEC2Instances } from '@/hooks';
import { getResourceName, formatRelativeTime } from '@/lib/utils';
import type { ResourceFilters as Filters, EC2Instance } from '@/types';

export function EC2ListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({});

  const selectedId = searchParams.get('selected');

  const { data, isLoading, error } = useEC2Instances(filters);

  const selectedInstance = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return data.data.find((i) => i.instance_id === selectedId) || null;
  }, [selectedId, data?.data]);

  const handleRowClick = (instance: EC2Instance) => {
    setSearchParams({ selected: instance.instance_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (instance: EC2Instance) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(instance.name, instance.instance_id)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{instance.instance_id}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (instance: EC2Instance) => (
        <StatusBadge status={instance.display_status} size="sm" />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (instance: EC2Instance) => (
        <span className="text-gray-700 dark:text-gray-300">{instance.instance_type}</span>
      ),
    },
    {
      key: 'ip',
      header: 'IP Address',
      render: (instance: EC2Instance) => (
        <div className="text-gray-700 dark:text-gray-300">
          {instance.private_ip && (
            <p className="text-sm">{instance.private_ip}</p>
          )}
          {instance.public_ip && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{instance.public_ip}</p>
          )}
          {!instance.private_ip && !instance.public_ip && '-'}
        </div>
      ),
    },
    {
      key: 'az',
      header: 'AZ',
      render: (instance: EC2Instance) => (
        <span className="text-gray-700 dark:text-gray-300">{instance.availability_zone || '-'}</span>
      ),
    },
    {
      key: 'terraform',
      header: 'Terraform',
      render: (instance: EC2Instance) => (
        <TerraformBadge managed={instance.tf_managed} />
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (instance: EC2Instance) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatRelativeTime(instance.updated_at)}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<Server className="h-8 w-8" />}
        title="Error loading EC2 instances"
        description="Failed to fetch EC2 instances. Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
          <Server className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">EC2 Instances</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Amazon Elastic Compute Cloud virtual servers
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {data?.meta.total || 0} instances found
      </p>

      <ResourceFilters filters={filters} onFilterChange={setFilters} />

      {data?.data.length === 0 ? (
        <EmptyState
          icon={<Server className="h-8 w-8" />}
          title="No EC2 instances found"
          description={
            Object.keys(filters).length > 0
              ? 'Try adjusting your filters'
              : 'No EC2 instances are available in your account'
          }
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(instance) => instance.instance_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedInstance && (
        <EC2DetailPanel
          instance={selectedInstance}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
