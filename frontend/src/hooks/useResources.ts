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
} from "@/api";
import type { ResourceFilters } from "@/types";

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
      queryClient.invalidateQueries({ queryKey: ["vpcs"] });
      queryClient.invalidateQueries({ queryKey: ["subnets"] });
      queryClient.invalidateQueries({ queryKey: ["internet-gateways"] });
      queryClient.invalidateQueries({ queryKey: ["nat-gateways"] });
      queryClient.invalidateQueries({ queryKey: ["elastic-ips"] });
      queryClient.invalidateQueries({ queryKey: ["terraform-states"] });
      queryClient.invalidateQueries({ queryKey: ["drift"] });
      queryClient.invalidateQueries({ queryKey: ["topology"] });
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
