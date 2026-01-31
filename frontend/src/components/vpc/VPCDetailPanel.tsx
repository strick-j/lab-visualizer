import { X } from 'lucide-react';
import { Button, StatusBadge, TerraformBadge } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import type { VPC } from '@/types';

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

interface VPCDetailPanelProps {
  vpc: VPC;
  onClose: () => void;
}

export function VPCDetailPanel({ vpc, onClose }: VPCDetailPanelProps) {
  return (
    <div className="fixed top-[var(--header-height)] right-0 bottom-0 z-50 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">VPC Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={vpc.display_status} />
          <TerraformBadge managed={vpc.tf_managed} />
          {vpc.is_default && (
            <span className="inline-flex items-center rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Default VPC
            </span>
          )}
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {vpc.name || vpc.vpc_id}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="VPC ID" value={vpc.vpc_id} />
              <DetailRow label="CIDR Block" value={<span className="font-mono">{vpc.cidr_block}</span>} />
              <DetailRow label="State" value={vpc.state} />
              <DetailRow label="Region" value={vpc.region_name} />
              <DetailRow label="Default VPC" value={vpc.is_default ? 'Yes' : 'No'} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              DNS Configuration
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="DNS Support" value={vpc.enable_dns_support ? 'Enabled' : 'Disabled'} />
              <DetailRow label="DNS Hostnames" value={vpc.enable_dns_hostnames ? 'Enabled' : 'Disabled'} />
            </div>
          </section>

          {vpc.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="State File" value={vpc.tf_state_source} />
                <DetailRow label="Address" value={<span className="font-mono text-xs">{vpc.tf_resource_address}</span>} />
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Timestamps
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Last Updated" value={formatDateTime(vpc.updated_at)} />
              {vpc.created_at && <DetailRow label="Created" value={formatDateTime(vpc.created_at)} />}
            </div>
          </section>

          {vpc.tags && Object.keys(vpc.tags).length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tags
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                {Object.entries(vpc.tags).map(([key, value]) => (
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
