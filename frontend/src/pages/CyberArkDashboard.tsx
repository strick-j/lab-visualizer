import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  UserCog,
  Lock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageLoading,
} from "@/components/common";
import { SummaryStatCard } from "@/components/dashboard";
import {
  useCyberArkSafes,
  useCyberArkRoles,
  useCyberArkSIAPolicies,
  useCyberArkDrift,
  useCyberArkUsers,
} from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";

export function CyberArkDashboardPage() {
  const { data: safesData, isLoading: safesLoading } = useCyberArkSafes();
  const { data: rolesData, isLoading: rolesLoading } = useCyberArkRoles();
  const { data: policiesData, isLoading: policiesLoading } =
    useCyberArkSIAPolicies();
  const { data: driftData } = useCyberArkDrift();
  const { data: usersData, isLoading: usersLoading } = useCyberArkUsers();

  const isInitialLoading =
    safesLoading && rolesLoading && policiesLoading && usersLoading;

  if (isInitialLoading) {
    return <PageLoading />;
  }

  const totalSafes = safesData?.meta.total ?? 0;
  const totalRoles = rolesData?.meta.total ?? 0;
  const totalPolicies = policiesData?.meta.total ?? 0;
  const totalUsers = usersData?.meta.total ?? 0;

  const activeUsers = usersData?.data.filter((u) => u.active).length ?? 0;
  const totalAccounts =
    safesData?.data.reduce((sum, s) => sum + s.number_of_accounts, 0) ?? 0;
  const activePolicies =
    policiesData?.data.filter((p) => p.status === "active").length ?? 0;

  const recentSafes = safesData?.data.slice(0, 5) ?? [];
  const recentRoles = rolesData?.data.slice(0, 5) ?? [];
  const recentPolicies = policiesData?.data.slice(0, 5) ?? [];

  const lastRefreshed =
    safesData?.meta.last_refreshed ??
    rolesData?.meta.last_refreshed ??
    policiesData?.meta.last_refreshed;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            CyberArk Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overview of Identity Security resources
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <SummaryStatCard
          title="Users"
          icon={<Users className="h-5 w-5 text-blue-600" />}
          value={totalUsers}
          subtitle={`${activeUsers} active`}
          href="/cyberark"
          linkText="View users"
          loading={usersLoading}
        />
        <SummaryStatCard
          title="Roles"
          icon={<UserCog className="h-5 w-5 text-indigo-600" />}
          value={totalRoles}
          href="/cyberark"
          linkText="View roles"
          loading={rolesLoading}
        />
        <SummaryStatCard
          title="Safes"
          icon={<Lock className="h-5 w-5 text-amber-600" />}
          value={totalSafes}
          subtitle={`${totalAccounts} accounts`}
          href="/cyberark"
          linkText="View safes"
          loading={safesLoading}
        />
        <SummaryStatCard
          title="SIA Policies"
          icon={<ShieldCheck className="h-5 w-5 text-green-600" />}
          value={totalPolicies}
          subtitle={`${activePolicies} active`}
          href="/cyberark"
          linkText="View policies"
          loading={policiesLoading}
        />
      </div>

      {/* Drift Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            CyberArk Drift Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {driftData?.drift_detected ? (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                {driftData.items.length} drift item(s) detected
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">No drift detected</span>
            </div>
          )}
          {driftData?.drift_detected && (
            <div className="mt-3 space-y-2">
              {driftData.items.slice(0, 5).map((item, i) => (
                <div
                  key={`${item.resource_type}-${item.resource_id}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.resource_id}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {item.resource_type}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {item.drift_type}
                  </span>
                </div>
              ))}
              {driftData.items.length > 5 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  +{driftData.items.length - 5} more items
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Items Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Safes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Safes</CardTitle>
            <Link
              to="/cyberark"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {recentSafes.length === 0 ? (
              <p className="py-4 text-center text-gray-500 dark:text-gray-400">
                No safes found
              </p>
            ) : (
              <div className="space-y-2">
                {recentSafes.map((safe) => (
                  <div
                    key={safe.safe_name}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {safe.safe_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {safe.number_of_accounts} accounts
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {safe.number_of_members} members
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Roles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Roles</CardTitle>
            <Link
              to="/cyberark"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {recentRoles.length === 0 ? (
              <p className="py-4 text-center text-gray-500 dark:text-gray-400">
                No roles found
              </p>
            ) : (
              <div className="space-y-2">
                {recentRoles.map((role) => (
                  <div
                    key={role.role_id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {role.role_name}
                      </p>
                      {role.description && (
                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                          {role.description}
                        </p>
                      )}
                    </div>
                    {role.tf_managed && (
                      <span className="text-xs text-purple-600 dark:text-purple-400">
                        TF
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent SIA Policies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent SIA Policies</CardTitle>
            <Link
              to="/cyberark"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {recentPolicies.length === 0 ? (
              <p className="py-4 text-center text-gray-500 dark:text-gray-400">
                No SIA policies found
              </p>
            ) : (
              <div className="space-y-2">
                {recentPolicies.map((policy) => (
                  <div
                    key={policy.policy_id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {policy.policy_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {policy.policy_type}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        policy.status === "active"
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {policy.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      {lastRefreshed && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Data last refreshed {formatRelativeTime(lastRefreshed)}
        </p>
      )}
    </div>
  );
}
