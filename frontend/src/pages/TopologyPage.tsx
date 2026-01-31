import { useState, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { InfrastructureTopology } from '@/components/topology';
import type { TopologyNodeData } from '@/types/topology';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
      )}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs font-mono text-gray-900 dark:text-gray-100">{value}</span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function getResourceDetails(data: TopologyNodeData): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = [];

  // Always add the name/label
  details.push({ label: 'Name', value: data.label });

  switch (data.type) {
    case 'ec2':
      details.push({ label: 'Instance ID', value: data.instanceId });
      details.push({ label: 'Type', value: data.instanceType });
      if (data.privateIp) {
        details.push({ label: 'Private IP', value: data.privateIp });
      }
      if (data.publicIp) {
        details.push({ label: 'Public IP', value: data.publicIp });
      }
      details.push({ label: 'State', value: data.state });
      break;

    case 'rds':
      details.push({ label: 'DB Identifier', value: data.dbIdentifier });
      details.push({ label: 'Engine', value: data.engine });
      details.push({ label: 'Instance Class', value: data.instanceClass });
      details.push({ label: 'Status', value: data.status });
      break;

    case 'nat-gateway':
      details.push({ label: 'NAT Gateway ID', value: data.natGatewayId });
      if (data.publicIp) {
        details.push({ label: 'Public IP', value: data.publicIp });
      }
      break;

    case 'internet-gateway':
      details.push({ label: 'IGW ID', value: data.igwId });
      break;

    case 'vpc':
      details.push({ label: 'VPC ID', value: data.vpcId });
      details.push({ label: 'CIDR Block', value: data.cidrBlock });
      break;

    case 'subnet':
      details.push({ label: 'Subnet ID', value: data.subnetId });
      details.push({ label: 'CIDR Block', value: data.cidrBlock });
      details.push({ label: 'Type', value: data.subnetType });
      details.push({ label: 'AZ', value: data.availabilityZone });
      break;
  }

  // Add Terraform address if managed
  if (data.tfManaged && data.tfResourceAddress) {
    details.push({ label: 'TF Address', value: data.tfResourceAddress });
  }

  return details;
}

function getResourceTypeLabel(type: TopologyNodeData['type']): string {
  const labels: Record<TopologyNodeData['type'], string> = {
    ec2: 'EC2 Instance',
    rds: 'RDS Database',
    'nat-gateway': 'NAT Gateway',
    'internet-gateway': 'Internet Gateway',
    vpc: 'VPC',
    subnet: 'Subnet',
  };
  return labels[type];
}

export function TopologyPage() {
  const [selectedResource, setSelectedResource] = useState<TopologyNodeData | null>(null);

  const handleResourceSelect = useCallback((nodeData: TopologyNodeData) => {
    setSelectedResource(nodeData);
  }, []);

  const details = selectedResource ? getResourceDetails(selectedResource) : [];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Main content - topology visualization */}
      <div className="flex-1 relative bg-gray-50 dark:bg-gray-900">
        <InfrastructureTopology onResourceSelect={handleResourceSelect} />
      </div>

      {/* Resource detail panel - shows when a resource is clicked */}
      {selectedResource && (
        <div className="absolute bottom-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg w-80">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {getResourceTypeLabel(selectedResource.type)}
              </span>
              {selectedResource.tfManaged && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded">
                  TF
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedResource(null)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>

          {/* Details */}
          <div className="px-4 py-2 divide-y divide-gray-100 dark:divide-gray-700">
            {details.map((detail) => (
              <DetailRow key={detail.label} label={detail.label} value={detail.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
