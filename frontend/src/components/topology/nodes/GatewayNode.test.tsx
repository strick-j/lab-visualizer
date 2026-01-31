import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { InternetGatewayNode, NATGatewayNode } from './GatewayNode';
import type { InternetGatewayNodeData, NATGatewayNodeData } from '@/types/topology';

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

const createIGWNodeProps = (data: InternetGatewayNodeData) => ({
  id: 'test-node',
  data,
  type: 'internet-gateway',
  selected: false,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

const createNATNodeProps = (data: NATGatewayNodeData) => ({
  id: 'test-node',
  data,
  type: 'nat-gateway',
  selected: false,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

describe('InternetGatewayNode', () => {
  const defaultIGWData: InternetGatewayNodeData = {
    type: 'internet-gateway',
    label: 'main-igw',
    igwId: 'igw-12345',
    displayStatus: 'active',
    tfManaged: false,
  };

  it('renders the node label', () => {
    render(<InternetGatewayNode {...createIGWNodeProps(defaultIGWData)} />);
    expect(screen.getByText('main-igw')).toBeInTheDocument();
  });

  it('renders the IGW ID', () => {
    render(<InternetGatewayNode {...createIGWNodeProps(defaultIGWData)} />);
    expect(screen.getByText('igw-12345')).toBeInTheDocument();
  });

  it('renders default label when no label provided', () => {
    const data = { ...defaultIGWData, label: '' };
    render(<InternetGatewayNode {...createIGWNodeProps(data)} />);
    expect(screen.getByText('IGW')).toBeInTheDocument();
  });

  it('renders TF badge when terraform managed', () => {
    const data = { ...defaultIGWData, tfManaged: true };
    render(<InternetGatewayNode {...createIGWNodeProps(data)} />);
    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('does not render TF badge when not terraform managed', () => {
    render(<InternetGatewayNode {...createIGWNodeProps(defaultIGWData)} />);
    expect(screen.queryByText('TF')).not.toBeInTheDocument();
  });

  it('renders with active status styling', () => {
    const { container } = render(<InternetGatewayNode {...createIGWNodeProps(defaultIGWData)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-green-500');
  });

  it('renders with inactive status styling', () => {
    const data = { ...defaultIGWData, displayStatus: 'inactive' as const };
    const { container } = render(<InternetGatewayNode {...createIGWNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-400');
  });

  it('renders with transitioning status styling', () => {
    const data = { ...defaultIGWData, displayStatus: 'transitioning' as const };
    const { container } = render(<InternetGatewayNode {...createIGWNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-yellow-500');
  });

  it('renders with error status styling', () => {
    const data = { ...defaultIGWData, displayStatus: 'error' as const };
    const { container } = render(<InternetGatewayNode {...createIGWNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-red-500');
  });

  it('renders handles for connections', () => {
    render(<InternetGatewayNode {...createIGWNodeProps(defaultIGWData)} />);
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });
});

describe('NATGatewayNode', () => {
  const defaultNATData: NATGatewayNodeData = {
    type: 'nat-gateway',
    label: 'nat-gw-1',
    natGatewayId: 'nat-12345',
    displayStatus: 'active',
    publicIp: '54.1.2.3',
    tfManaged: false,
  };

  it('renders the node label', () => {
    render(<NATGatewayNode {...createNATNodeProps(defaultNATData)} />);
    expect(screen.getByText('nat-gw-1')).toBeInTheDocument();
  });

  it('renders the public IP when provided', () => {
    render(<NATGatewayNode {...createNATNodeProps(defaultNATData)} />);
    expect(screen.getByText('54.1.2.3')).toBeInTheDocument();
  });

  it('does not render public IP when not provided', () => {
    const data = { ...defaultNATData, publicIp: undefined };
    render(<NATGatewayNode {...createNATNodeProps(data)} />);
    expect(screen.queryByText('54.1.2.3')).not.toBeInTheDocument();
  });

  it('renders default label when no label provided', () => {
    const data = { ...defaultNATData, label: '' };
    render(<NATGatewayNode {...createNATNodeProps(data)} />);
    expect(screen.getByText('NAT')).toBeInTheDocument();
  });

  it('renders TF badge when terraform managed', () => {
    const data = { ...defaultNATData, tfManaged: true };
    render(<NATGatewayNode {...createNATNodeProps(data)} />);
    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('does not render TF badge when not terraform managed', () => {
    render(<NATGatewayNode {...createNATNodeProps(defaultNATData)} />);
    expect(screen.queryByText('TF')).not.toBeInTheDocument();
  });

  it('renders with active status styling', () => {
    const { container } = render(<NATGatewayNode {...createNATNodeProps(defaultNATData)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-green-500');
  });

  it('renders with inactive status styling', () => {
    const data = { ...defaultNATData, displayStatus: 'inactive' as const };
    const { container } = render(<NATGatewayNode {...createNATNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-400');
  });

  it('renders handles for connections', () => {
    render(<NATGatewayNode {...createNATNodeProps(defaultNATData)} />);
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });
});
