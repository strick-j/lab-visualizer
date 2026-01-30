/**
 * Layout calculator for infrastructure topology visualization.
 *
 * Calculates positions for nodes in a hierarchical layout:
 * VPC -> Subnets (public/private rows) -> Resources (EC2, RDS, Gateways)
 */

import type { Node, Edge } from 'reactflow';
import type {
  TopologyResponse,
  TopologyVPC,
  TopologySubnet,
  TopologyEC2Instance,
  TopologyRDSInstance,
  TopologyNATGateway,
  TopologyNodeData,
  VPCNodeData,
  SubnetNodeData,
  EC2NodeData,
  RDSNodeData,
  InternetGatewayNodeData,
  NATGatewayNodeData,
} from '@/types/topology';

type ResourceItem =
  | { type: 'ec2'; data: TopologyEC2Instance }
  | { type: 'rds'; data: TopologyRDSInstance }
  | { type: 'nat'; data: TopologyNATGateway };

const config = {
  vpcPadding: 50,
  subnetPadding: 20,
  nodeWidth: {
    vpc: 800,
    subnet: 320,
    resource: 180,
    gateway: 150,
  },
  nodeHeight: {
    vpc: 500,
    subnet: 180,
    resource: 90,
    gateway: 70,
  },
  spacing: {
    horizontal: 20,
    vertical: 30,
    subnetGap: 30,
    vpcGap: 60,
  },
};

interface LayoutResult {
  nodes: Node<TopologyNodeData>[];
  edges: Edge[];
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

function layoutVPC(vpc: TopologyVPC, startX: number): LayoutResult & { width: number; height: number } {
  const nodes: Node<TopologyNodeData>[] = [];
  const edges: Edge[] = [];

  // Separate subnets by type
  const publicSubnets = vpc.subnets.filter((s) => s.subnet_type === 'public');
  const privateSubnets = vpc.subnets.filter((s) => s.subnet_type === 'private');
  const unknownSubnets = vpc.subnets.filter((s) => s.subnet_type === 'unknown');

  // Calculate subnet layouts
  let currentY = config.vpcPadding + 60; // Space for VPC header + IGW
  let maxWidth = 0;

  // Internet Gateway at top
  if (vpc.internet_gateway) {
    const igwId = `igw-${vpc.internet_gateway.id}`;
    nodes.push({
      id: igwId,
      type: 'internet-gateway',
      position: { x: startX + config.vpcPadding, y: currentY },
      data: {
        type: 'internet-gateway',
        label: vpc.internet_gateway.name || 'Internet Gateway',
        displayStatus: vpc.internet_gateway.display_status,
        tfManaged: vpc.internet_gateway.tf_managed,
        tfResourceAddress: vpc.internet_gateway.tf_resource_address || undefined,
        igwId: vpc.internet_gateway.id,
      } as InternetGatewayNodeData,
    });
    currentY += config.nodeHeight.gateway + config.spacing.vertical;
  }

  // Layout public subnets in a row
  if (publicSubnets.length > 0) {
    const publicLayout = layoutSubnetRow(publicSubnets, startX + config.vpcPadding, currentY, vpc.id);
    nodes.push(...publicLayout.nodes);
    edges.push(...publicLayout.edges);
    maxWidth = Math.max(maxWidth, publicLayout.width);
    currentY += publicLayout.height + config.spacing.subnetGap;
  }

  // Layout private subnets in a row
  if (privateSubnets.length > 0) {
    const privateLayout = layoutSubnetRow(privateSubnets, startX + config.vpcPadding, currentY, vpc.id);
    nodes.push(...privateLayout.nodes);
    edges.push(...privateLayout.edges);
    maxWidth = Math.max(maxWidth, privateLayout.width);
    currentY += privateLayout.height + config.spacing.subnetGap;
  }

  // Layout unknown subnets if any
  if (unknownSubnets.length > 0) {
    const unknownLayout = layoutSubnetRow(unknownSubnets, startX + config.vpcPadding, currentY, vpc.id);
    nodes.push(...unknownLayout.nodes);
    edges.push(...unknownLayout.edges);
    maxWidth = Math.max(maxWidth, unknownLayout.width);
    currentY += unknownLayout.height + config.spacing.subnetGap;
  }

  // Calculate VPC dimensions
  const vpcWidth = Math.max(maxWidth + config.vpcPadding * 2, config.nodeWidth.vpc);
  const vpcHeight = currentY - config.spacing.subnetGap + config.vpcPadding;

  // Create VPC node
  const vpcNodeId = `vpc-${vpc.id}`;
  nodes.unshift({
    id: vpcNodeId,
    type: 'vpc',
    position: { x: startX, y: 0 },
    data: {
      type: 'vpc',
      label: vpc.name || 'VPC',
      displayStatus: vpc.display_status,
      tfManaged: vpc.tf_managed,
      tfResourceAddress: vpc.tf_resource_address || undefined,
      vpcId: vpc.id,
      cidrBlock: vpc.cidr_block,
    } as VPCNodeData,
    style: {
      width: vpcWidth,
      height: vpcHeight,
    },
  });

  return { nodes, edges, width: vpcWidth, height: vpcHeight };
}

function layoutSubnetRow(
  subnets: TopologySubnet[],
  startX: number,
  startY: number,
  vpcId: string
): LayoutResult & { width: number; height: number } {
  const nodes: Node<TopologyNodeData>[] = [];
  const edges: Edge[] = [];

  let currentX = startX;
  let maxHeight = 0;

  for (const subnet of subnets) {
    const subnetLayout = layoutSubnet(subnet, currentX, startY, vpcId);
    nodes.push(...subnetLayout.nodes);
    edges.push(...subnetLayout.edges);

    currentX += subnetLayout.width + config.spacing.horizontal;
    maxHeight = Math.max(maxHeight, subnetLayout.height);
  }

  const totalWidth = currentX - startX - config.spacing.horizontal;

  return { nodes, edges, width: totalWidth, height: maxHeight };
}

function layoutSubnet(
  subnet: TopologySubnet,
  startX: number,
  startY: number,
  _vpcId: string
): LayoutResult & { width: number; height: number } {
  const nodes: Node<TopologyNodeData>[] = [];
  const edges: Edge[] = [];

  // Calculate resources in this subnet
  const resources: ResourceItem[] = [
    ...subnet.ec2_instances.map((ec2): ResourceItem => ({ type: 'ec2', data: ec2 })),
    ...subnet.rds_instances.map((rds): ResourceItem => ({ type: 'rds', data: rds })),
  ];

  // Add NAT Gateway if present
  if (subnet.nat_gateway) {
    resources.unshift({ type: 'nat', data: subnet.nat_gateway });
  }

  // Calculate subnet dimensions based on resources
  const resourcesPerRow = 2;
  const numRows = Math.ceil(resources.length / resourcesPerRow) || 1;
  const numCols = Math.min(resources.length, resourcesPerRow) || 1;

  const subnetWidth = Math.max(
    numCols * (config.nodeWidth.resource + config.spacing.horizontal) - config.spacing.horizontal + config.subnetPadding * 2,
    config.nodeWidth.subnet
  );
  const subnetHeight = Math.max(
    numRows * (config.nodeHeight.resource + config.spacing.vertical) - config.spacing.vertical + config.subnetPadding * 2 + 50,
    config.nodeHeight.subnet
  );

  // Create subnet node
  const subnetNodeId = `subnet-${subnet.id}`;
  nodes.push({
    id: subnetNodeId,
    type: 'subnet',
    position: { x: startX, y: startY },
    data: {
      type: 'subnet',
      label: subnet.name || 'Subnet',
      displayStatus: subnet.display_status,
      tfManaged: subnet.tf_managed,
      tfResourceAddress: subnet.tf_resource_address || undefined,
      subnetId: subnet.id,
      cidrBlock: subnet.cidr_block,
      subnetType: subnet.subnet_type,
      availabilityZone: subnet.availability_zone,
    } as SubnetNodeData,
    style: {
      width: subnetWidth,
      height: subnetHeight,
    },
  });

  // Layout resources inside subnet
  let resourceX = startX + config.subnetPadding;
  let resourceY = startY + config.subnetPadding + 50; // Space for subnet header

  resources.forEach((resource, index) => {
    const col = index % resourcesPerRow;
    const row = Math.floor(index / resourcesPerRow);

    const x = resourceX + col * (config.nodeWidth.resource + config.spacing.horizontal);
    const y = resourceY + row * (config.nodeHeight.resource + config.spacing.vertical);

    if (resource.type === 'ec2') {
      const ec2 = resource.data;
      nodes.push({
        id: `ec2-${ec2.id}`,
        type: 'ec2',
        position: { x, y },
        data: {
          type: 'ec2',
          label: ec2.name || ec2.id,
          displayStatus: ec2.display_status,
          tfManaged: ec2.tf_managed,
          tfResourceAddress: ec2.tf_resource_address || undefined,
          instanceId: ec2.id,
          instanceType: ec2.instance_type,
          privateIp: ec2.private_ip || undefined,
          publicIp: ec2.public_ip || undefined,
          state: ec2.state,
        } as EC2NodeData,
      });
    } else if (resource.type === 'rds') {
      const rds = resource.data;
      nodes.push({
        id: `rds-${rds.id}`,
        type: 'rds',
        position: { x, y },
        data: {
          type: 'rds',
          label: rds.name || rds.id,
          displayStatus: rds.display_status,
          tfManaged: rds.tf_managed,
          tfResourceAddress: rds.tf_resource_address || undefined,
          dbIdentifier: rds.id,
          engine: rds.engine,
          instanceClass: rds.instance_class,
          status: rds.status,
        } as RDSNodeData,
      });
    } else if (resource.type === 'nat') {
      const nat = resource.data;
      nodes.push({
        id: `nat-${nat.id}`,
        type: 'nat-gateway',
        position: { x, y },
        data: {
          type: 'nat-gateway',
          label: nat.name || 'NAT Gateway',
          displayStatus: nat.display_status,
          tfManaged: nat.tf_managed,
          tfResourceAddress: nat.tf_resource_address || undefined,
          natGatewayId: nat.id,
          publicIp: nat.primary_public_ip || undefined,
        } as NATGatewayNodeData,
      });
    }
  });

  return { nodes, edges, width: subnetWidth, height: subnetHeight };
}

export function createEdges(data: TopologyResponse): Edge[] {
  const edges: Edge[] = [];

  // Create edges for IGW -> public subnets
  for (const vpc of data.vpcs) {
    if (vpc.internet_gateway) {
      const publicSubnets = vpc.subnets.filter((s) => s.subnet_type === 'public');
      for (const subnet of publicSubnets) {
        edges.push({
          id: `edge-igw-${vpc.internet_gateway.id}-subnet-${subnet.id}`,
          source: `igw-${vpc.internet_gateway.id}`,
          target: `subnet-${subnet.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        });
      }
    }

    // Create edges for NAT Gateway -> private subnets (conceptual routing)
    const publicSubnetsWithNat = vpc.subnets.filter((s) => s.subnet_type === 'public' && s.nat_gateway);
    const privateSubnets = vpc.subnets.filter((s) => s.subnet_type === 'private');

    for (const publicSubnet of publicSubnetsWithNat) {
      if (publicSubnet.nat_gateway) {
        for (const privateSubnet of privateSubnets) {
          edges.push({
            id: `edge-nat-${publicSubnet.nat_gateway.id}-subnet-${privateSubnet.id}`,
            source: `nat-${publicSubnet.nat_gateway.id}`,
            target: `subnet-${privateSubnet.id}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#a78bfa', strokeWidth: 2, strokeDasharray: '5,5' },
          });
        }
      }
    }
  }

  return edges;
}
