import { Link } from 'react-router-dom';
import { Server, Database, GitBranch, AlertTriangle, CheckCircle, Network } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, PageLoading, StatusBadge } from '@/components/common';
import { ResourceSummaryCard } from '@/components/dashboard';
import { useStatusSummary, useEC2Instances, useRDSInstances, useDrift, useVPCs, useSubnets, useInternetGateways, useNATGateways, useElasticIPs } from '@/hooks';
import { formatRelativeTime, getResourceName } from '@/lib/utils';
import type { EC2Instance, RDSInstance, VPC } from '@/types';

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useStatusSummary();
  const { data: ec2Data, isLoading: ec2Loading } = useEC2Instances();
  const { data: rdsData, isLoading: rdsLoading } = useRDSInstances();
  const { data: drift } = useDrift();
  const { data: vpcData, isLoading: vpcLoading } = useVPCs();
  const { data: subnetData } = useSubnets();
  const { data: igwData } = useInternetGateways();
  const { data: natData } = useNATGateways();
  const { data: eipData } = useElasticIPs();

  if (summaryLoading) {
    return <PageLoading />;
  }

  const recentEC2 = ec2Data?.data.slice(0, 5) || [];
  const recentRDS = rdsData?.data.slice(0, 5) || [];
  const recentVPCs = vpcData?.data.slice(0, 5) || [];

  // Calculate VPC networking totals
  const vpcNetworkingTotal = {
    vpcs: vpcData?.meta.total || 0,
    subnets: subnetData?.meta.total || 0,
    igws: igwData?.meta.total || 0,
    natGateways: natData?.meta.total || 0,
    elasticIPs: eipData?.meta.total || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of your AWS infrastructure
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-cyan-600" />
                  VPC Networking
                </CardTitle>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {vpcNetworkingTotal.vpcs}
                </span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Subnets</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{vpcNetworkingTotal.subnets}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">IGWs</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{vpcNetworkingTotal.igws}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">NAT GWs</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{vpcNetworkingTotal.natGateways}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Elastic IPs</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{vpcNetworkingTotal.elasticIPs}</span>
                  </div>
                </div>
                <Link
                  to="/vpc"
                  className="mt-3 block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View VPC details →
                </Link>
              </CardContent>
            </Card>
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
      <div className="grid gap-6 lg:grid-cols-3">
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

        {/* Recent VPCs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent VPCs</CardTitle>
            <Link
              to="/vpc"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {vpcLoading ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : recentVPCs.length === 0 ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                No VPCs found
              </div>
            ) : (
              <div className="space-y-2">
                {recentVPCs.map((vpc: VPC) => (
                  <Link
                    key={vpc.vpc_id}
                    to={`/vpc?selected=${vpc.vpc_id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {getResourceName(vpc.name, vpc.vpc_id)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {vpc.cidr_block}
                      </p>
                    </div>
                    <StatusBadge status={vpc.display_status} size="sm" />
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
