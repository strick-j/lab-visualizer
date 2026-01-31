import { X } from 'lucide-react';
import { Button, StatusBadge, TerraformBadge } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import type { ElasticIP } from '@/types';

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

interface ElasticIPDetailPanelProps {
  elasticIP: ElasticIP;
  onClose: () => void;
}

export function ElasticIPDetailPanel({ elasticIP, onClose }: ElasticIPDetailPanelProps) {
  const getAssociationStatus = () => {
    if (!elasticIP.association_id) {
      return { type: 'Unassociated', target: null };
    }
    if (elasticIP.instance_id) {
      return { type: 'Instance', target: elasticIP.instance_id };
    }
    if (elasticIP.network_interface_id) {
      return { type: 'Network Interface', target: elasticIP.network_interface_id };
    }
    return { type: 'Associated', target: elasticIP.association_id };
  };

  const association = getAssociationStatus();

  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Elastic IP Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            {elasticIP.domain}
          </span>
          <StatusBadge status={elasticIP.display_status} />
          <TerraformBadge managed={elasticIP.tf_managed} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {elasticIP.name || elasticIP.public_ip}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Allocation ID" value={elasticIP.allocation_id} />
              <DetailRow
                label="Public IP"
                value={<span className="font-mono font-bold">{elasticIP.public_ip}</span>}
              />
              <DetailRow
                label="Private IP"
                value={elasticIP.private_ip ? (
                  <span className="font-mono">{elasticIP.private_ip}</span>
                ) : '-'}
              />
              <DetailRow label="Domain" value={elasticIP.domain} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Association
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow
                label="Status"
                value={
                  elasticIP.association_id ? (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Associated
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      Unassociated
                    </span>
                  )
                }
              />
              {elasticIP.association_id && (
                <>
                  <DetailRow label="Association ID" value={elasticIP.association_id} />
                  <DetailRow label="Association Type" value={association.type} />
                  {association.target && (
                    <DetailRow label="Target" value={association.target} />
                  )}
                </>
              )}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Network
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Region" value={elasticIP.region_name} />
              {elasticIP.network_interface_id && (
                <DetailRow label="Network Interface" value={elasticIP.network_interface_id} />
              )}
              {elasticIP.instance_id && (
                <DetailRow label="Instance ID" value={elasticIP.instance_id} />
              )}
            </div>
          </section>

          {elasticIP.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="State File" value={elasticIP.tf_state_source} />
                <DetailRow label="Address" value={<span className="font-mono text-xs">{elasticIP.tf_resource_address}</span>} />
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Timestamps
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Last Updated" value={formatDateTime(elasticIP.updated_at)} />
              {elasticIP.created_at && <DetailRow label="Created" value={formatDateTime(elasticIP.created_at)} />}
            </div>
          </section>

          {elasticIP.tags && Object.keys(elasticIP.tags).length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tags
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                {Object.entries(elasticIP.tags).map(([key, value]) => (
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
