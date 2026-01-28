import { Link } from 'react-router-dom';
import { Server, Database, GitBranch, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, PageLoading, StatusBadge } from '@/components/common';
import { ResourceSummaryCard } from '@/components/dashboard';
import { useStatusSummary, useEC2Instances, useRDSInstances, useDrift } from '@/hooks';
import { formatRelativeTime, getResourceName } from '@/lib/utils';
import type { EC2Instance, RDSInstance } from '@/types';

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useStatusSummary();
  const { data: ec2Data, isLoading: ec2Loading } = useEC2Instances();
  const { data: rdsData, isLoading: rdsLoading } = useRDSInstances();
  const { data: drift } = useDrift();

  if (summaryLoading) {
    return <PageLoading />;
  }

  const recentEC2 = ec2Data?.data.slice(0, 5) || [];
  const recentRDS = rdsData?.data.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of your AWS infrastructure
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {summary && (
          <>
            <ResourceSummaryCard
              title="EC2 Instances"
              icon={<Server className="h-5 w-5 text-blue-600" />}
              counts={summary.ec2}
            />
            <ResourceSummaryCard
              title="RDS Databases"
              icon={<Database className="h-5 w-5 text-green-600" />}
              counts={summary.rds}
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-purple-600" />
                  Terraform Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {drift?.drift_detected ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      {drift.items.length} drift item(s) detected
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">No drift detected</span>
                  </div>
                )}
                <Link
                  to="/terraform"
                  className="mt-2 block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View Terraform details →
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Resources */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent EC2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent EC2 Instances</CardTitle>
            <Link
              to="/ec2"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {ec2Loading ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : recentEC2.length === 0 ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                No EC2 instances found
              </div>
            ) : (
              <div className="space-y-2">
                {recentEC2.map((instance: EC2Instance) => (
                  <Link
                    key={instance.instance_id}
                    to={`/ec2?selected=${instance.instance_id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {getResourceName(instance.name, instance.instance_id)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {instance.instance_type}
                      </p>
                    </div>
                    <StatusBadge status={instance.display_status} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent RDS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent RDS Databases</CardTitle>
            <Link
              to="/rds"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {rdsLoading ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : recentRDS.length === 0 ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                No RDS instances found
              </div>
            ) : (
              <div className="space-y-2">
                {recentRDS.map((instance: RDSInstance) => (
                  <Link
                    key={instance.db_instance_identifier}
                    to={`/rds?selected=${instance.db_instance_identifier}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {getResourceName(instance.name, instance.db_instance_identifier)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {instance.engine} {instance.engine_version}
                      </p>
                    </div>
                    <StatusBadge status={instance.display_status} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      {summary?.last_refreshed && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Data last refreshed {formatRelativeTime(summary.last_refreshed)}
        </p>
      )}
    </div>
  );
}
