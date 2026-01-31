import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Button, StatusBadge, TerraformBadge } from '@/components/common';
import { formatDateTime } from '@/lib/utils';
import type { EC2Instance, RDSInstance } from '@/types';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1 shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="break-all text-right text-sm font-medium text-gray-900 dark:text-gray-100">{value || '-'}</span>
    </div>
  );
}

interface CopyableDetailRowProps {
  label: string;
  value: string | null | undefined;
}

function CopyableDetailRow({ label, value }: CopyableDetailRowProps) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="flex items-center break-all text-right text-sm font-medium text-gray-900 dark:text-gray-100">
        {value ? (
          <>
            <span className="font-mono">{value}</span>
            <CopyButton value={value} />
          </>
        ) : (
          '-'
        )}
      </span>
    </div>
  );
}

interface EC2DetailPanelProps {
  instance: EC2Instance;
  onClose: () => void;
}

export function EC2DetailPanel({ instance, onClose }: EC2DetailPanelProps) {
  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Instance Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={instance.display_status} />
          <TerraformBadge managed={instance.tf_managed} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {instance.name || instance.instance_id}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <CopyableDetailRow label="Instance ID" value={instance.instance_id} />
              <DetailRow label="Type" value={instance.instance_type} />
              <DetailRow label="State" value={instance.state} />
              <DetailRow label="Region" value={instance.region_name} />
              <DetailRow label="AZ" value={instance.availability_zone} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Network
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <CopyableDetailRow label="Private IP" value={instance.private_ip} />
              <CopyableDetailRow label="Public IP" value={instance.public_ip} />
              <CopyableDetailRow label="Private DNS" value={instance.private_dns} />
              <CopyableDetailRow label="Public DNS" value={instance.public_dns} />
              <DetailRow label="VPC ID" value={instance.vpc_id} />
              <DetailRow label="Subnet ID" value={instance.subnet_id} />
            </div>
          </section>

          {instance.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="State File" value={instance.tf_state_source} />
                <DetailRow label="Address" value={instance.tf_resource_address} />
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Timestamps
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Launched" value={formatDateTime(instance.launch_time)} />
              <DetailRow label="Last Updated" value={formatDateTime(instance.updated_at)} />
            </div>
          </section>

          {instance.tags && Object.keys(instance.tags).length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tags
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                {Object.entries(instance.tags).map(([key, value]) => (
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

interface RDSDetailPanelProps {
  instance: RDSInstance;
  onClose: () => void;
}

export function RDSDetailPanel({ instance, onClose }: RDSDetailPanelProps) {
  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Database Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={instance.display_status} />
          <TerraformBadge managed={instance.tf_managed} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {instance.name || instance.db_instance_identifier}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Identifier" value={instance.db_instance_identifier} />
              <DetailRow label="Class" value={instance.db_instance_class} />
              <DetailRow label="Status" value={instance.status} />
              <DetailRow label="Region" value={instance.region_name} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Database
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Engine" value={`${instance.engine} ${instance.engine_version}`} />
              <DetailRow label="Storage" value={`${instance.allocated_storage} GB`} />
              <DetailRow label="Multi-AZ" value={instance.multi_az ? 'Yes' : 'No'} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Connection
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <CopyableDetailRow label="Endpoint" value={instance.endpoint} />
              <CopyableDetailRow label="Port" value={instance.port?.toString()} />
              <DetailRow label="VPC ID" value={instance.vpc_id} />
              <DetailRow label="AZ" value={instance.availability_zone} />
            </div>
          </section>

          {instance.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="State File" value={instance.tf_state_source} />
                <DetailRow label="Address" value={instance.tf_resource_address} />
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Timestamps
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Last Updated" value={formatDateTime(instance.updated_at)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
