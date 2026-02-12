import { X, Loader2 } from "lucide-react";
import { Button, TerraformBadge } from "@/components/common";
import { formatDateTime } from "@/lib/utils";
import { useCyberArkRole } from "@/hooks";

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

interface RoleDetailPanelProps {
  roleId: string;
  onClose: () => void;
}

export function RoleDetailPanel({ roleId, onClose }: RoleDetailPanelProps) {
  const { data: role, isLoading } = useCyberArkRole(roleId);

  return (
    <div className="fixed top-16 right-0 bottom-0 z-50 !mt-0 w-96 overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Role Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : role ? (
        <div className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <TerraformBadge managed={role.tf_managed} />
          </div>

          <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
            {role.role_name}
          </h3>

          <div className="space-y-6">
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                Basic Info
              </h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                <DetailRow label="Role ID" value={role.role_id} />
                <DetailRow label="Role Name" value={role.role_name} />
                <DetailRow
                  label="Description"
                  value={role.description || "-"}
                />
              </div>
            </section>

            {role.members.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Members ({role.members.length})
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
                      {role.members.map((member) => (
                        <tr key={member.id}>
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                            {member.member_name}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                            {member.member_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {role.tf_managed && (
              <section>
                <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Terraform
                </h4>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-700">
                  <DetailRow label="State File" value={role.tf_state_source} />
                  <DetailRow
                    label="Address"
                    value={
                      <span className="font-mono text-xs">
                        {role.tf_resource_address}
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
                  value={formatDateTime(role.updated_at)}
                />
                {role.created_at && (
                  <DetailRow
                    label="Created"
                    value={formatDateTime(role.created_at)}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Role not found.
        </div>
      )}
    </div>
  );
}
