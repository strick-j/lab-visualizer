import { X } from "lucide-react";
import { Button, StatusBadge, TerraformBadge } from "@/components/common";
import { SubnetTypeBadge } from "./SubnetTypeBadge";
import { formatDateTime } from "@/lib/utils";
import type { Subnet } from "@/types";

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="break-all text-right text-sm font-medium text-gray-900 dark:text-gray-100">
        {value || "-"}
      </span>
    </div>
  );
}

interface SubnetDetailPanelProps {
  subnet: Subnet;
  onClose: () => void;
}

export function SubnetDetailPanel({ subnet, onClose }: SubnetDetailPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Subnet Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <SubnetTypeBadge type={subnet.subnet_type} />
          <StatusBadge status={subnet.display_status} />
          <TerraformBadge managed={subnet.tf_managed} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {subnet.name || subnet.subnet_id}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Subnet ID" value={subnet.subnet_id} />
              <DetailRow
                label="CIDR Block"
                value={<span className="font-mono">{subnet.cidr_block}</span>}
              />
              <DetailRow label="State" value={subnet.state} />
              <DetailRow
                label="Type"
                value={<SubnetTypeBadge type={subnet.subnet_type} />}
              />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Network
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="VPC ID" value={subnet.vpc_id} />
              <DetailRow
                label="Availability Zone"
                value={subnet.availability_zone}
              />
              <DetailRow label="Region" value={subnet.region_name} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              IP Configuration
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow
                label="Available IPs"
                value={subnet.available_ip_count.toLocaleString()}
              />
              <DetailRow
                label="Auto-assign Public IP"
                value={subnet.map_public_ip_on_launch ? "Enabled" : "Disabled"}
              />
            </div>
          </section>

          {subnet.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="State File" value={subnet.tf_state_source} />
                <DetailRow
                  label="Address"
                  value={
                    <span className="font-mono text-xs">
                      {subnet.tf_resource_address}
                    </span>
                  }
                />
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Timestamps
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow
                label="Last Updated"
                value={formatDateTime(subnet.updated_at)}
              />
              {subnet.created_at && (
                <DetailRow
                  label="Created"
                  value={formatDateTime(subnet.created_at)}
                />
              )}
            </div>
          </section>

          {subnet.tags && Object.keys(subnet.tags).length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tags
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                {Object.entries(subnet.tags).map(([key, value]) => (
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
