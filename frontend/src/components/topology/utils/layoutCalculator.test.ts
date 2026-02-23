import { describe, it, expect } from "vitest";
import { calculateTopologyLayout, createEdges } from "./layoutCalculator";
import type {
  TopologyResponse,
  TopologyVPC,
  TopologySubnet,
} from "@/types/topology";

// =============================================================================
// Helpers
// =============================================================================

function makeSubnet(overrides: Partial<TopologySubnet> = {}): TopologySubnet {
  return {
    id: "subnet-1",
    name: "Test Subnet",
    cidr_block: "10.0.1.0/24",
    availability_zone: "us-east-1a",
    subnet_type: "public",
    display_status: "active",
    tf_managed: false,
    tf_resource_address: null,
    nat_gateway: null,
    ec2_instances: [],
    rds_instances: [],
    ecs_containers: [],
    ...overrides,
  };
}

function makeVPC(overrides: Partial<TopologyVPC> = {}): TopologyVPC {
  return {
    id: "vpc-1",
    name: "Test VPC",
    cidr_block: "10.0.0.0/16",
    state: "available",
    display_status: "active",
    tf_managed: false,
    tf_resource_address: null,
    internet_gateway: null,
    subnets: [],
    elastic_ips: [],
    ...overrides,
  };
}

function makeResponse(vpcs: TopologyVPC[]): TopologyResponse {
  return {
    vpcs,
    meta: {
      total_vpcs: vpcs.length,
      total_subnets: 0,
      total_ec2: 0,
      total_rds: 0,
      total_ecs_containers: 0,
      total_nat_gateways: 0,
      total_internet_gateways: 0,
      total_elastic_ips: 0,
      last_refreshed: null,
    },
  };
}

// =============================================================================
// calculateTopologyLayout
// =============================================================================

describe("calculateTopologyLayout", () => {
  it("returns empty nodes and edges for empty VPC array", () => {
    const result = calculateTopologyLayout(makeResponse([]));
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("creates VPC node for a single VPC with no subnets", () => {
    const result = calculateTopologyLayout(
      makeResponse([makeVPC({ id: "vpc-1", name: "My VPC" })]),
    );
    const vpcNode = result.nodes.find((n) => n.id === "vpc-vpc-1");
    expect(vpcNode).toBeDefined();
    expect(vpcNode!.type).toBe("vpc");
    expect(vpcNode!.data.label).toBe("My VPC");
  });

  it("creates IGW node as child of VPC when internet gateway present", () => {
    const vpc = makeVPC({
      internet_gateway: {
        id: "igw-1",
        name: "My IGW",
        state: "attached",
        display_status: "active",
        tf_managed: true,
        tf_resource_address: "aws_internet_gateway.main",
      },
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const igwNode = result.nodes.find((n) => n.id === "igw-igw-1");
    expect(igwNode).toBeDefined();
    expect(igwNode!.type).toBe("internet-gateway");
    expect(igwNode!.parentNode).toBe("vpc-vpc-1");
    expect(igwNode!.data.label).toBe("My IGW");
  });

  it("creates subnet and EC2 resource nodes", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          id: "sub-1",
          ec2_instances: [
            {
              id: "i-1",
              name: "web-server",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: "10.0.1.5",
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
        }),
      ],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const subnetNode = result.nodes.find((n) => n.id === "subnet-sub-1");
    const ec2Node = result.nodes.find((n) => n.id === "ec2-i-1");
    expect(subnetNode).toBeDefined();
    expect(ec2Node).toBeDefined();
    expect(ec2Node!.parentNode).toBe("subnet-sub-1");
    expect(ec2Node!.data.label).toBe("web-server");
  });

  it("places 2 EC2s in a 2-column grid layout", () => {
    const ec2_1 = {
      id: "i-1",
      name: "ec2-a",
      instance_type: "t3.micro",
      state: "running",
      display_status: "active" as const,
      private_ip: null,
      public_ip: null,
      private_dns: null,
      public_dns: null,
      tf_managed: false,
      tf_resource_address: null,
    };
    const ec2_2 = { ...ec2_1, id: "i-2", name: "ec2-b" };
    const vpc = makeVPC({
      subnets: [makeSubnet({ ec2_instances: [ec2_1, ec2_2] })],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const n1 = result.nodes.find((n) => n.id === "ec2-i-1");
    const n2 = result.nodes.find((n) => n.id === "ec2-i-2");
    expect(n1).toBeDefined();
    expect(n2).toBeDefined();
    // Both should be on the same row (row 0) with different x
    expect(n1!.position.y).toBe(n2!.position.y);
    expect(n1!.position.x).not.toBe(n2!.position.x);
  });

  it("wraps 3 EC2s to a second row", () => {
    const mkEc2 = (id: string) => ({
      id,
      name: id,
      instance_type: "t3.micro",
      state: "running",
      display_status: "active" as const,
      private_ip: null,
      public_ip: null,
      private_dns: null,
      public_dns: null,
      tf_managed: false,
      tf_resource_address: null,
    });
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          ec2_instances: [mkEc2("i-1"), mkEc2("i-2"), mkEc2("i-3")],
        }),
      ],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const n1 = result.nodes.find((n) => n.id === "ec2-i-1");
    const n3 = result.nodes.find((n) => n.id === "ec2-i-3");
    // Third node should be on a different row (higher y)
    expect(n3!.position.y).toBeGreaterThan(n1!.position.y);
  });

  it("creates public and private subnets with correct y offsets", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({ id: "pub-1", subnet_type: "public" }),
        makeSubnet({ id: "priv-1", subnet_type: "private" }),
      ],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const pubNode = result.nodes.find((n) => n.id === "subnet-pub-1");
    const privNode = result.nodes.find((n) => n.id === "subnet-priv-1");
    expect(pubNode).toBeDefined();
    expect(privNode).toBeDefined();
    // Private subnet should be below public
    expect(privNode!.position.y).toBeGreaterThan(pubNode!.position.y);
  });

  it("creates correct node types for mixed resources", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          ec2_instances: [
            {
              id: "i-1",
              name: "ec2",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
          rds_instances: [
            {
              id: "rds-1",
              name: "db",
              engine: "mysql",
              instance_class: "db.t3.micro",
              status: "available",
              display_status: "active",
              endpoint: null,
              port: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
          ecs_containers: [
            {
              id: "ecs-1",
              name: "task",
              cluster_name: "prod",
              launch_type: "FARGATE",
              status: "RUNNING",
              display_status: "active",
              cpu: 256,
              memory: 512,
              image: null,
              image_tag: null,
              container_port: null,
              private_ip: null,
              tf_managed: false,
              tf_resource_address: null,
              managed_by: "unmanaged",
            },
          ],
          nat_gateway: {
            id: "nat-1",
            name: "NAT",
            state: "available",
            display_status: "active",
            primary_public_ip: null,
            tf_managed: false,
            tf_resource_address: null,
          },
        }),
      ],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    expect(result.nodes.find((n) => n.id === "ec2-i-1")?.type).toBe("ec2");
    expect(result.nodes.find((n) => n.id === "rds-rds-1")?.type).toBe("rds");
    expect(result.nodes.find((n) => n.id === "ecs-ecs-1")?.type).toBe(
      "ecs-container",
    );
    expect(result.nodes.find((n) => n.id === "nat-nat-1")?.type).toBe(
      "nat-gateway",
    );
  });

  it("offsets second VPC by first VPC width + gap", () => {
    const result = calculateTopologyLayout(
      makeResponse([makeVPC({ id: "vpc-1" }), makeVPC({ id: "vpc-2" })]),
    );
    const v1 = result.nodes.find((n) => n.id === "vpc-vpc-1");
    const v2 = result.nodes.find((n) => n.id === "vpc-vpc-2");
    expect(v2!.position.x).toBeGreaterThan(v1!.position.x);
  });

  it("hides children when VPC is collapsed", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          ec2_instances: [
            {
              id: "i-1",
              name: "ec2",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
        }),
      ],
    });
    const collapsed = new Set(["vpc-vpc-1"]);
    const result = calculateTopologyLayout(makeResponse([vpc]), collapsed);
    const vpcNode = result.nodes.find((n) => n.id === "vpc-vpc-1");
    const subnetNode = result.nodes.find((n) => n.id === "subnet-subnet-1");
    const ec2Node = result.nodes.find((n) => n.id === "ec2-i-1");
    expect(vpcNode!.data).toHaveProperty("collapsed", true);
    expect(subnetNode!.hidden).toBe(true);
    expect(ec2Node!.hidden).toBe(true);
  });

  it("hides resources when subnet is collapsed", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          id: "sub-1",
          ec2_instances: [
            {
              id: "i-1",
              name: "ec2",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
        }),
      ],
    });
    const collapsed = new Set(["subnet-sub-1"]);
    const result = calculateTopologyLayout(makeResponse([vpc]), collapsed);
    const subnetNode = result.nodes.find((n) => n.id === "subnet-sub-1");
    const ec2Node = result.nodes.find((n) => n.id === "ec2-i-1");
    expect(subnetNode!.data).toHaveProperty("collapsed", true);
    expect(ec2Node!.hidden).toBe(true);
  });

  it("includes correct childSummary counts on VPC node", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          ec2_instances: [
            {
              id: "i-1",
              name: "ec2",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
          rds_instances: [
            {
              id: "rds-1",
              name: "db",
              engine: "mysql",
              instance_class: "db.t3.micro",
              status: "available",
              display_status: "active",
              endpoint: null,
              port: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
        }),
      ],
      internet_gateway: {
        id: "igw-1",
        name: "IGW",
        state: "attached",
        display_status: "active",
        tf_managed: false,
        tf_resource_address: null,
      },
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const vpcNode = result.nodes.find((n) => n.id === "vpc-vpc-1");
    const summary = (
      vpcNode!.data as unknown as { childSummary: Record<string, number> }
    ).childSummary;
    expect(summary.subnetCount).toBe(1);
    expect(summary.ec2Count).toBe(1);
    expect(summary.rdsCount).toBe(1);
    expect(summary.igwCount).toBe(1);
  });

  it("includes correct childSummary counts on subnet node", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          ec2_instances: [
            {
              id: "i-1",
              name: "ec2",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
            {
              id: "i-2",
              name: "ec2-2",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
        }),
      ],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const subnetNode = result.nodes.find((n) => n.id === "subnet-subnet-1");
    const summary = (
      subnetNode!.data as unknown as { childSummary: Record<string, number> }
    ).childSummary;
    expect(summary.ec2Count).toBe(2);
  });

  it("falls back to ID when resource name is null", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          ec2_instances: [
            {
              id: "i-fallback",
              name: null,
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: false,
              tf_resource_address: null,
            },
          ],
        }),
      ],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const ec2Node = result.nodes.find((n) => n.id === "ec2-i-fallback");
    expect(ec2Node!.data.label).toBe("i-fallback");
  });

  it("maps tf_resource_address when present", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          ec2_instances: [
            {
              id: "i-1",
              name: "web",
              instance_type: "t3.micro",
              state: "running",
              display_status: "active",
              private_ip: null,
              public_ip: null,
              private_dns: null,
              public_dns: null,
              tf_managed: true,
              tf_resource_address: "aws_instance.web",
            },
          ],
        }),
      ],
    });
    const result = calculateTopologyLayout(makeResponse([vpc]));
    const ec2Node = result.nodes.find((n) => n.id === "ec2-i-1");
    expect(ec2Node!.data.tfResourceAddress).toBe("aws_instance.web");
  });
});

// =============================================================================
// createEdges
// =============================================================================

describe("createEdges", () => {
  it("returns empty array for empty data", () => {
    expect(createEdges(makeResponse([]))).toEqual([]);
  });

  it("creates edge from IGW to public subnet", () => {
    const vpc = makeVPC({
      internet_gateway: {
        id: "igw-1",
        name: "IGW",
        state: "attached",
        display_status: "active",
        tf_managed: false,
        tf_resource_address: null,
      },
      subnets: [makeSubnet({ id: "sub-1", subnet_type: "public" })],
    });
    const edges = createEdges(makeResponse([vpc]));
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("igw-igw-1");
    expect(edges[0].target).toBe("subnet-sub-1");
  });

  it("creates edges from IGW to all public subnets", () => {
    const vpc = makeVPC({
      internet_gateway: {
        id: "igw-1",
        name: "IGW",
        state: "attached",
        display_status: "active",
        tf_managed: false,
        tf_resource_address: null,
      },
      subnets: [
        makeSubnet({ id: "sub-1", subnet_type: "public" }),
        makeSubnet({ id: "sub-2", subnet_type: "public" }),
      ],
    });
    const edges = createEdges(makeResponse([vpc]));
    expect(edges).toHaveLength(2);
  });

  it("does not create IGW edges to private subnets", () => {
    const vpc = makeVPC({
      internet_gateway: {
        id: "igw-1",
        name: "IGW",
        state: "attached",
        display_status: "active",
        tf_managed: false,
        tf_resource_address: null,
      },
      subnets: [makeSubnet({ id: "sub-1", subnet_type: "private" })],
    });
    const edges = createEdges(makeResponse([vpc]));
    expect(edges).toHaveLength(0);
  });

  it("creates NAT edges from public subnet NAT to private subnets", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          id: "pub-1",
          subnet_type: "public",
          nat_gateway: {
            id: "nat-1",
            name: "NAT",
            state: "available",
            display_status: "active",
            primary_public_ip: null,
            tf_managed: false,
            tf_resource_address: null,
          },
        }),
        makeSubnet({ id: "priv-1", subnet_type: "private" }),
      ],
    });
    const edges = createEdges(makeResponse([vpc]));
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("nat-nat-1");
    expect(edges[0].target).toBe("subnet-priv-1");
  });

  it("creates NAT edges to multiple private subnets", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          id: "pub-1",
          subnet_type: "public",
          nat_gateway: {
            id: "nat-1",
            name: "NAT",
            state: "available",
            display_status: "active",
            primary_public_ip: null,
            tf_managed: false,
            tf_resource_address: null,
          },
        }),
        makeSubnet({ id: "priv-1", subnet_type: "private" }),
        makeSubnet({ id: "priv-2", subnet_type: "private" }),
      ],
    });
    const edges = createEdges(makeResponse([vpc]));
    expect(edges).toHaveLength(2);
  });

  it("skips all edges for collapsed VPC", () => {
    const vpc = makeVPC({
      internet_gateway: {
        id: "igw-1",
        name: "IGW",
        state: "attached",
        display_status: "active",
        tf_managed: false,
        tf_resource_address: null,
      },
      subnets: [makeSubnet({ id: "sub-1", subnet_type: "public" })],
    });
    const collapsed = new Set(["vpc-vpc-1"]);
    const edges = createEdges(makeResponse([vpc]), collapsed);
    expect(edges).toHaveLength(0);
  });

  it("skips NAT edges when subnet containing NAT is collapsed", () => {
    const vpc = makeVPC({
      subnets: [
        makeSubnet({
          id: "pub-1",
          subnet_type: "public",
          nat_gateway: {
            id: "nat-1",
            name: "NAT",
            state: "available",
            display_status: "active",
            primary_public_ip: null,
            tf_managed: false,
            tf_resource_address: null,
          },
        }),
        makeSubnet({ id: "priv-1", subnet_type: "private" }),
      ],
    });
    const collapsed = new Set(["subnet-pub-1"]);
    const edges = createEdges(makeResponse([vpc]), collapsed);
    expect(edges).toHaveLength(0);
  });
});
