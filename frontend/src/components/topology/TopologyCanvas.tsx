import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type NodeTypes,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  VPCNode,
  SubnetNode,
  EC2Node,
  RDSNode,
  ECSContainerNode,
  InternetGatewayNode,
  NATGatewayNode,
} from "./nodes";
import { calculateTopologyLayout, createEdges } from "./utils/layoutCalculator";
import type { TopologyResponse, TopologyNodeData } from "@/types/topology";

// Register custom node types
const nodeTypes: NodeTypes = {
  vpc: VPCNode,
  subnet: SubnetNode,
  ec2: EC2Node,
  rds: RDSNode,
  "ecs-container": ECSContainerNode,
  "internet-gateway": InternetGatewayNode,
  "nat-gateway": NATGatewayNode,
};

interface TopologyCanvasProps {
  data: TopologyResponse;
  onNodeClick?: (
    nodeId: string,
    nodeType: string,
    nodeData: TopologyNodeData,
  ) => void;
}

export function TopologyCanvas({ data, onNodeClick }: TopologyCanvasProps) {
  // Calculate layout from data
  const { initialNodes, initialEdges } = useMemo(() => {
    const layout = calculateTopologyLayout(data);
    const edges = createEdges(data);
    return {
      initialNodes: layout.nodes,
      initialEdges: [...layout.edges, ...edges],
    };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes/edges when data changes (e.g. after filtering)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<TopologyNodeData>) => {
      if (onNodeClick && node.type && node.data) {
        onNodeClick(node.id, node.type, node.data);
      }
    },
    [onNodeClick],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "default",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="bg-gray-50 dark:bg-gray-900"
        />
        <Controls
          showInteractive={false}
          showFitView={true}
          showZoom={true}
          position="bottom-right"
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg [&>button]:border-gray-200 [&>button]:dark:border-gray-700"
        />
      </ReactFlow>
    </div>
  );
}
