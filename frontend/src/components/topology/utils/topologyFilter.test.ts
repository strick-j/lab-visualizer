import { describe, it, expect } from "vitest";
import {
  hasActiveFilters,
  filterTopologyData,
  EMPTY_FILTERS,
} from "./topologyFilter";
import type {
  TopologyResponse,
  TopologyVPC,
  TopologySubnet,
  TopologyFilters,
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

function filters(overrides: Partial<TopologyFilters> = {}): TopologyFilters {
  return { ...EMPTY_FILTERS, ...overrides };
}

// =============================================================================
// EMPTY_FILTERS / hasActiveFilters
// =============================================================================

describe("EMPTY_FILTERS", () => {
  it("has all empty values", () => {
    expect(EMPTY_FILTERS.search).toBe("");
    expect(EMPTY_FILTERS.vpcId).toBe("");
    expect(EMPTY_FILTERS.subnetType).toBe("");
    expect(EMPTY_FILTERS.status).toBe("");
    expect(EMPTY_FILTERS.tfManaged).toBe("");
    expect(EMPTY_FILTERS.resourceTypes).toEqual([]);
  });
});

describe("hasActiveFilters", () => {
  it("returns false for EMPTY_FILTERS", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("returns true when search is set", () => {
    expect(hasActiveFilters(filters({ search: "web" }))).toBe(true);
  });

  it("returns true when vpcId is set", () => {
    expect(hasActiveFilters(filters({ vpcId: "vpc-1" }))).toBe(true);
  });

  it("returns true when resourceTypes is set", () => {
    expect(hasActiveFilters(filters({ resourceTypes: ["ec2"] }))).toBe(true);
  });

  it("returns true when tfManaged is set", () => {
    expect(hasActiveFilters(filters({ tfManaged: "true" }))).toBe(true);
  });

  it("returns true when status is set", () => {
    expect(hasActiveFilters(filters({ status: "active" }))).toBe(true);
  });

  it("returns true when subnetType is set", () => {
    expect(hasActiveFilters(filters({ subnetType: "public" }))).toBe(true);
  });
});

// =============================================================================
// filterTopologyData
// =============================================================================

describe("filterTopologyData", () => {
  it("returns original data when no filters active", () => {
    const data = makeResponse([makeVPC()]);
    const result = filterTopologyData(data, EMPTY_FILTERS);
    expect(result).toBe(data);
  });

  it("filters by vpcId", () => {
    const data = makeResponse([
      makeVPC({ id: "vpc-1", subnets: [makeSubnet()] }),
      makeVPC({ id: "vpc-2", subnets: [makeSubnet({ id: "sub-2" })] }),
    ]);
    const result = filterTopologyData(data, filters({ vpcId: "vpc-1" }));
    expect(result.vpcs).toHaveLength(1);
    expect(result.vpcs[0].id).toBe("vpc-1");
  });

  it("filters by subnetType public - removes private subnets", () => {
    const data = makeResponse([
      makeVPC({
        subnets: [
          makeSubnet({ id: "pub-1", subnet_type: "public" }),
          makeSubnet({ id: "priv-1", subnet_type: "private" }),
        ],
        internet_gateway: {
          id: "igw-1",
          name: "IGW",
          state: "attached",
          display_status: "active",
          tf_managed: false,
          tf_resource_address: null,
        },
      }),
    ]);
    const result = filterTopologyData(data, filters({ subnetType: "public" }));
    expect(result.vpcs[0].subnets).toHaveLength(1);
    expect(result.vpcs[0].subnets[0].id).toBe("pub-1");
  });

  it("filters by resourceTypes ec2 - keeps only EC2", () => {
    const data = makeResponse([
      makeVPC({
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
      }),
    ]);
    const result = filterTopologyData(
      data,
      filters({ resourceTypes: ["ec2"] }),
    );
    expect(result.vpcs[0].subnets[0].ec2_instances).toHaveLength(1);
    expect(result.vpcs[0].subnets[0].rds_instances).toHaveLength(0);
  });

  it("filters by resourceTypes rds - keeps only RDS", () => {
    const data = makeResponse([
      makeVPC({
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
      }),
    ]);
    const result = filterTopologyData(
      data,
      filters({ resourceTypes: ["rds"] }),
    );
    expect(result.vpcs[0].subnets[0].ec2_instances).toHaveLength(0);
    expect(result.vpcs[0].subnets[0].rds_instances).toHaveLength(1);
  });

  it("filters by status active", () => {
    const data = makeResponse([
      makeVPC({
        subnets: [
          makeSubnet({
            ec2_instances: [
              {
                id: "i-1",
                name: "active-ec2",
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
                name: "stopped-ec2",
                instance_type: "t3.micro",
                state: "stopped",
                display_status: "inactive",
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
      }),
    ]);
    const result = filterTopologyData(data, filters({ status: "active" }));
    expect(result.vpcs[0].subnets[0].ec2_instances).toHaveLength(1);
    expect(result.vpcs[0].subnets[0].ec2_instances[0].id).toBe("i-1");
  });

  it("filters by tfManaged true - keeps tf_managed only", () => {
    const data = makeResponse([
      makeVPC({
        subnets: [
          makeSubnet({
            ec2_instances: [
              {
                id: "i-1",
                name: "managed",
                instance_type: "t3.micro",
                state: "running",
                display_status: "active",
                private_ip: null,
                public_ip: null,
                private_dns: null,
                public_dns: null,
                tf_managed: true,
                tf_resource_address: "aws_instance.managed",
              },
              {
                id: "i-2",
                name: "unmanaged",
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
      }),
    ]);
    const result = filterTopologyData(data, filters({ tfManaged: "true" }));
    expect(result.vpcs[0].subnets[0].ec2_instances).toHaveLength(1);
    expect(result.vpcs[0].subnets[0].ec2_instances[0].tf_managed).toBe(true);
  });

  it("filters by tfManaged false - keeps non-tf_managed only", () => {
    const data = makeResponse([
      makeVPC({
        subnets: [
          makeSubnet({
            ec2_instances: [
              {
                id: "i-1",
                name: "managed",
                instance_type: "t3.micro",
                state: "running",
                display_status: "active",
                private_ip: null,
                public_ip: null,
                private_dns: null,
                public_dns: null,
                tf_managed: true,
                tf_resource_address: "aws_instance.managed",
              },
              {
                id: "i-2",
                name: "unmanaged",
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
      }),
    ]);
    const result = filterTopologyData(data, filters({ tfManaged: "false" }));
    expect(result.vpcs[0].subnets[0].ec2_instances).toHaveLength(1);
    expect(result.vpcs[0].subnets[0].ec2_instances[0].tf_managed).toBe(false);
  });

  it("filters by search matching EC2 name", () => {
    const data = makeResponse([
      makeVPC({
        subnets: [
          makeSubnet({
            ec2_instances: [
              {
                id: "i-1",
                name: "web-server",
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
                name: "api-server",
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
      }),
    ]);
    const result = filterTopologyData(data, filters({ search: "web" }));
    expect(result.vpcs[0].subnets[0].ec2_instances).toHaveLength(1);
    expect(result.vpcs[0].subnets[0].ec2_instances[0].name).toBe("web-server");
  });

  it("search matches subnet name and keeps entire subnet", () => {
    const data = makeResponse([
      makeVPC({
        subnets: [
          makeSubnet({ id: "sub-1", name: "my-cool-subnet" }),
          makeSubnet({ id: "sub-2", name: "other-subnet" }),
        ],
        internet_gateway: {
          id: "igw-1",
          name: "IGW",
          state: "attached",
          display_status: "active",
          tf_managed: false,
          tf_resource_address: null,
        },
      }),
    ]);
    const result = filterTopologyData(data, filters({ search: "cool" }));
    expect(result.vpcs[0].subnets.some((s) => s.id === "sub-1")).toBe(true);
  });

  it("search matches VPC name", () => {
    const data = makeResponse([
      makeVPC({
        id: "vpc-1",
        name: "production-vpc",
        subnets: [makeSubnet()],
      }),
      makeVPC({
        id: "vpc-2",
        name: "staging-vpc",
        subnets: [makeSubnet({ id: "sub-2" })],
      }),
    ]);
    const result = filterTopologyData(data, filters({ search: "production" }));
    expect(result.vpcs.some((v) => v.id === "vpc-1")).toBe(true);
  });

  it("combines multiple filters: vpcId + subnetType + status", () => {
    const data = makeResponse([
      makeVPC({
        id: "vpc-1",
        subnets: [
          makeSubnet({
            id: "pub-1",
            subnet_type: "public",
            ec2_instances: [
              {
                id: "i-1",
                name: "active-ec2",
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
          makeSubnet({ id: "priv-1", subnet_type: "private" }),
        ],
        internet_gateway: {
          id: "igw-1",
          name: "IGW",
          state: "attached",
          display_status: "active",
          tf_managed: false,
          tf_resource_address: null,
        },
      }),
      makeVPC({ id: "vpc-2", subnets: [makeSubnet({ id: "sub-other" })] }),
    ]);
    const result = filterTopologyData(
      data,
      filters({
        vpcId: "vpc-1",
        subnetType: "public",
        status: "active",
      }),
    );
    expect(result.vpcs).toHaveLength(1);
    expect(result.vpcs[0].id).toBe("vpc-1");
    expect(result.vpcs[0].subnets).toHaveLength(1);
    expect(result.vpcs[0].subnets[0].subnet_type).toBe("public");
  });

  it("recalculates meta counts after filtering", () => {
    const data = makeResponse([
      makeVPC({
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
                tf_managed: true,
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
      }),
    ]);
    const result = filterTopologyData(data, filters({ tfManaged: "true" }));
    expect(result.meta.total_ec2).toBe(1);
  });

  it("resourceTypes igw keeps IGW", () => {
    const data = makeResponse([
      makeVPC({
        internet_gateway: {
          id: "igw-1",
          name: "IGW",
          state: "attached",
          display_status: "active",
          tf_managed: false,
          tf_resource_address: null,
        },
        subnets: [makeSubnet()],
      }),
    ]);
    const result = filterTopologyData(
      data,
      filters({ resourceTypes: ["igw"] }),
    );
    expect(result.vpcs[0].internet_gateway).not.toBeNull();
  });

  it("removes empty subnets after resource filtering", () => {
    const data = makeResponse([
      makeVPC({
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
                tf_managed: true,
                tf_resource_address: null,
              },
            ],
          }),
          makeSubnet({
            id: "sub-2",
            ec2_instances: [],
            tf_managed: false,
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
      }),
    ]);
    // Filter by search for "ec2" - sub-2 has no matching children and doesn't match search
    const result = filterTopologyData(data, filters({ search: "ec2" }));
    // sub-2 should be removed since it has no matching children and doesn't match search
    const sub2 = result.vpcs[0]?.subnets.find((s) => s.id === "sub-2");
    expect(sub2).toBeUndefined();
  });
});
