import { X } from 'lucide-react';
import { Button, StatusBadge, TerraformBadge } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import type { InternetGateway } from '@/types';

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

interface IGWDetailPanelProps {
  igw: InternetGateway;
  onClose: () => void;
}

export function IGWDetailPanel({ igw, onClose }: IGWDetailPanelProps) {
  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Internet Gateway Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={igw.display_status} />
          <TerraformBadge managed={igw.tf_managed} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {igw.name || igw.igw_id}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="IGW ID" value={igw.igw_id} />
              <DetailRow label="State" value={<span className="capitalize">{igw.state}</span>} />
              <DetailRow label="Region" value={igw.region_name} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Attachment
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow
                label="VPC ID"
                value={
                  igw.vpc_id ? (
                    igw.vpc_id
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">Detached</span>
                  )
                }
              />
            </div>
          </section>

          {igw.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="State File" value={igw.tf_state_source} />
                <DetailRow label="Address" value={<span className="font-mono text-xs">{igw.tf_resource_address}</span>} />
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Timestamps
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Last Updated" value={formatDateTime(igw.updated_at)} />
              {igw.created_at && <DetailRow label="Created" value={formatDateTime(igw.created_at)} />}
            </div>
          </section>

          {igw.tags && Object.keys(igw.tags).length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tags
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                {Object.entries(igw.tags).map(([key, value]) => (
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
