import { X } from "lucide-react";
import { Button, StatusBadge, TerraformBadge } from "@/components/common";
import { formatDateTime } from "@/lib/utils";
import type { ECSCluster, ECSService } from "@/types";

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

function ServiceRow({ service }: { service: ECSService }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {service.service_name}
        </span>
        <StatusBadge status={service.display_status} size="sm" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Desired</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {service.desired_count}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Running</p>
          <p className="font-semibold text-green-600 dark:text-green-400">
            {service.running_count}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Pending</p>
          <p className="font-semibold text-yellow-600 dark:text-yellow-400">
            {service.pending_count}
          </p>
        </div>
      </div>
      {service.launch_type && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Launch: {service.launch_type}
        </p>
      )}
    </div>
  );
}

interface ECSDetailPanelProps {
  cluster: ECSCluster;
  onClose: () => void;
}

export function ECSDetailPanel({ cluster, onClose }: ECSDetailPanelProps) {
  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Cluster Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={cluster.display_status} />
          <TerraformBadge managed={cluster.tf_managed} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {cluster.name || cluster.cluster_name}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow label="Cluster Name" value={cluster.cluster_name} />
              <DetailRow label="Status" value={cluster.status} />
              <DetailRow label="Region" value={cluster.region_name} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Counts
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow
                label="Active Services"
                value={cluster.active_services_count}
              />
              <DetailRow
                label="Running Tasks"
                value={cluster.running_tasks_count}
              />
              <DetailRow
                label="Pending Tasks"
                value={cluster.pending_tasks_count}
              />
              <DetailRow
                label="Container Instances"
                value={cluster.registered_container_instances_count}
              />
            </div>
          </section>

          {cluster.services.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Services ({cluster.services.length})
              </h4>
              <div className="space-y-2">
                {cluster.services.map((service) => (
                  <ServiceRow key={service.service_arn} service={service} />
                ))}
              </div>
            </section>
          )}

          {cluster.tf_managed && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow
                  label="State File"
                  value={cluster.tf_state_source}
                />
                <DetailRow
                  label="Address"
                  value={cluster.tf_resource_address}
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
                value={formatDateTime(cluster.updated_at)}
              />
            </div>
          </section>

          {cluster.tags && Object.keys(cluster.tags).length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Tags
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                {Object.entries(cluster.tags).map(([key, value]) => (
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
