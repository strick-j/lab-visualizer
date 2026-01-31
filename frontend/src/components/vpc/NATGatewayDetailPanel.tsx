import { X } from 'lucide-react';
import { Button, StatusBadge, TerraformBadge } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import type { NATGateway } from '@/types';

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="break-all text-right text-sm font-medium text-gray-900 dark:text-gray-100">
        {value || '-'}
      </span>
    </div>
  );
}

interface NATGatewayDetailPanelProps {
  natGateway: NATGateway;
  onClose: () => void;
}

export function NATGatewayDetailPanel({ natGateway, onClose }: NATGatewayDetailPanelProps) {
  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">NAT Gateway Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {natGateway.connectivity_type}
          </span>
          <StatusBadge status={natGateway.display_status} />
          <TerraformBadge managed={natGateway.tf_managed} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {natGateway.name || natGateway.nat_gateway_id}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="NAT Gateway ID" value={natGateway.nat_gateway_id} />
              <DetailRow label="State" value={natGateway.state} />
              <DetailRow label="Connectivity Type" value={natGateway.connectivity_type} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Network
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="VPC ID" value={natGateway.vpc_id} />
              <DetailRow label="Subnet ID" value={natGateway.subnet_id} />
              <DetailRow label="Region" value={natGateway.region_name} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              IP Configuration
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow
                label="Public IP"
                value={natGateway.primary_public_ip ? (
                  <span className="font-mono">{natGateway.primary_public_ip}</span>
                ) : '-'}
              />
              <DetailRow
                label="Private IP"
                value={natGateway.primary_private_ip ? (
                  <span className="font-mono">{natGateway.primary_private_ip}</span>
                ) : '-'}
              />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Associations
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Allocation ID" value={natGateway.allocation_id} />
              <DetailRow label="Network Interface ID" value={natGateway.network_interface_id} />
            </div>
          </section>

          {natGateway.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="State File" value={natGateway.tf_state_source} />
                <DetailRow label="Address" value={<span className="font-mono text-xs">{natGateway.tf_resource_address}</span>} />
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Timestamps
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Last Updated" value={formatDateTime(natGateway.updated_at)} />
              {natGateway.created_at && <DetailRow label="Created" value={formatDateTime(natGateway.created_at)} />}
            </div>
          </section>

          {natGateway.tags && Object.keys(natGateway.tags).length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tags
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                {Object.entries(natGateway.tags).map(([key, value]) => (
                  <DetailRow key={key} label={key} value={value} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
