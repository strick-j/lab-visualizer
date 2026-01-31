import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { RDSNode } from './RDSNode';

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
  label: 'prod-database',
  engine: 'mysql 8.0',
  instanceClass: 'db.t3.micro',
  displayStatus: 'active' as const,
  tfManaged: false,
};

const createNodeProps = (data: typeof defaultData) => ({
  id: 'test-node',
  data,
  type: 'rdsNode',
  selected: false,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  dragging: false,
});

describe('RDSNode', () => {
  it('renders the node label', () => {
    render(<RDSNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('prod-database')).toBeInTheDocument();
  });

  it('renders the engine', () => {
    render(<RDSNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('mysql 8.0')).toBeInTheDocument();
  });

  it('renders the instance class', () => {
    render(<RDSNode {...createNodeProps(defaultData)} />);
    expect(screen.getByText('db.t3.micro')).toBeInTheDocument();
  });

  it('renders default label when no label provided', () => {
    const data = { ...defaultData, label: '' };
    render(<RDSNode {...createNodeProps(data)} />);
    expect(screen.getByText('RDS')).toBeInTheDocument();
  });

  it('renders TF badge when terraform managed', () => {
    const data = { ...defaultData, tfManaged: true };
    render(<RDSNode {...createNodeProps(data)} />);
    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('does not render TF badge when not terraform managed', () => {
    render(<RDSNode {...createNodeProps(defaultData)} />);
    expect(screen.queryByText('TF')).not.toBeInTheDocument();
  });

  it('renders with active status styling', () => {
    const { container } = render(<RDSNode {...createNodeProps(defaultData)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-green-500');
  });

  it('renders with inactive status styling', () => {
    const data = { ...defaultData, displayStatus: 'inactive' as const };
    const { container } = render(<RDSNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-400');
  });

  it('renders with transitioning status styling', () => {
    const data = { ...defaultData, displayStatus: 'transitioning' as const };
    const { container } = render(<RDSNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-yellow-500');
  });

  it('renders with error status styling', () => {
    const data = { ...defaultData, displayStatus: 'error' as const };
    const { container } = render(<RDSNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-red-500');
  });

  it('renders with unknown status styling', () => {
    const data = { ...defaultData, displayStatus: 'unknown' as const };
    const { container } = render(<RDSNode {...createNodeProps(data)} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain('border-gray-300');
  });

  it('renders handles for connections', () => {
    render(<RDSNode {...createNodeProps(defaultData)} />);
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });
});
