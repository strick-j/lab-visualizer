import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
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

function TopologyCanvasInner({ data, onNodeClick }: TopologyCanvasProps) {
  const reactFlow = useReactFlow();
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const prevCollapsedRef = useRef<Set<string>>(collapsedNodes);

  // Stable toggle factory - creates a toggle function for a given node ID
  const createToggleCallback = useCallback(
    (nodeId: string) => () => {
      setCollapsedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    },
    [],
  );

  // Collapse all VPCs and subnets
  const collapseAll = useCallback(() => {
    const allIds = new Set<string>();
    for (const vpc of data.vpcs) {
      allIds.add(`vpc-${vpc.id}`);
      for (const subnet of vpc.subnets) {
        allIds.add(`subnet-${subnet.id}`);
      }
    }
    setCollapsedNodes(allIds);
  }, [data]);

  // Expand all
  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  // Prune collapsed IDs that no longer exist in data
  useEffect(() => {
    setCollapsedNodes((prev) => {
      const validIds = new Set<string>();
      for (const vpc of data.vpcs) {
        validIds.add(`vpc-${vpc.id}`);
        for (const subnet of vpc.subnets) {
          validIds.add(`subnet-${subnet.id}`);
        }
      }
      const pruned = new Set([...prev].filter((id) => validIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [data]);

  // Calculate layout from data + collapsed state
  const { initialNodes, initialEdges } = useMemo(() => {
    const layout = calculateTopologyLayout(data, collapsedNodes);
    const edges = createEdges(data, collapsedNodes);

    // Inject onToggleCollapse callbacks into VPC and subnet nodes
    const nodesWithCallbacks = layout.nodes.map((node) => {
      if (node.type === "vpc" || node.type === "subnet") {
        return {
          ...node,
          data: {
            ...node.data,
            onToggleCollapse: createToggleCallback(node.id),
          },
        };
      }
      return node;
    });

    return {
      initialNodes: nodesWithCallbacks,
      initialEdges: [...layout.edges, ...edges],
    };
  }, [data, collapsedNodes, createToggleCallback]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes/edges when data or collapsed state changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Smooth viewport transition after collapse/expand
  useEffect(() => {
    if (prevCollapsedRef.current !== collapsedNodes) {
      prevCollapsedRef.current = collapsedNodes;
      // Small delay to let React Flow process the node changes first
      const timer = setTimeout(() => {
        reactFlow.fitView({ duration: 300, padding: 0.2 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [collapsedNodes, reactFlow]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<TopologyNodeData>) => {
      if (onNodeClick && node.type && node.data) {
        onNodeClick(node.id, node.type, node.data);
      }
    },
    [onNodeClick],
  );

  const hasNodes = data.vpcs.length > 0;

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

      {/* Collapse/Expand All controls */}
      {hasNodes && (
        <div className="absolute bottom-4 left-4 z-10 flex gap-2">
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            Expand All
          </button>
        </div>
      )}
    </div>
  );
}

export function TopologyCanvas(props: TopologyCanvasProps) {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
