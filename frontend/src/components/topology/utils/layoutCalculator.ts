/**
 * Layout calculator for infrastructure topology visualization.
 *
 * Uses React Flow's parentNode feature for proper nested containers.
 * Layer hierarchy (bottom to top):
 * - Layer 1: VPC (z-index 0)
 * - Layer 2: Subnet (z-index 1)
 * - Layer 3: Resources - EC2, RDS, Gateways (z-index 2)
 */

import type { Node, Edge } from "reactflow";
import type {
  TopologyResponse,
  TopologyVPC,
  TopologySubnet,
  TopologyEC2Instance,
  TopologyRDSInstance,
  TopologyECSContainer,
  TopologyNATGateway,
  TopologyNodeData,
  VPCNodeData,
  SubnetNodeData,
  EC2NodeData,
  RDSNodeData,
  ECSContainerNodeData,
  InternetGatewayNodeData,
  NATGatewayNodeData,
} from "@/types/topology";

type ResourceItem =
  | { type: "ec2"; data: TopologyEC2Instance }
  | { type: "rds"; data: TopologyRDSInstance }
  | { type: "ecs"; data: TopologyECSContainer }
  | { type: "nat"; data: TopologyNATGateway };

// Z-index layers
const Z_INDEX = {
  VPC: 0,
  SUBNET: 1,
  GATEWAY: 2,
  RESOURCE: 2,
};

const config = {
  vpcPadding: 30,
  vpcHeaderHeight: 45,
  subnetPadding: 20,
  subnetHeaderHeight: 50,
  nodeWidth: {
    resource: 170,
    gateway: 140,
  },
  nodeHeight: {
    // EC2/RDS nodes: icon row + type + IP + TF badge + padding ≈ 105px
    resource: 105,
    gateway: 60,
  },
  spacing: {
    horizontal: 15,
    vertical: 20,
    subnetGap: 20,
    rowGap: 25,
    vpcGap: 50,
  },
  resourcesPerRow: 2,
};

interface LayoutResult {
  nodes: Node<TopologyNodeData>[];
  edges: Edge[];
}

interface SubnetDimensions {
  width: number;
  height: number;
}

/**
 * Calculate the required dimensions for a subnet based on its resources
 */
function calculateSubnetDimensions(subnet: TopologySubnet): SubnetDimensions {
  const resourceCount =
    subnet.ec2_instances.length +
    subnet.rds_instances.length +
    (subnet.ecs_containers?.length || 0) +
    (subnet.nat_gateway ? 1 : 0);

  if (resourceCount === 0) {
    return {
      width: 280,
      height: config.subnetHeaderHeight + config.subnetPadding * 2 + 20,
    };
  }

  const numRows = Math.ceil(resourceCount / config.resourcesPerRow);
  const numCols = Math.min(resourceCount, config.resourcesPerRow);

  const contentWidth =
    numCols * config.nodeWidth.resource +
    (numCols - 1) * config.spacing.horizontal;
  const contentHeight =
    numRows * config.nodeHeight.resource +
    (numRows - 1) * config.spacing.vertical;

  return {
    width: contentWidth + config.subnetPadding * 2,
    height:
      config.subnetHeaderHeight + contentHeight + config.subnetPadding * 2,
  };
}

/**
 * Calculate the layout for a row of subnets
 */
function calculateSubnetRowDimensions(subnets: TopologySubnet[]): {
  width: number;
  height: number;
  subnetWidths: number[];
} {
  if (subnets.length === 0) {
    return { width: 0, height: 0, subnetWidths: [] };
  }

  let totalWidth = 0;
  let maxHeight = 0;
  const subnetWidths: number[] = [];

  for (const subnet of subnets) {
    const dims = calculateSubnetDimensions(subnet);
    subnetWidths.push(dims.width);
    totalWidth += dims.width;
    maxHeight = Math.max(maxHeight, dims.height);
  }

  totalWidth += (subnets.length - 1) * config.spacing.horizontal;

  return { width: totalWidth, height: maxHeight, subnetWidths };
}

export function calculateTopologyLayout(data: TopologyResponse): LayoutResult {
  const nodes: Node<TopologyNodeData>[] = [];
  const edges: Edge[] = [];

  let vpcX = 0;

  for (const vpc of data.vpcs) {
    const vpcLayout = layoutVPC(vpc, vpcX);
    nodes.push(...vpcLayout.nodes);
    edges.push(...vpcLayout.edges);

    vpcX += vpcLayout.width + config.spacing.vpcGap;
  }

  return { nodes, edges };
}

function layoutVPC(
  vpc: TopologyVPC,
  startX: number,
): LayoutResult & { width: number; height: number } {
  const nodes: Node<TopologyNodeData>[] = [];
  const edges: Edge[] = [];

  const vpcNodeId = `vpc-${vpc.id}`;

  // Separate subnets by type
  const publicSubnets = vpc.subnets.filter((s) => s.subnet_type === "public");
  const privateSubnets = vpc.subnets.filter((s) => s.subnet_type === "private");
  const unknownSubnets = vpc.subnets.filter((s) => s.subnet_type === "unknown");

  // Calculate dimensions for each row
  const publicDims = calculateSubnetRowDimensions(publicSubnets);
  const privateDims = calculateSubnetRowDimensions(privateSubnets);
  const unknownDims = calculateSubnetRowDimensions(unknownSubnets);

  // Calculate total VPC dimensions
  const contentWidth = Math.max(
    publicDims.width,
    privateDims.width,
    unknownDims.width,
    350,
  );
  const vpcWidth = contentWidth + config.vpcPadding * 2;

  // Calculate heights
  let contentHeight = 0;

  // IGW height
  if (vpc.internet_gateway) {
    contentHeight += config.nodeHeight.gateway + config.spacing.vertical;
  }

  // Public subnets row
  if (publicSubnets.length > 0) {
    contentHeight += publicDims.height + config.spacing.rowGap;
  }

  // Private subnets row
  if (privateSubnets.length > 0) {
    contentHeight += privateDims.height + config.spacing.rowGap;
  }

  // Unknown subnets row
  if (unknownSubnets.length > 0) {
    contentHeight += unknownDims.height + config.spacing.rowGap;
  }

  // Remove last row gap and add padding
  if (contentHeight > 0) {
    contentHeight -= config.spacing.rowGap;
  }

  const vpcHeight =
    config.vpcHeaderHeight + contentHeight + config.vpcPadding * 2;

  // Create VPC node (Layer 1 - bottom)
  nodes.push({
    id: vpcNodeId,
    type: "vpc",
    position: { x: startX, y: 0 },
    zIndex: Z_INDEX.VPC,
    data: {
      type: "vpc",
      label: vpc.name || "VPC",
      displayStatus: vpc.display_status,
      tfManaged: vpc.tf_managed,
      tfResourceAddress: vpc.tf_resource_address || undefined,
      vpcId: vpc.id,
      cidrBlock: vpc.cidr_block,
      minWidth: vpcWidth,
      minHeight: vpcHeight,
    } as VPCNodeData,
    style: {
      width: vpcWidth,
      height: vpcHeight,
    },
  });

  // Track Y position relative to VPC content area
  let relativeY = config.vpcHeaderHeight + config.vpcPadding;

  // Internet Gateway at top (child of VPC)
  if (vpc.internet_gateway) {
    nodes.push({
      id: `igw-${vpc.internet_gateway.id}`,
      type: "internet-gateway",
      position: { x: config.vpcPadding, y: relativeY },
      parentNode: vpcNodeId,
      extent: "parent",
      zIndex: Z_INDEX.GATEWAY,
      data: {
        type: "internet-gateway",
        label: vpc.internet_gateway.name || "Internet Gateway",
        displayStatus: vpc.internet_gateway.display_status,
        tfManaged: vpc.internet_gateway.tf_managed,
        tfResourceAddress:
          vpc.internet_gateway.tf_resource_address || undefined,
        igwId: vpc.internet_gateway.id,
      } as InternetGatewayNodeData,
    });
    relativeY += config.nodeHeight.gateway + config.spacing.vertical;
  }

  // Layout public subnets (children of VPC)
  if (publicSubnets.length > 0) {
    const rowStartX = config.vpcPadding + (contentWidth - publicDims.width) / 2;
    let subnetX = rowStartX;

    publicSubnets.forEach((subnet, idx) => {
      const subnetDims = calculateSubnetDimensions(subnet);
      const subnetLayout = layoutSubnet(
        subnet,
        subnetX,
        relativeY,
        subnetDims,
        publicDims.height,
        vpcNodeId,
      );
      nodes.push(...subnetLayout.nodes);
      edges.push(...subnetLayout.edges);
      subnetX += publicDims.subnetWidths[idx] + config.spacing.horizontal;
    });

    relativeY += publicDims.height + config.spacing.rowGap;
  }

  // Layout private subnets (children of VPC)
  if (privateSubnets.length > 0) {
    const rowStartX =
      config.vpcPadding + (contentWidth - privateDims.width) / 2;
    let subnetX = rowStartX;

    privateSubnets.forEach((subnet, idx) => {
      const subnetDims = calculateSubnetDimensions(subnet);
      const subnetLayout = layoutSubnet(
        subnet,
        subnetX,
        relativeY,
        subnetDims,
        privateDims.height,
        vpcNodeId,
      );
      nodes.push(...subnetLayout.nodes);
      edges.push(...subnetLayout.edges);
      subnetX += privateDims.subnetWidths[idx] + config.spacing.horizontal;
    });

    relativeY += privateDims.height + config.spacing.rowGap;
  }

  // Layout unknown subnets (children of VPC)
  if (unknownSubnets.length > 0) {
    const rowStartX =
      config.vpcPadding + (contentWidth - unknownDims.width) / 2;
    let subnetX = rowStartX;

    unknownSubnets.forEach((subnet, idx) => {
      const subnetDims = calculateSubnetDimensions(subnet);
      const subnetLayout = layoutSubnet(
        subnet,
        subnetX,
        relativeY,
        subnetDims,
        unknownDims.height,
        vpcNodeId,
      );
      nodes.push(...subnetLayout.nodes);
      edges.push(...subnetLayout.edges);
      subnetX += unknownDims.subnetWidths[idx] + config.spacing.horizontal;
    });
  }

  return { nodes, edges, width: vpcWidth, height: vpcHeight };
}

function layoutSubnet(
  subnet: TopologySubnet,
  relativeX: number,
  relativeY: number,
  dims: SubnetDimensions,
  rowHeight: number,
  vpcNodeId: string,
): LayoutResult {
  const nodes: Node<TopologyNodeData>[] = [];
  const edges: Edge[] = [];

  const subnetNodeId = `subnet-${subnet.id}`;
  const subnetHeight = rowHeight;

  // Create subnet node (Layer 2 - child of VPC)
  nodes.push({
    id: subnetNodeId,
    type: "subnet",
    position: { x: relativeX, y: relativeY },
    parentNode: vpcNodeId,
    extent: "parent",
    zIndex: Z_INDEX.SUBNET,
    data: {
      type: "subnet",
      label: subnet.name || "Subnet",
      displayStatus: subnet.display_status,
      tfManaged: subnet.tf_managed,
      tfResourceAddress: subnet.tf_resource_address || undefined,
      subnetId: subnet.id,
      cidrBlock: subnet.cidr_block,
      subnetType: subnet.subnet_type,
      availabilityZone: subnet.availability_zone,
      minWidth: dims.width,
      minHeight: subnetHeight,
    } as SubnetNodeData,
    style: {
      width: dims.width,
      height: subnetHeight,
    },
  });

  // Collect all resources
  const resources: ResourceItem[] = [];

  // Add NAT Gateway first if present
  if (subnet.nat_gateway) {
    resources.push({ type: "nat", data: subnet.nat_gateway });
  }

  // Add EC2 instances
  subnet.ec2_instances.forEach((ec2) => {
    resources.push({ type: "ec2", data: ec2 });
  });

  // Add RDS instances
  subnet.rds_instances.forEach((rds) => {
    resources.push({ type: "rds", data: rds });
  });

  // Add ECS containers
  if (subnet.ecs_containers) {
    subnet.ecs_containers.forEach((ecs) => {
      resources.push({ type: "ecs", data: ecs });
    });
  }

  // Layout resources inside subnet (Layer 3 - children of subnet)
  // Positions are relative to the subnet node
  // Add subnetPadding to both X and Y for proper spacing from container edges
  const resourceStartX = config.subnetPadding;
  const resourceStartY = config.subnetHeaderHeight + config.subnetPadding;

  resources.forEach((resource, index) => {
    const col = index % config.resourcesPerRow;
    const row = Math.floor(index / config.resourcesPerRow);

    const x =
      resourceStartX +
      col * (config.nodeWidth.resource + config.spacing.horizontal);
    const y =
      resourceStartY +
      row * (config.nodeHeight.resource + config.spacing.vertical);

    if (resource.type === "ec2") {
      const ec2 = resource.data;
      nodes.push({
        id: `ec2-${ec2.id}`,
        type: "ec2",
        position: { x, y },
        parentNode: subnetNodeId,
        extent: "parent",
        zIndex: Z_INDEX.RESOURCE,
        data: {
          type: "ec2",
          label: ec2.name || ec2.id,
          displayStatus: ec2.display_status,
          tfManaged: ec2.tf_managed,
          tfResourceAddress: ec2.tf_resource_address || undefined,
          instanceId: ec2.id,
          instanceType: ec2.instance_type,
          privateIp: ec2.private_ip || undefined,
          publicIp: ec2.public_ip || undefined,
          privateDns: ec2.private_dns || undefined,
          publicDns: ec2.public_dns || undefined,
          state: ec2.state,
        } as EC2NodeData,
      });
    } else if (resource.type === "rds") {
      const rds = resource.data;
      nodes.push({
        id: `rds-${rds.id}`,
        type: "rds",
        position: { x, y },
        parentNode: subnetNodeId,
        extent: "parent",
        zIndex: Z_INDEX.RESOURCE,
        data: {
          type: "rds",
          label: rds.name || rds.id,
          displayStatus: rds.display_status,
          tfManaged: rds.tf_managed,
          tfResourceAddress: rds.tf_resource_address || undefined,
          dbIdentifier: rds.id,
          engine: rds.engine,
          instanceClass: rds.instance_class,
          status: rds.status,
          endpoint: rds.endpoint || undefined,
          port: rds.port || undefined,
        } as RDSNodeData,
      });
    } else if (resource.type === "ecs") {
      const ecs = resource.data;
      nodes.push({
        id: `ecs-${ecs.id}`,
        type: "ecs-container",
        position: { x, y },
        parentNode: subnetNodeId,
        extent: "parent",
        zIndex: Z_INDEX.RESOURCE,
        data: {
          type: "ecs-container",
          label: ecs.name || ecs.id,
          displayStatus: ecs.display_status,
          tfManaged: ecs.tf_managed,
          tfResourceAddress: ecs.tf_resource_address || undefined,
          taskId: ecs.id,
          clusterName: ecs.cluster_name,
          launchType: ecs.launch_type,
          cpu: ecs.cpu,
          memory: ecs.memory,
          status: ecs.status,
          image: ecs.image || undefined,
          imageTag: ecs.image_tag || undefined,
          containerPort: ecs.container_port || undefined,
          privateIp: ecs.private_ip || undefined,
          managedBy: ecs.managed_by || "unmanaged",
        } as ECSContainerNodeData,
      });
    } else if (resource.type === "nat") {
      const nat = resource.data;
      nodes.push({
        id: `nat-${nat.id}`,
        type: "nat-gateway",
        position: { x, y },
        parentNode: subnetNodeId,
        extent: "parent",
        zIndex: Z_INDEX.RESOURCE,
        data: {
          type: "nat-gateway",
          label: nat.name || "NAT Gateway",
          displayStatus: nat.display_status,
          tfManaged: nat.tf_managed,
          tfResourceAddress: nat.tf_resource_address || undefined,
          natGatewayId: nat.id,
          publicIp: nat.primary_public_ip || undefined,
        } as NATGatewayNodeData,
      });
    }
  });

  return { nodes, edges };
}

export function createEdges(data: TopologyResponse): Edge[] {
  const edges: Edge[] = [];

  for (const vpc of data.vpcs) {
    // Create edges for IGW -> public subnets
    if (vpc.internet_gateway) {
      const publicSubnets = vpc.subnets.filter(
        (s) => s.subnet_type === "public",
      );
      for (const subnet of publicSubnets) {
        edges.push({
          id: `edge-igw-${vpc.internet_gateway.id}-subnet-${subnet.id}`,
          source: `igw-${vpc.internet_gateway.id}`,
          target: `subnet-${subnet.id}`,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
          zIndex: 10,
        });
      }
    }

    // Create edges for NAT Gateway -> private subnets
    const publicSubnetsWithNat = vpc.subnets.filter(
      (s) => s.subnet_type === "public" && s.nat_gateway,
    );
    const privateSubnets = vpc.subnets.filter(
      (s) => s.subnet_type === "private",
    );

    for (const publicSubnet of publicSubnetsWithNat) {
      if (publicSubnet.nat_gateway) {
        for (const privateSubnet of privateSubnets) {
          edges.push({
            id: `edge-nat-${publicSubnet.nat_gateway.id}-subnet-${privateSubnet.id}`,
            source: `nat-${publicSubnet.nat_gateway.id}`,
            target: `subnet-${privateSubnet.id}`,
            type: "smoothstep",
            animated: true,
            style: {
              stroke: "#a78bfa",
              strokeWidth: 2,
              strokeDasharray: "5,5",
            },
            zIndex: 10,
          });
        }
      }
    }
  }

  return edges;
}
