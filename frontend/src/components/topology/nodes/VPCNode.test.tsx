import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { VPCNode } from './VPCNode';
import type { VPCNodeData } from '@/types/topology';

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

const defaultData: VPCNodeData = {
  type: 'vpc',
  label: 'main-vpc',
  vpcId: 'vpc-12345',
  cidrBlock: '10.0.0.0/16',
  displayStatus: 'active',
  tfManaged: false,
};

const createNodeProps = (data: VPCNodeData) => ({
  id: 'test-node',
  data,
  type: 'vpc',
  selected: false,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

describe('VPCNode', () => {
  it('renders the node label', () => {
    render(<VPCNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('main-vpc')).toBeInTheDocument();
  });

  it('renders the VPC ID', () => {
    render(<VPCNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('vpc-12345')).toBeInTheDocument();
  });

  it('renders the CIDR block', () => {
    render(<VPCNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('10.0.0.0/16')).toBeInTheDocument();
  });

  it('renders default label when no label provided', () => {
    const data = { ...defaultData, label: '' };
    render(<VPCNode {...createNodeProps(data)} />);
    expect(screen.getByText('VPC')).toBeInTheDocument();
  });

  it('renders TF badge when terraform managed', () => {
    const data = { ...defaultData, tfManaged: true };
    render(<VPCNode {...createNodeProps(data)} />);
    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('does not render TF badge when not terraform managed', () => {
    render(<VPCNode {...createNodeProps(defaultData)} />);
    expect(screen.queryByText('TF')).not.toBeInTheDocument();
  });

  it('renders with active status styling', () => {
    const { container } = render(<VPCNode {...createNodeProps(defaultData)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-green-500');
  });

  it('renders with inactive status styling', () => {
    const data = { ...defaultData, displayStatus: 'inactive' as const };
    const { container } = render(<VPCNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-400');
  });

  it('renders with transitioning status styling', () => {
    const data = { ...defaultData, displayStatus: 'transitioning' as const };
    const { container } = render(<VPCNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-yellow-500');
  });

  it('renders with error status styling', () => {
    const data = { ...defaultData, displayStatus: 'error' as const };
    const { container } = render(<VPCNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-red-500');
  });

  it('renders with unknown status styling', () => {
    const data = { ...defaultData, displayStatus: 'unknown' as const };
    const { container } = render(<VPCNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-300');
  });

  it('renders handles for connections', () => {
    render(<VPCNode {...createNodeProps(defaultData)} />);
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });
});
