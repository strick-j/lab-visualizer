import { X, Key } from "lucide-react";
import { Button, TerraformBadge, Loading } from "@/components/common";
import {
  EC2DetailPanel,
  RDSDetailPanel,
} from "@/components/resources/ResourceDetailPanel";
import { useEC2Instance, useRDSInstance } from "@/hooks";

interface SelectedNode {
  nodeType: string;
  nodeData: Record<string, unknown>;
}

interface AccessMappingDetailPanelProps {
  selectedNode: SelectedNode;
  onClose: () => void;
}

function AccountDetailPanel({
  data,
  onClose,
}: {
  data: Record<string, unknown>;
  onClose: () => void;
}) {
  const tfManaged = data.tfManaged as boolean | undefined;

  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Account Details
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <TerraformBadge managed={!!tfManaged} />
        </div>

        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {(data.accountName as string) || (data.label as string) || "Account"}
        </h3>

        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Basic Info
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              <DetailRow
                label="Account Name"
                value={data.accountName as string}
              />
              {data.accountId && (
                <DetailRow
                  label="Account ID"
                  value={data.accountId as string}
                />
              )}
              {data.username && (
                <DetailRow label="Username" value={data.username as string} />
              )}
              {data.safeName && (
                <DetailRow label="Safe" value={data.safeName as string} />
              )}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              Connection
            </h4>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
              {data.address && (
                <DetailRow label="Address" value={data.address as string} />
              )}
              {data.platformId && (
                <DetailRow
                  label="Platform ID"
                  value={data.platformId as string}
                />
              )}
              {data.secretType && (
                <DetailRow
                  label="Secret Type"
                  value={data.secretType as string}
                />
              )}
            </div>
          </section>

          {tfManaged && (
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Terraform
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow
                  label="State File"
                  value={data.tfStateSource as string}
                />
                <DetailRow
                  label="Address"
                  value={data.tfResourceAddress as string}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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

function EC2TargetDetailPanel({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const { data: instance, isLoading } = useEC2Instance(instanceId);

  if (isLoading) {
    return (
      <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-full items-center justify-center">
          <Loading text="Loading instance details..." />
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Instance Details
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 text-sm text-gray-500">
          Instance not found: {instanceId}
        </div>
      </div>
    );
  }

  return <EC2DetailPanel instance={instance} onClose={onClose} />;
}

function RDSTargetDetailPanel({
  dbIdentifier,
  onClose,
}: {
  dbIdentifier: string;
  onClose: () => void;
}) {
  const { data: instance, isLoading } = useRDSInstance(dbIdentifier);

  if (isLoading) {
    return (
      <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-full items-center justify-center">
          <Loading text="Loading database details..." />
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Database Details
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 text-sm text-gray-500">
          Database not found: {dbIdentifier}
        </div>
      </div>
    );
  }

  return <RDSDetailPanel instance={instance} onClose={onClose} />;
}

export function AccessMappingDetailPanel({
  selectedNode,
  onClose,
}: AccessMappingDetailPanelProps) {
  const { nodeType, nodeData } = selectedNode;

  switch (nodeType) {
    case "access-ec2-target":
      return (
        <EC2TargetDetailPanel
          instanceId={nodeData.instanceId as string}
          onClose={onClose}
        />
      );
    case "access-rds-target":
      return (
        <RDSTargetDetailPanel
          dbIdentifier={nodeData.dbIdentifier as string}
          onClose={onClose}
        />
      );
    case "access-account":
      return <AccountDetailPanel data={nodeData} onClose={onClose} />;
    default:
      return null;
  }
}
