import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStatusSummary,
  getAppInfo,
  getEC2Instances,
  getEC2Instance,
  getRDSInstances,
  getRDSInstance,
  getECSContainers,
  getECSContainer,
  getECSClusters,
  getECSSummary,
  getVPCs,
  getVPC,
  getSubnets,
  getSubnet,
  getInternetGateways,
  getInternetGateway,
  getNATGateways,
  getNATGateway,
  getElasticIPs,
  getElasticIP,
  refreshData,
  getTerraformStates,
  getDrift,
  getTopology,
  getCyberArkSafes,
  getCyberArkSafe,
  getCyberArkRoles,
  getCyberArkRole,
  getCyberArkSIAPolicies,
  getCyberArkSIAPolicy,
  getCyberArkDrift,
  getAccessMapping,
  getAccessMappingUsers,
  getAccessMappingTargets,
} from "@/api";
import type { ResourceFilters, CyberArkFilters } from "@/types";

// =============================================================================
// Query Keys
// =============================================================================

export const queryKeys = {
  appInfo: ["app-info"] as const,
  statusSummary: ["status-summary"] as const,
  ec2Instances: (filters?: ResourceFilters) =>
    ["ec2-instances", filters] as const,
  ec2Instance: (id: string) => ["ec2-instance", id] as const,
  rdsInstances: (filters?: ResourceFilters) =>
    ["rds-instances", filters] as const,
  rdsInstance: (id: string) => ["rds-instance", id] as const,
  ecsContainers: (filters?: ResourceFilters) =>
    ["ecs-containers", filters] as const,
  ecsContainer: (id: string) => ["ecs-container", id] as const,
  ecsClusters: (filters?: {
    region?: string;
    search?: string;
    tf_managed?: boolean;
  }) => ["ecs-clusters", filters] as const,
  ecsSummary: ["ecs-summary"] as const,
  vpcs: (filters?: ResourceFilters) => ["vpcs", filters] as const,
  vpc: (id: string) => ["vpc", id] as const,
  subnets: (filters?: ResourceFilters) => ["subnets", filters] as const,
  subnet: (id: string) => ["subnet", id] as const,
  internetGateways: (filters?: ResourceFilters) =>
    ["internet-gateways", filters] as const,
  internetGateway: (id: string) => ["internet-gateway", id] as const,
  natGateways: (filters?: ResourceFilters) =>
    ["nat-gateways", filters] as const,
  natGateway: (id: string) => ["nat-gateway", id] as const,
  elasticIPs: (filters?: ResourceFilters) => ["elastic-ips", filters] as const,
  elasticIP: (id: string) => ["elastic-ip", id] as const,
  terraformStates: ["terraform-states"] as const,
  drift: ["drift"] as const,
  topology: (filters?: { vpc_id?: string }) => ["topology", filters] as const,
  cyberArkSafes: (filters?: CyberArkFilters) =>
    ["cyberark-safes", filters] as const,
  cyberArkSafe: (name: string) => ["cyberark-safe", name] as const,
  cyberArkRoles: (filters?: CyberArkFilters) =>
    ["cyberark-roles", filters] as const,
  cyberArkRole: (id: string) => ["cyberark-role", id] as const,
  cyberArkSIAPolicies: (filters?: CyberArkFilters) =>
    ["cyberark-sia-policies", filters] as const,
  cyberArkSIAPolicy: (id: string) => ["cyberark-sia-policy", id] as const,
  cyberArkDrift: ["cyberark-drift"] as const,
  accessMapping: (params?: { user?: string }) =>
    ["access-mapping", params] as const,
  accessMappingUsers: ["access-mapping-users"] as const,
  accessMappingTargets: ["access-mapping-targets"] as const,
};

// =============================================================================
// Status Summary
// =============================================================================

export function useStatusSummary() {
  return useQuery({
    queryKey: queryKeys.statusSummary,
    queryFn: getStatusSummary,
    refetchInterval: 60000, // Refresh every minute
  });
}

// =============================================================================
// App Info
// =============================================================================

export function useAppInfo() {
  return useQuery({
    queryKey: queryKeys.appInfo,
    queryFn: getAppInfo,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// =============================================================================
// EC2 Instances
// =============================================================================

export function useEC2Instances(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.ec2Instances(filters),
    queryFn: () => getEC2Instances(filters),
  });
}

export function useEC2Instance(instanceId: string) {
  return useQuery({
    queryKey: queryKeys.ec2Instance(instanceId),
    queryFn: () => getEC2Instance(instanceId),
    enabled: !!instanceId,
  });
}

// =============================================================================
// RDS Instances
// =============================================================================

export function useRDSInstances(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.rdsInstances(filters),
    queryFn: () => getRDSInstances(filters),
  });
}

export function useRDSInstance(dbIdentifier: string) {
  return useQuery({
    queryKey: queryKeys.rdsInstance(dbIdentifier),
    queryFn: () => getRDSInstance(dbIdentifier),
    enabled: !!dbIdentifier,
  });
}

// =============================================================================
// ECS Containers
// =============================================================================

export function useECSContainers(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.ecsContainers(filters),
    queryFn: () => getECSContainers(filters),
  });
}

export function useECSContainer(taskId: string) {
  return useQuery({
    queryKey: queryKeys.ecsContainer(taskId),
    queryFn: () => getECSContainer(taskId),
    enabled: !!taskId,
  });
}

export function useECSClusters(filters?: {
  region?: string;
  search?: string;
  tf_managed?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.ecsClusters(filters),
    queryFn: () => getECSClusters(filters),
  });
}

export function useECSSummary() {
  return useQuery({
    queryKey: queryKeys.ecsSummary,
    queryFn: getECSSummary,
    refetchInterval: 60000,
  });
}

// =============================================================================
// VPCs
// =============================================================================

export function useVPCs(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.vpcs(filters),
    queryFn: () => getVPCs(filters),
  });
}

export function useVPC(vpcId: string) {
  return useQuery({
    queryKey: queryKeys.vpc(vpcId),
    queryFn: () => getVPC(vpcId),
    enabled: !!vpcId,
  });
}

// =============================================================================
// Subnets
// =============================================================================

export function useSubnets(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.subnets(filters),
    queryFn: () => getSubnets(filters),
  });
}

export function useSubnet(subnetId: string) {
  return useQuery({
    queryKey: queryKeys.subnet(subnetId),
    queryFn: () => getSubnet(subnetId),
    enabled: !!subnetId,
  });
}

// =============================================================================
// Internet Gateways
// =============================================================================

export function useInternetGateways(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.internetGateways(filters),
    queryFn: () => getInternetGateways(filters),
  });
}

export function useInternetGateway(igwId: string) {
  return useQuery({
    queryKey: queryKeys.internetGateway(igwId),
    queryFn: () => getInternetGateway(igwId),
    enabled: !!igwId,
  });
}

// =============================================================================
// NAT Gateways
// =============================================================================

export function useNATGateways(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.natGateways(filters),
    queryFn: () => getNATGateways(filters),
  });
}

export function useNATGateway(natGatewayId: string) {
  return useQuery({
    queryKey: queryKeys.natGateway(natGatewayId),
    queryFn: () => getNATGateway(natGatewayId),
    enabled: !!natGatewayId,
  });
}

// =============================================================================
// Elastic IPs
// =============================================================================

export function useElasticIPs(filters?: ResourceFilters) {
  return useQuery({
    queryKey: queryKeys.elasticIPs(filters),
    queryFn: () => getElasticIPs(filters),
  });
}

export function useElasticIP(allocationId: string) {
  return useQuery({
    queryKey: queryKeys.elasticIP(allocationId),
    queryFn: () => getElasticIP(allocationId),
    enabled: !!allocationId,
  });
}

// =============================================================================
// Refresh
// =============================================================================

export function useRefreshData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (force?: boolean) => refreshData(force),
    onSuccess: () => {
      // Invalidate all resource queries after refresh
      queryClient.invalidateQueries({ queryKey: ["status-summary"] });
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      queryClient.invalidateQueries({ queryKey: ["rds-instances"] });
      queryClient.invalidateQueries({ queryKey: ["ecs-containers"] });
      queryClient.invalidateQueries({ queryKey: ["ecs-clusters"] });
      queryClient.invalidateQueries({ queryKey: ["ecs-summary"] });
      queryClient.invalidateQueries({ queryKey: ["vpcs"] });
      queryClient.invalidateQueries({ queryKey: ["subnets"] });
      queryClient.invalidateQueries({ queryKey: ["internet-gateways"] });
      queryClient.invalidateQueries({ queryKey: ["nat-gateways"] });
      queryClient.invalidateQueries({ queryKey: ["elastic-ips"] });
      queryClient.invalidateQueries({ queryKey: ["terraform-states"] });
      queryClient.invalidateQueries({ queryKey: ["drift"] });
      queryClient.invalidateQueries({ queryKey: ["topology"] });
      queryClient.invalidateQueries({ queryKey: ["cyberark-safes"] });
      queryClient.invalidateQueries({ queryKey: ["cyberark-roles"] });
      queryClient.invalidateQueries({ queryKey: ["cyberark-users"] });
      queryClient.invalidateQueries({ queryKey: ["cyberark-sia-policies"] });
      queryClient.invalidateQueries({ queryKey: ["cyberark-drift"] });
      queryClient.invalidateQueries({ queryKey: ["access-mapping"] });
      queryClient.invalidateQueries({ queryKey: ["access-mapping-users"] });
      queryClient.invalidateQueries({ queryKey: ["access-mapping-targets"] });
    },
  });
}

// =============================================================================
// Terraform
// =============================================================================

export function useTerraformStates() {
  return useQuery({
    queryKey: queryKeys.terraformStates,
    queryFn: getTerraformStates,
  });
}

export function useDrift() {
  return useQuery({
    queryKey: queryKeys.drift,
    queryFn: getDrift,
  });
}

// =============================================================================
// Topology
// =============================================================================

export function useTopology(filters?: { vpc_id?: string }) {
  return useQuery({
    queryKey: queryKeys.topology(filters),
    queryFn: () => getTopology(filters),
  });
}

// =============================================================================
// CyberArk
// =============================================================================

export function useCyberArkSafes(filters?: CyberArkFilters) {
  return useQuery({
    queryKey: queryKeys.cyberArkSafes(filters),
    queryFn: () => getCyberArkSafes(filters),
  });
}

export function useCyberArkSafe(safeName: string) {
  return useQuery({
    queryKey: queryKeys.cyberArkSafe(safeName),
    queryFn: () => getCyberArkSafe(safeName),
    enabled: !!safeName,
  });
}

export function useCyberArkRoles(filters?: CyberArkFilters) {
  return useQuery({
    queryKey: queryKeys.cyberArkRoles(filters),
    queryFn: () => getCyberArkRoles(filters),
  });
}

export function useCyberArkRole(roleId: string) {
  return useQuery({
    queryKey: queryKeys.cyberArkRole(roleId),
    queryFn: () => getCyberArkRole(roleId),
    enabled: !!roleId,
  });
}

export function useCyberArkSIAPolicies(filters?: CyberArkFilters) {
  return useQuery({
    queryKey: queryKeys.cyberArkSIAPolicies(filters),
    queryFn: () => getCyberArkSIAPolicies(filters),
  });
}

export function useCyberArkSIAPolicy(policyId: string) {
  return useQuery({
    queryKey: queryKeys.cyberArkSIAPolicy(policyId),
    queryFn: () => getCyberArkSIAPolicy(policyId),
    enabled: !!policyId,
  });
}

export function useCyberArkDrift() {
  return useQuery({
    queryKey: queryKeys.cyberArkDrift,
    queryFn: getCyberArkDrift,
  });
}

// =============================================================================
// Access Mapping
// =============================================================================

export function useAccessMapping(params?: { user?: string }) {
  return useQuery({
    queryKey: queryKeys.accessMapping(params),
    queryFn: () => getAccessMapping(params),
  });
}

export function useAccessMappingUsers() {
  return useQuery({
    queryKey: queryKeys.accessMappingUsers,
    queryFn: getAccessMappingUsers,
  });
}

export function useAccessMappingTargets() {
  return useQuery({
    queryKey: queryKeys.accessMappingTargets,
    queryFn: getAccessMappingTargets,
  });
}
