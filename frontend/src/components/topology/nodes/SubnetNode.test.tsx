import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SubnetNode } from './SubnetNode';

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

const defaultData = {
  label: 'public-subnet-1',
  subnetType: 'public' as const,
  cidrBlock: '10.0.1.0/24',
  availabilityZone: 'us-east-1a',
  tfManaged: false,
};

const createNodeProps = (data: typeof defaultData) => ({
  id: 'test-node',
  data,
  type: 'subnetNode',
  selected: false,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  dragging: false,
});

describe('SubnetNode', () => {
  it('renders the node label', () => {
    render(<SubnetNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('public-subnet-1')).toBeInTheDocument();
  });

  it('renders the CIDR block and availability zone', () => {
    render(<SubnetNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('10.0.1.0/24 | us-east-1a')).toBeInTheDocument();
  });

  it('renders the subnet type badge', () => {
    render(<SubnetNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('public')).toBeInTheDocument();
  });

  it('renders default label when no label provided', () => {
    const data = { ...defaultData, label: '' };
    render(<SubnetNode {...createNodeProps(data)} />);
    expect(screen.getByText('Subnet')).toBeInTheDocument();
  });

  it('renders TF badge when terraform managed', () => {
    const data = { ...defaultData, tfManaged: true };
    render(<SubnetNode {...createNodeProps(data)} />);
    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('does not render TF badge when not terraform managed', () => {
    render(<SubnetNode {...createNodeProps(defaultData)} />);
    expect(screen.queryByText('TF')).not.toBeInTheDocument();
  });

  it('renders with public subnet styling', () => {
    const { container } = render(<SubnetNode {...createNodeProps(defaultData)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-green-400');
  });

  it('renders with private subnet styling', () => {
    const data = { ...defaultData, subnetType: 'private' as const };
    const { container } = render(<SubnetNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-blue-400');
  });

  it('renders with unknown subnet styling', () => {
    const data = { ...defaultData, subnetType: 'unknown' as const };
    const { container } = render(<SubnetNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-300');
  });

  it('renders private subnet type badge with correct styling', () => {
    const data = { ...defaultData, subnetType: 'private' as const };
    render(<SubnetNode {...createNodeProps(data)} />);
    const badge = screen.getByText('private');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('renders unknown subnet type badge with correct styling', () => {
    const data = { ...defaultData, subnetType: 'unknown' as const };
    render(<SubnetNode {...createNodeProps(data)} />);
    const badge = screen.getByText('unknown');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('renders handles for connections', () => {
    render(<SubnetNode {...createNodeProps(defaultData)} />);
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });
});
