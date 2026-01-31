import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { TopologyCanvas } from './TopologyCanvas';

// Mock ReactFlow and related imports
vi.mock('reactflow', () => ({
  default: ({ children, nodes, edges, onNodeClick }: any) => (
    <div data-testid="react-flow" data-nodes={JSON.stringify(nodes)} data-edges={JSON.stringify(edges)}>
      <button data-testid="mock-node" onClick={(e) => onNodeClick?.(e, { id: 'node-1', type: 'ec2', data: { label: 'test' } })}>
        Mock Node
      </button>
      {children}
    </div>
  ),
  Background: () => <div data-testid="react-flow-background" />,
  Controls: () => <div data-testid="react-flow-controls" />,
  useNodesState: (initialNodes: any[]) => [initialNodes, vi.fn(), vi.fn()],
  useEdgesState: (initialEdges: any[]) => [initialEdges, vi.fn(), vi.fn()],
  BackgroundVariant: { Dots: 'dots' },
}));

// Mock the layout calculator
vi.mock('./utils/layoutCalculator', () => ({
  calculateTopologyLayout: () => ({
    nodes: [
      { id: 'vpc-1', type: 'vpc', position: { x: 0, y: 0 }, data: { label: 'Test VPC' } },
      { id: 'subnet-1', type: 'subnet', position: { x: 10, y: 10 }, data: { label: 'Test Subnet' } },
    ],
    edges: [],
  }),
  createEdges: () => [
    { id: 'edge-1', source: 'vpc-1', target: 'subnet-1' },
  ],
}));

const mockTopologyData = {
  vpcs: [
    {
      vpc_id: 'vpc-123',
      name: 'Test VPC',
      cidr_block: '10.0.0.0/16',
      display_status: 'active' as const,
      tf_managed: true,
    },
  ],
  subnets: [
    {
      subnet_id: 'subnet-123',
      vpc_id: 'vpc-123',
      name: 'Test Subnet',
      cidr_block: '10.0.1.0/24',
      availability_zone: 'us-east-1a',
      subnet_type: 'public' as const,
      display_status: 'active' as const,
      tf_managed: true,
    },
  ],
  ec2_instances: [],
  rds_instances: [],
  internet_gateways: [],
  nat_gateways: [],
};

describe('TopologyCanvas', () => {
  it('renders ReactFlow component', () => {
    render(<TopologyCanvas data={mockTopologyData} />);
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('renders ReactFlow background', () => {
    render(<TopologyCanvas data={mockTopologyData} />);
    expect(screen.getByTestId('react-flow-background')).toBeInTheDocument();
  });

  it('renders ReactFlow controls', () => {
    render(<TopologyCanvas data={mockTopologyData} />);
    expect(screen.getByTestId('react-flow-controls')).toBeInTheDocument();
  });

  it('calls onNodeClick when node is clicked', () => {
    const mockOnNodeClick = vi.fn();
    render(<TopologyCanvas data={mockTopologyData} onNodeClick={mockOnNodeClick} />);

    const mockNode = screen.getByTestId('mock-node');
    fireEvent.click(mockNode);

    expect(mockOnNodeClick).toHaveBeenCalledWith('node-1', 'ec2', { label: 'test' });
  });

  it('does not throw when onNodeClick is not provided', () => {
    render(<TopologyCanvas data={mockTopologyData} />);

    const mockNode = screen.getByTestId('mock-node');
    expect(() => fireEvent.click(mockNode)).not.toThrow();
  });

  it('renders within a container div', () => {
    const { container } = render(<TopologyCanvas data={mockTopologyData} />);
    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv.className).toContain('w-full');
    expect(wrapperDiv.className).toContain('h-full');
  });
});
