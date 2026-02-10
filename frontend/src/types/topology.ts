/**
 * Topology visualization types.
 *
 * Types for the infrastructure topology API and React Flow visualization.
 */

import type { DisplayStatus, ManagedBy } from "./resources";

// =============================================================================
// API Response Types
// =============================================================================

export interface TopologyEC2Instance {
  id: string;
  name: string | null;
  instance_type: string;
  state: string;
  display_status: DisplayStatus;
  private_ip: string | null;
  public_ip: string | null;
  private_dns: string | null;
  public_dns: string | null;
  tf_managed: boolean;
  tf_resource_address: string | null;
}

export interface TopologyRDSInstance {
  id: string;
  name: string | null;
  engine: string;
  instance_class: string;
  status: string;
  display_status: DisplayStatus;
  endpoint: string | null;
  port: number | null;
  tf_managed: boolean;
  tf_resource_address: string | null;
}

export interface TopologyNATGateway {
  id: string;
  name: string | null;
  state: string;
  display_status: DisplayStatus;
  primary_public_ip: string | null;
  tf_managed: boolean;
  tf_resource_address: string | null;
}

export interface TopologyInternetGateway {
  id: string;
  name: string | null;
  state: string;
  display_status: DisplayStatus;
  tf_managed: boolean;
  tf_resource_address: string | null;
}

export interface TopologyElasticIP {
  id: string;
  public_ip: string;
  associated_with: string | null;
  association_type: "ec2" | "nat_gateway" | "eni" | null;
  tf_managed: boolean;
  tf_resource_address: string | null;
}

export interface TopologyECSContainer {
  id: string;
  name: string | null;
  cluster_name: string;
  launch_type: string;
  status: string;
  display_status: DisplayStatus;
  cpu: number;
  memory: number;
  image: string | null;
  image_tag: string | null;
  container_port: number | null;
  private_ip: string | null;
  tf_managed: boolean;
  tf_resource_address: string | null;
  managed_by: ManagedBy;
}

export interface TopologySubnet {
  id: string;
  name: string | null;
  cidr_block: string;
  availability_zone: string;
  subnet_type: "public" | "private" | "unknown";
  display_status: DisplayStatus;
  tf_managed: boolean;
  tf_resource_address: string | null;
  nat_gateway: TopologyNATGateway | null;
  ec2_instances: TopologyEC2Instance[];
  rds_instances: TopologyRDSInstance[];
  ecs_containers: TopologyECSContainer[];
}

export interface TopologyVPC {
  id: string;
  name: string | null;
  cidr_block: string;
  state: string;
  display_status: DisplayStatus;
  tf_managed: boolean;
  tf_resource_address: string | null;
  internet_gateway: TopologyInternetGateway | null;
  subnets: TopologySubnet[];
  elastic_ips: TopologyElasticIP[];
}

export interface TopologyMeta {
  total_vpcs: number;
  total_subnets: number;
  total_ec2: number;
  total_rds: number;
  total_ecs_containers: number;
  total_nat_gateways: number;
  total_internet_gateways: number;
  total_elastic_ips: number;
  last_refreshed: string | null;
}

export interface TopologyResponse {
  vpcs: TopologyVPC[];
  meta: TopologyMeta;
}

// =============================================================================
// React Flow Node Types
// =============================================================================

export type TopologyNodeType =
  | "vpc"
  | "subnet"
  | "ec2"
  | "rds"
  | "ecs-container"
  | "nat-gateway"
  | "internet-gateway";

interface BaseNodeData {
  label: string;
  displayStatus: DisplayStatus;
  tfManaged: boolean;
  tfResourceAddress?: string;
}

export interface VPCNodeData extends BaseNodeData {
  type: "vpc";
  vpcId: string;
  cidrBlock: string;
  minWidth?: number;
  minHeight?: number;
}

export interface SubnetNodeData extends BaseNodeData {
  type: "subnet";
  subnetId: string;
  cidrBlock: string;
  subnetType: "public" | "private" | "unknown";
  availabilityZone: string;
  minWidth?: number;
  minHeight?: number;
}

export interface EC2NodeData extends BaseNodeData {
  type: "ec2";
  instanceId: string;
  instanceType: string;
  privateIp?: string;
  publicIp?: string;
  privateDns?: string;
  publicDns?: string;
  state: string;
}

export interface RDSNodeData extends BaseNodeData {
  type: "rds";
  dbIdentifier: string;
  engine: string;
  instanceClass: string;
  status: string;
  endpoint?: string;
  port?: number;
}

export interface NATGatewayNodeData extends BaseNodeData {
  type: "nat-gateway";
  natGatewayId: string;
  publicIp?: string;
}

export interface InternetGatewayNodeData extends BaseNodeData {
  type: "internet-gateway";
  igwId: string;
}

export interface ECSContainerNodeData extends BaseNodeData {
  type: "ecs-container";
  taskId: string;
  clusterName: string;
  launchType: string;
  cpu: number;
  memory: number;
  status: string;
  image?: string;
  imageTag?: string;
  containerPort?: number;
  privateIp?: string;
  managedBy: ManagedBy;
}

export type TopologyNodeData =
  | VPCNodeData
  | SubnetNodeData
  | EC2NodeData
  | RDSNodeData
  | ECSContainerNodeData
  | NATGatewayNodeData
  | InternetGatewayNodeData;

// =============================================================================
// React Flow Edge Types
// =============================================================================

export type TopologyEdgeType = "contains" | "routes-to" | "associated-with";

// =============================================================================
// Topology Filter Types
// =============================================================================

export interface TopologyFilters {
  search: string;
  vpcId: string;
  subnetType: "" | "public" | "private" | "unknown";
  status: "" | DisplayStatus;
}

// =============================================================================
// Layout Configuration
// =============================================================================

export interface LayoutConfig {
  vpcPadding: number;
  subnetPadding: number;
  nodeWidth: {
    vpc: number;
    subnet: number;
    resource: number;
    gateway: number;
  };
  nodeHeight: {
    vpc: number;
    subnet: number;
    resource: number;
    gateway: number;
  };
  spacing: {
    horizontal: number;
    vertical: number;
    subnetGap: number;
  };
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  vpcPadding: 40,
  subnetPadding: 20,
  nodeWidth: {
    vpc: 800,
    subnet: 350,
    resource: 180,
    gateway: 120,
  },
  nodeHeight: {
    vpc: 600,
    subnet: 200,
    resource: 80,
    gateway: 60,
  },
  spacing: {
    horizontal: 20,
    vertical: 30,
    subnetGap: 40,
  },
};
