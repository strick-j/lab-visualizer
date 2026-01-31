import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PageLoading,
  StatusBadge,
  TerraformBadge,
  EmptyState,
} from "@/components/common";
import { ResourceTable, ResourceFilters } from "@/components/resources";
import { IGWDetailPanel } from "./IGWDetailPanel";
import { useInternetGateways } from "@/hooks";
import { getResourceName } from "@/lib/utils";
import type { ResourceFilters as Filters, InternetGateway } from "@/types";

interface IGWListProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function IGWList({ filters, onFilterChange }: IGWListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("selected");

  const { data, isLoading, error } = useInternetGateways(filters);

  const selectedIGW = useMemo(() => {
    if (!selectedId || !data?.data) return null;
    return data.data.find((igw) => igw.igw_id === selectedId) || null;
  }, [selectedId, data?.data]);

  const handleRowClick = (igw: InternetGateway) => {
    setSearchParams({ selected: igw.igw_id });
  };

  const handleCloseDetail = () => {
    setSearchParams({});
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (igw: InternetGateway) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getResourceName(igw.name, igw.igw_id)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {igw.igw_id}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (igw: InternetGateway) => (
        <StatusBadge status={igw.display_status} size="sm" />
      ),
    },
    {
      key: "state",
      header: "State",
      render: (igw: InternetGateway) => (
        <span className="text-gray-700 dark:text-gray-300 capitalize">
          {igw.state}
        </span>
      ),
    },
    {
      key: "vpc",
      header: "VPC",
      render: (igw: InternetGateway) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {igw.vpc_id || "Detached"}
        </span>
      ),
    },
    {
      key: "terraform",
      header: "Terraform",
      render: (igw: InternetGateway) => (
        <TerraformBadge managed={igw.tf_managed} />
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading Internet Gateways"
        description="There was an error loading the internet gateway list. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta.total || 0} Internet Gateways found
        </p>
      </div>

      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />

      {data?.data.length === 0 ? (
        <EmptyState
          title="No Internet Gateways found"
          description="No internet gateways match your current filters."
        />
      ) : (
        <ResourceTable
          columns={columns}
          data={data?.data || []}
          keyExtractor={(igw) => igw.igw_id}
          onRowClick={handleRowClick}
        />
      )}

      {selectedIGW && (
        <IGWDetailPanel igw={selectedIGW} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
