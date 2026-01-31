import { useState } from "react";
import { Network } from "lucide-react";
import { VPCTabNavigation } from "@/components/vpc/VPCTabNavigation";
import { VPCList } from "@/components/vpc/VPCList";
import { SubnetList } from "@/components/vpc/SubnetList";
import { IGWList } from "@/components/vpc/IGWList";
import { NATGatewayList } from "@/components/vpc/NATGatewayList";
import { ElasticIPList } from "@/components/vpc/ElasticIPList";
import type { VPCResourceType, ResourceFilters } from "@/types";

export function VPCPage() {
  const [activeTab, setActiveTab] = useState<VPCResourceType>("vpcs");
  const [filters, setFilters] = useState<ResourceFilters>({});

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <Network className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            VPC Network Resources
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Virtual Private Cloud networking components
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <VPCTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div>
        {activeTab === "vpcs" && (
          <VPCList filters={filters} onFilterChange={setFilters} />
        )}
        {activeTab === "subnets" && (
          <SubnetList filters={filters} onFilterChange={setFilters} />
        )}
        {activeTab === "internet-gateways" && (
          <IGWList filters={filters} onFilterChange={setFilters} />
        )}
        {activeTab === "nat-gateways" && (
          <NATGatewayList filters={filters} onFilterChange={setFilters} />
        )}
        {activeTab === "elastic-ips" && (
          <ElasticIPList filters={filters} onFilterChange={setFilters} />
        )}
      </div>
    </div>
  );
}
