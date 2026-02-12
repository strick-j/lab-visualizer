import { useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  UserNode,
  RoleNode,
  SafeNode,
  AccountNode,
  SIAPolicyNode,
  EC2TargetNode,
  RDSTargetNode,
} from "./nodes";
import { calculateAccessMappingLayout } from "./utils/accessMappingLayout";
import type { AccessMappingResponse } from "@/types";

// Register custom node types
const nodeTypes: NodeTypes = {
  "access-user": UserNode,
  "access-role": RoleNode,
  "access-safe": SafeNode,
  "access-account": AccountNode,
  "access-sia-policy": SIAPolicyNode,
  "access-ec2-target": EC2TargetNode,
  "access-rds-target": RDSTargetNode,
};

interface AccessMappingCanvasProps {
  data: AccessMappingResponse;
  filters?: {
    accessType?: string;
    selectedUser?: string;
  };
}

export function AccessMappingCanvas({
  data,
  filters,
}: AccessMappingCanvasProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const layout = calculateAccessMappingLayout(data, filters);
    return {
      initialNodes: layout.nodes,
      initialEdges: layout.edges,
    };
  }, [data, filters]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes/edges when data or filters change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.3,
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
