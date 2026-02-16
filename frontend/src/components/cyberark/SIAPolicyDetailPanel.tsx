import { X, Loader2 } from "lucide-react";
import { Button, TerraformBadge } from "@/components/common";
import { formatDateTime } from "@/lib/utils";
import { useCyberArkSIAPolicy } from "@/hooks";

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

interface SIAPolicyDetailPanelProps {
  policyId: string;
  onClose: () => void;
}

export function SIAPolicyDetailPanel({
  policyId,
  onClose,
}: SIAPolicyDetailPanelProps) {
  const { data: policy, isLoading } = useCyberArkSIAPolicy(policyId);

  const renderCriteria = (criteria: Record<string, unknown>) => {
    return Object.entries(criteria).map(([key, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return null;
      let displayValue: string;
      if (Array.isArray(value)) {
        displayValue = value.join(", ");
      } else if (typeof value === "object" && value !== null) {
        // Nested objects like tags: {"env": ["dev"], "os": ["linux", "unix"]}
        displayValue = Object.entries(value as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("; ");
      } else {
        displayValue = String(value);
      }
      return <DetailRow key={key} label={key} value={displayValue} />;
    });
  };

  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          SIA Policy Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : policy ? (
        <div className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                policy.policy_type === "vm"
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {policy.policy_type === "vm" ? "VM" : "Database"}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                policy.status === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {policy.status}
            </span>
            <TerraformBadge managed={policy.tf_managed} />
          </div>

          <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
            {policy.policy_name}
          </h3>

          <div className="space-y-6">
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Basic Info
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="Policy ID" value={policy.policy_id} />
                <DetailRow label="Policy Name" value={policy.policy_name} />
                <DetailRow
                  label="Description"
                  value={policy.description || "-"}
                />
                <DetailRow label="Type" value={policy.policy_type} />
                <DetailRow label="Status" value={policy.status} />
              </div>
            </section>

            {policy.target_criteria &&
              Object.keys(policy.target_criteria).length > 0 && (
                <section>
                  <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Target Criteria
                  </h4>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                    {renderCriteria(policy.target_criteria)}
                  </div>
                </section>
              )}

            {policy.principals.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Principals ({policy.principals.length})
                </h4>
                <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                      {policy.principals.map((principal) => (
                        <tr key={principal.id}>
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                            {principal.principal_name}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                            {principal.principal_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {policy.tf_managed && (
              <section>
                <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Terraform
                </h4>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                  <DetailRow
                    label="State File"
                    value={policy.tf_state_source}
                  />
                  <DetailRow
                    label="Address"
                    value={
                      <span className="font-mono text-xs">
                        {policy.tf_resource_address}
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
                  value={formatDateTime(policy.updated_at)}
                />
                {policy.created_at && (
                  <DetailRow
                    label="Created"
                    value={formatDateTime(policy.created_at)}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Policy not found.
        </div>
      )}
    </div>
  );
}
