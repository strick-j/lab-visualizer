/**
 * Client-side filtering for topology data.
 *
 * Filters the nested TopologyResponse hierarchy (VPC -> Subnet -> Resources)
 * while preserving parent containers that have matching children.
 */

import type {
  TopologyResponse,
  TopologyVPC,
  TopologySubnet,
  TopologyEC2Instance,
  TopologyRDSInstance,
  TopologyECSContainer,
  TopologyNATGateway,
  TopologyFilters,
  TopologyMeta,
} from "@/types/topology";
import type { DisplayStatus } from "@/types/resources";

const EMPTY_FILTERS: TopologyFilters = {
  search: "",
  vpcId: "",
  subnetType: "",
  status: "",
  tfManaged: "",
  resourceTypes: [],
};

export function hasActiveFilters(filters: TopologyFilters): boolean {
  return (
    filters.search !== "" ||
    filters.vpcId !== "" ||
    filters.subnetType !== "" ||
    filters.status !== "" ||
    filters.tfManaged !== "" ||
    filters.resourceTypes.length > 0
  );
}

function matchesTfManaged(tfManaged: boolean, filter: string): boolean {
  if (!filter) return true;
  return filter === "true" ? tfManaged : !tfManaged;
}

function matchesSearch(
  search: string,
  ...values: (string | null | undefined)[]
): boolean {
  const term = search.toLowerCase();
  return values.some((v) => v && v.toLowerCase().includes(term));
}

function matchesStatus(status: DisplayStatus, filter: string): boolean {
  return !filter || status === filter;
}

function filterEC2(
  instances: TopologyEC2Instance[],
  filters: TopologyFilters,
): TopologyEC2Instance[] {
  if (
    filters.resourceTypes.length > 0 &&
    !filters.resourceTypes.includes("ec2")
  )
    return [];
  return instances.filter((ec2) => {
    if (!matchesTfManaged(ec2.tf_managed, filters.tfManaged)) return false;
    if (filters.status && ec2.display_status !== filters.status) return false;
    if (
      filters.search &&
      !matchesSearch(
        filters.search,
        ec2.name,
        ec2.id,
        ec2.instance_type,
        ec2.private_ip,
        ec2.public_ip,
        ec2.state,
      )
    )
      return false;
    return true;
  });
}

function filterRDS(
  instances: TopologyRDSInstance[],
  filters: TopologyFilters,
): TopologyRDSInstance[] {
  if (
    filters.resourceTypes.length > 0 &&
    !filters.resourceTypes.includes("rds")
  )
    return [];
  return instances.filter((rds) => {
    if (!matchesTfManaged(rds.tf_managed, filters.tfManaged)) return false;
    if (filters.status && rds.display_status !== filters.status) return false;
    if (
      filters.search &&
      !matchesSearch(
        filters.search,
        rds.name,
        rds.id,
        rds.engine,
        rds.instance_class,
        rds.endpoint,
        rds.status,
      )
    )
      return false;
    return true;
  });
}

function filterECS(
  containers: TopologyECSContainer[],
  filters: TopologyFilters,
): TopologyECSContainer[] {
  if (!containers) return [];
  if (
    filters.resourceTypes.length > 0 &&
    !filters.resourceTypes.includes("ecs")
  )
    return [];
  return containers.filter((ecs) => {
    if (!matchesTfManaged(ecs.tf_managed, filters.tfManaged)) return false;
    if (filters.status && ecs.display_status !== filters.status) return false;
    if (
      filters.search &&
      !matchesSearch(
        filters.search,
        ecs.name,
        ecs.id,
        ecs.cluster_name,
        ecs.launch_type,
        ecs.image,
        ecs.status,
      )
    )
      return false;
    return true;
  });
}

function filterNATGateway(
  nat: TopologyNATGateway | null,
  filters: TopologyFilters,
): TopologyNATGateway | null {
  if (!nat) return null;
  if (
    filters.resourceTypes.length > 0 &&
    !filters.resourceTypes.includes("nat")
  )
    return null;
  if (!matchesTfManaged(nat.tf_managed, filters.tfManaged)) return null;
  if (filters.status && !matchesStatus(nat.display_status, filters.status))
    return null;
  if (
    filters.search &&
    !matchesSearch(filters.search, nat.name, nat.id, nat.primary_public_ip)
  )
    return null;
  return nat;
}

function filterSubnets(
  subnets: TopologySubnet[],
  filters: TopologyFilters,
): TopologySubnet[] {
  return subnets
    .filter((subnet) => {
      if (filters.subnetType && subnet.subnet_type !== filters.subnetType)
        return false;
      return true;
    })
    .map((subnet) => ({
      ...subnet,
      ec2_instances: filterEC2(subnet.ec2_instances, filters),
      rds_instances: filterRDS(subnet.rds_instances, filters),
      ecs_containers: filterECS(subnet.ecs_containers, filters),
      nat_gateway: filterNATGateway(subnet.nat_gateway, filters),
    }))
    .filter((subnet) => {
      // Keep subnet if it directly matches search
      if (
        filters.search &&
        matchesSearch(
          filters.search,
          subnet.name,
          subnet.id,
          subnet.cidr_block,
          subnet.availability_zone,
        )
      )
        return true;

      // Keep subnet if it matches status filter itself
      if (filters.status && subnet.display_status !== filters.status) {
        // Only keep it if it has matching children
        return (
          subnet.ec2_instances.length > 0 ||
          subnet.rds_instances.length > 0 ||
          subnet.ecs_containers.length > 0 ||
          subnet.nat_gateway !== null
        );
      }

      // If tfManaged filter is active, only keep subnet if it matches OR has matching children
      if (
        filters.tfManaged &&
        !matchesTfManaged(subnet.tf_managed, filters.tfManaged)
      ) {
        return (
          subnet.ec2_instances.length > 0 ||
          subnet.rds_instances.length > 0 ||
          subnet.ecs_containers.length > 0 ||
          subnet.nat_gateway !== null
        );
      }

      // If search is active, only keep subnet if it has matching children
      if (filters.search) {
        return (
          subnet.ec2_instances.length > 0 ||
          subnet.rds_instances.length > 0 ||
          subnet.ecs_containers.length > 0 ||
          subnet.nat_gateway !== null
        );
      }

      return true;
    });
}

function computeFilteredMeta(vpcs: TopologyVPC[]): TopologyMeta {
  let total_subnets = 0;
  let total_ec2 = 0;
  let total_rds = 0;
  let total_ecs_containers = 0;
  let total_nat_gateways = 0;
  let total_internet_gateways = 0;
  let total_elastic_ips = 0;

  for (const vpc of vpcs) {
    if (vpc.internet_gateway) total_internet_gateways++;
    total_elastic_ips += vpc.elastic_ips?.length || 0;
    for (const subnet of vpc.subnets) {
      total_subnets++;
      total_ec2 += subnet.ec2_instances.length;
      total_rds += subnet.rds_instances.length;
      total_ecs_containers += subnet.ecs_containers?.length || 0;
      if (subnet.nat_gateway) total_nat_gateways++;
    }
  }

  return {
    total_vpcs: vpcs.length,
    total_subnets,
    total_ec2,
    total_rds,
    total_ecs_containers,
    total_nat_gateways,
    total_internet_gateways,
    total_elastic_ips,
    last_refreshed: null,
  };
}

export function filterTopologyData(
  data: TopologyResponse,
  filters: TopologyFilters,
): TopologyResponse {
  if (!hasActiveFilters(filters)) return data;

  let vpcs = data.vpcs;

  // Filter by VPC first
  if (filters.vpcId) {
    vpcs = vpcs.filter((v) => v.id === filters.vpcId);
  }

  // Filter subnets and resources within each VPC
  vpcs = vpcs
    .map((vpc) => {
      const filteredSubnets = filterSubnets(vpc.subnets, filters);

      // Filter IGW
      let igw = vpc.internet_gateway;
      if (
        igw &&
        filters.resourceTypes.length > 0 &&
        !filters.resourceTypes.includes("igw")
      ) {
        igw = null;
      }
      if (igw && !matchesTfManaged(igw.tf_managed, filters.tfManaged)) {
        igw = null;
      }
      if (igw && filters.status && igw.display_status !== filters.status) {
        igw = null;
      }
      if (
        igw &&
        filters.search &&
        !matchesSearch(filters.search, igw.name, igw.id)
      ) {
        // Keep IGW if any public subnet survived filtering
        const hasPublicSubnets = filteredSubnets.some(
          (s) => s.subnet_type === "public",
        );
        if (!hasPublicSubnets) igw = null;
      }

      // Filter Elastic IPs
      let eips = vpc.elastic_ips || [];
      if (
        filters.resourceTypes.length > 0 &&
        !filters.resourceTypes.includes("eip")
      ) {
        eips = [];
      }
      if (filters.tfManaged) {
        eips = eips.filter((eip) =>
          matchesTfManaged(eip.tf_managed, filters.tfManaged),
        );
      }

      return {
        ...vpc,
        internet_gateway: igw,
        subnets: filteredSubnets,
        elastic_ips: eips,
      };
    })
    .filter((vpc) => {
      // Always show VPC if it matches search directly
      if (
        filters.search &&
        matchesSearch(filters.search, vpc.name, vpc.id, vpc.cidr_block)
      )
        return true;

      // If tfManaged filter is active, only keep VPC if it matches OR has surviving children
      if (
        filters.tfManaged &&
        !matchesTfManaged(vpc.tf_managed, filters.tfManaged)
      ) {
        return vpc.subnets.length > 0 || vpc.internet_gateway !== null;
      }

      // Keep VPC if it has any surviving children
      return vpc.subnets.length > 0 || vpc.internet_gateway !== null;
    });

  return {
    vpcs,
    meta: computeFilteredMeta(vpcs),
  };
}

export { EMPTY_FILTERS };
