import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { EC2Node } from './EC2Node';
import type { EC2NodeData } from '@/types/topology';

// Mock react-flow
vi.mock('reactflow', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}));

const defaultData: EC2NodeData = {
  type: 'ec2',
  label: 'web-server-1',
  instanceId: 'i-1234567890abcdef0',
  instanceType: 't3.micro',
  displayStatus: 'active',
  privateIp: '10.0.1.100',
  tfManaged: false,
  state: 'running',
};

const createNodeProps = (data: EC2NodeData) => ({
  id: 'test-node',
  data,
  type: 'ec2',
  selected: false,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

describe('EC2Node', () => {
  it('renders the node label', () => {
    render(<EC2Node {...createNodeProps(defaultData)} />);
    expect(screen.getByText('web-server-1')).toBeInTheDocument();
  });

  it('renders the instance type', () => {
    render(<EC2Node {...createNodeProps(defaultData)} />);
    expect(screen.getByText('t3.micro')).toBeInTheDocument();
  });

  it('renders the private IP when provided', () => {
    render(<EC2Node {...createNodeProps(defaultData)} />);
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
  });

  it('does not render private IP when not provided', () => {
    const data = { ...defaultData, privateIp: undefined };
    render(<EC2Node {...createNodeProps(data)} />);
    expect(screen.queryByText('10.0.1.100')).not.toBeInTheDocument();
  });

  it('renders TF badge when terraform managed', () => {
    const data = { ...defaultData, tfManaged: true };
    render(<EC2Node {...createNodeProps(data)} />);
    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('does not render TF badge when not terraform managed', () => {
    render(<EC2Node {...createNodeProps(defaultData)} />);
    expect(screen.queryByText('TF')).not.toBeInTheDocument();
  });

  it('renders default label when no label provided', () => {
    const data = { ...defaultData, label: '' };
    render(<EC2Node {...createNodeProps(data)} />);
    expect(screen.getByText('EC2')).toBeInTheDocument();
  });

  it('renders with active status styling', () => {
    const { container } = render(<EC2Node {...createNodeProps(defaultData)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-green-500');
  });

  it('renders with inactive status styling', () => {
    const data = { ...defaultData, displayStatus: 'inactive' as const };
    const { container } = render(<EC2Node {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-400');
  });

  it('renders with transitioning status styling', () => {
    const data = { ...defaultData, displayStatus: 'transitioning' as const };
    const { container } = render(<EC2Node {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-yellow-500');
  });

  it('renders with error status styling', () => {
    const data = { ...defaultData, displayStatus: 'error' as const };
    const { container } = render(<EC2Node {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-red-500');
  });

  it('renders with unknown status styling', () => {
    const data = { ...defaultData, displayStatus: 'unknown' as const };
    const { container } = render(<EC2Node {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-300');
  });

  it('renders handles for connections', () => {
    render(<EC2Node {...createNodeProps(defaultData)} />);
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });
});
