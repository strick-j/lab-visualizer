import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Server,
  Database,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Network,
  Container,
  Shield,
  Lock,
  UserCog,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageLoading,
  StatusBadge,
  Select,
} from "@/components/common";
import { ResourceSummaryCard, SummaryStatCard } from "@/components/dashboard";
import {
  useStatusSummary,
  useEC2Instances,
  useRDSInstances,
  useECSContainers,
  useDrift,
  useVPCs,
  useSubnets,
  useInternetGateways,
  useNATGateways,
  useElasticIPs,
  useCyberArkSafes,
  useCyberArkRoles,
  useCyberArkSIAPolicies,
  useCyberArkDrift,
} from "@/hooks";
import { formatRelativeTime, getResourceName } from "@/lib/utils";
import type {
  EC2Instance,
  RDSInstance,
  ECSContainer,
  VPC,
  ResourceFilters,
} from "@/types";

const terraformOptions = [
  { value: "true", label: "Managed" },
  { value: "false", label: "Unmanaged" },
];

export function DashboardPage() {
  const [tfManagedFilter, setTfManagedFilter] = useState<boolean | undefined>(
    undefined,
  );

  const filters: ResourceFilters | undefined =
    tfManagedFilter !== undefined ? { tf_managed: tfManagedFilter } : undefined;

  const { data: summary, isLoading: summaryLoading } = useStatusSummary();
  const { data: ec2Data, isLoading: ec2Loading } = useEC2Instances(filters);
  const { data: rdsData, isLoading: rdsLoading } = useRDSInstances(filters);
  const { data: ecsData, isLoading: ecsLoading } = useECSContainers(filters);
  const { data: drift } = useDrift();
  const { data: vpcData, isLoading: vpcLoading } = useVPCs(filters);
  const { data: subnetData } = useSubnets(filters);
  const { data: igwData } = useInternetGateways(filters);
  const { data: natData } = useNATGateways(filters);
  const { data: eipData } = useElasticIPs(filters);

  // CyberArk data
  const { data: cyberArkSafesData } = useCyberArkSafes();
  const { data: cyberArkRolesData } = useCyberArkRoles();
  const { data: cyberArkPoliciesData } = useCyberArkSIAPolicies();
  const { data: cyberArkDrift } = useCyberArkDrift();

  if (summaryLoading) {
    return <PageLoading />;
  }

  const recentEC2 = ec2Data?.data.slice(0, 5) || [];
  const recentRDS = rdsData?.data.slice(0, 5) || [];
  const recentECS = ecsData?.data.slice(0, 5) || [];
  const recentVPCs = vpcData?.data.slice(0, 5) || [];

  // Calculate counts from filtered data
  const computeCounts = (data: { display_status: string }[] | undefined) => {
    if (!data)
      return { active: 0, inactive: 0, transitioning: 0, error: 0, total: 0 };
    return {
      active: data.filter((d) => d.display_status === "active").length,
      inactive: data.filter((d) => d.display_status === "inactive").length,
      transitioning: data.filter((d) => d.display_status === "transitioning")
        .length,
      error: data.filter((d) => d.display_status === "error").length,
      total: data.length,
    };
  };

  const ec2Counts =
    tfManagedFilter !== undefined ? computeCounts(ec2Data?.data) : summary?.ec2;
  const rdsCounts =
    tfManagedFilter !== undefined ? computeCounts(rdsData?.data) : summary?.rds;
  const ecsCounts = computeCounts(ecsData?.data);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Home
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Overview of your infrastructure
          </p>
        </div>
        <div className="w-40">
          <Select
            placeholder="All resources"
            options={terraformOptions}
            value={tfManagedFilter === undefined ? "" : String(tfManagedFilter)}
            onChange={(e) =>
              setTfManagedFilter(
                e.target.value === "" ? undefined : e.target.value === "true",
              )
            }
          />
        </div>
      </div>

      {/* Summary Cards */}
      {(summary || tfManagedFilter !== undefined) && (
        <div className="space-y-6">
          {/* Compute Resources */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {ec2Counts && (
              <ResourceSummaryCard
                title="EC2 Instances"
                icon={<Server className="h-5 w-5 text-blue-600" />}
                counts={ec2Counts}
                href="/ec2"
                linkText="View EC2 details"
              />
            )}
            {rdsCounts && (
              <ResourceSummaryCard
                title="RDS Databases"
                icon={<Database className="h-5 w-5 text-green-600" />}
                counts={rdsCounts}
                href="/rds"
                linkText="View RDS details"
              />
            )}
            {ecsCounts && (
              <ResourceSummaryCard
                title="ECS Containers"
                icon={<Container className="h-5 w-5 text-teal-600" />}
                counts={ecsCounts}
                href="/ecs"
                linkText="View ECS details"
              />
            )}
          </div>

          {/* Infrastructure & Management */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
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
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Subnets
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {vpcNetworkingTotal.subnets}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      IGWs
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {vpcNetworkingTotal.igws}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      NAT GWs
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {vpcNetworkingTotal.natGateways}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Elastic IPs
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {vpcNetworkingTotal.elasticIPs}
                    </span>
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
          </div>
        </div>
      )}

      {/* CyberArk Identity Security Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <Shield className="h-5 w-5 text-purple-600" />
            CyberArk Identity Security
          </h2>
          <Link
            to="/cyberark-dashboard"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View CyberArk Dashboard →
          </Link>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          <SummaryStatCard
            title="Safes"
            icon={<Lock className="h-5 w-5 text-amber-600" />}
            value={cyberArkSafesData?.meta.total ?? 0}
            href="/cyberark"
            linkText="View safes"
          />
          <SummaryStatCard
            title="Roles"
            icon={<UserCog className="h-5 w-5 text-indigo-600" />}
            value={cyberArkRolesData?.meta.total ?? 0}
            href="/cyberark"
            linkText="View roles"
          />
          <SummaryStatCard
            title="SIA Policies"
            icon={<ShieldCheck className="h-5 w-5 text-green-600" />}
            value={cyberArkPoliciesData?.meta.total ?? 0}
            href="/cyberark"
            linkText="View policies"
          />
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Drift
                  </p>
                  {cyberArkDrift?.drift_detected ? (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-lg font-bold">
                        {cyberArkDrift.items.length}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-lg font-bold">None</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Resources */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
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
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                Loading...
              </div>
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
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                Loading...
              </div>
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
                        {getResourceName(
                          instance.name,
                          instance.db_instance_identifier,
                        )}
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

        {/* Recent ECS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent ECS Containers</CardTitle>
            <Link
              to="/ecs"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {ecsLoading ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : recentECS.length === 0 ? (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                No ECS containers found
              </div>
            ) : (
              <div className="space-y-2">
                {recentECS.map((container: ECSContainer) => (
                  <Link
                    key={container.task_id}
                    to={`/ecs?selected=${container.task_id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {getResourceName(container.name, container.task_id)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {container.cluster_name}
                      </p>
                    </div>
                    <StatusBadge status={container.display_status} size="sm" />
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
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                Loading...
              </div>
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
