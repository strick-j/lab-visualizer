import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type NodeTypes,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  VPCNode,
  SubnetNode,
  EC2Node,
  RDSNode,
  InternetGatewayNode,
  NATGatewayNode,
} from './nodes';
import { calculateTopologyLayout, createEdges } from './utils/layoutCalculator';
import type { TopologyResponse, TopologyNodeData } from '@/types/topology';

// Register custom node types
const nodeTypes: NodeTypes = {
  vpc: VPCNode,
  subnet: SubnetNode,
  ec2: EC2Node,
  rds: RDSNode,
  'internet-gateway': InternetGatewayNode,
  'nat-gateway': NATGatewayNode,
};

// MiniMap node color mapping
const nodeColor = (node: Node<TopologyNodeData>) => {
  switch (node.type) {
    case 'vpc':
      return '#a855f7';
    case 'subnet':
      return '#6b7280';
    case 'ec2':
      return '#f97316';
    case 'rds':
      return '#3b82f6';
    case 'internet-gateway':
      return '#06b6d4';
    case 'nat-gateway':
      return '#8b5cf6';
    default:
      return '#9ca3af';
  }
};

interface TopologyCanvasProps {
  data: TopologyResponse;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
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

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.type) {
        onNodeClick(node.id, node.type);
      }
    },
    [onNodeClick]
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
          type: 'smoothstep',
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
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        />
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        />
      </ReactFlow>
    </div>
  );
}
