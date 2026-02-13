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

// Node types that support collapsing (have outgoing edges to downstream nodes)
const COLLAPSIBLE_TYPES = new Set([
  "access-user",
  "access-role",
  "access-safe",
  "access-sia-policy",
]);

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

function AccessMappingCanvasInner({ data, filters }: AccessMappingCanvasProps) {
  const reactFlow = useReactFlow();
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const prevCollapsedRef = useRef<Set<string>>(collapsedNodes);

  // Stable toggle factory
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

  // Collapse all collapsible nodes
  const collapseAll = useCallback(() => {
    const layout = calculateAccessMappingLayout(data, filters);
    const allIds = new Set<string>();
    for (const node of layout.nodes) {
      if (COLLAPSIBLE_TYPES.has(node.type || "")) {
        allIds.add(node.id);
      }
    }
    setCollapsedNodes(allIds);
  }, [data, filters]);

  // Expand all
  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  // Prune collapsed IDs that no longer exist in data
  useEffect(() => {
    const layout = calculateAccessMappingLayout(data, filters);
    const validIds = new Set(layout.nodes.map((n) => n.id));
    setCollapsedNodes((prev) => {
      const pruned = new Set([...prev].filter((id) => validIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [data, filters]);

  // Calculate layout with collapsed state
  const { initialNodes, initialEdges } = useMemo(() => {
    const layout = calculateAccessMappingLayout(data, filters, collapsedNodes);

    // Inject onToggleCollapse callbacks into collapsible nodes
    const nodesWithCallbacks = layout.nodes.map((node) => {
      if (COLLAPSIBLE_TYPES.has(node.type || "")) {
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
      initialEdges: layout.edges,
    };
  }, [data, filters, collapsedNodes, createToggleCallback]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes/edges when data, filters, or collapsed state changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Smooth viewport transition after collapse/expand
  useEffect(() => {
    if (prevCollapsedRef.current !== collapsedNodes) {
      prevCollapsedRef.current = collapsedNodes;
      const timer = setTimeout(() => {
        reactFlow.fitView({ duration: 300, padding: 0.3 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [collapsedNodes, reactFlow]);

  const hasNodes = data.users.length > 0;

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

export function AccessMappingCanvas(props: AccessMappingCanvasProps) {
  return (
    <ReactFlowProvider>
      <AccessMappingCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
