import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { TopologyPage } from './TopologyPage';

// Mock the InfrastructureTopology component
interface TopologyNodeData {
  type: string;
  label: string;
  tfManaged?: boolean;
  [key: string]: unknown;
}

vi.mock('@/components/topology', () => ({
  InfrastructureTopology: ({ onResourceSelect }: { onResourceSelect: (data: TopologyNodeData) => void }) => (
    <div data-testid="infrastructure-topology">
      <button
        data-testid="ec2-node"
        onClick={() =>
          onResourceSelect({
            type: 'ec2',
            label: 'web-server-1',
            instanceId: 'i-123',
            instanceType: 't3.micro',
            privateIp: '10.0.1.100',
            publicIp: '54.1.2.3',
            privateDns: 'ip-10-0-1-100.ec2.internal',
            publicDns: 'ec2-54-1-2-3.compute-1.amazonaws.com',
            state: 'running',
            tfManaged: true,
          })
        }
      >
        EC2 Node
      </button>
      <button
        data-testid="rds-node"
        onClick={() =>
          onResourceSelect({
            type: 'rds',
            label: 'prod-database',
            dbIdentifier: 'prod-db',
            engine: 'mysql',
            instanceClass: 'db.t3.medium',
            endpoint: 'prod-db.123456.us-east-1.rds.amazonaws.com',
            port: 3306,
            status: 'available',
            tfManaged: false,
          })
        }
      >
        RDS Node
      </button>
      <button
        data-testid="vpc-node"
        onClick={() =>
          onResourceSelect({
            type: 'vpc',
            label: 'main-vpc',
            vpcId: 'vpc-123',
            cidrBlock: '10.0.0.0/16',
            tfManaged: true,
          })
        }
      >
        VPC Node
      </button>
      <button
        data-testid="subnet-node"
        onClick={() =>
          onResourceSelect({
            type: 'subnet',
            label: 'public-subnet-1',
            subnetId: 'subnet-123',
            cidrBlock: '10.0.1.0/24',
            subnetType: 'public',
            availabilityZone: 'us-east-1a',
            tfManaged: false,
          })
        }
      >
        Subnet Node
      </button>
      <button
        data-testid="igw-node"
        onClick={() =>
          onResourceSelect({
            type: 'internet-gateway',
            label: 'main-igw',
            igwId: 'igw-123',
            tfManaged: true,
          })
        }
      >
        IGW Node
      </button>
      <button
        data-testid="nat-node"
        onClick={() =>
          onResourceSelect({
            type: 'nat-gateway',
            label: 'nat-gateway-1',
            natGatewayId: 'nat-123',
            publicIp: '54.1.2.4',
            tfManaged: true,
          })
        }
      >
        NAT Node
      </button>
    </div>
  ),
}));

describe('TopologyPage', () => {
  it('renders the topology component', () => {
    render(<TopologyPage />);
    expect(screen.getByTestId('infrastructure-topology')).toBeInTheDocument();
  });

  it('shows EC2 details when EC2 node is clicked', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('ec2-node'));

    expect(screen.getByText('EC2 Instance')).toBeInTheDocument();
    expect(screen.getByText('web-server-1')).toBeInTheDocument();
    expect(screen.getByText('i-123')).toBeInTheDocument();
    expect(screen.getByText('t3.micro')).toBeInTheDocument();
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
    expect(screen.getByText('54.1.2.3')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('shows RDS details when RDS node is clicked', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('rds-node'));

    expect(screen.getByText('RDS Database')).toBeInTheDocument();
    expect(screen.getByText('prod-database')).toBeInTheDocument();
    expect(screen.getByText('prod-db')).toBeInTheDocument();
    expect(screen.getByText('mysql')).toBeInTheDocument();
    expect(screen.getByText('db.t3.medium')).toBeInTheDocument();
    expect(screen.getByText('available')).toBeInTheDocument();
  });

  it('shows VPC details when VPC node is clicked', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('vpc-node'));

    expect(screen.getByText('VPC')).toBeInTheDocument();
    expect(screen.getByText('main-vpc')).toBeInTheDocument();
    expect(screen.getByText('vpc-123')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.0/16')).toBeInTheDocument();
  });

  it('shows Subnet details when Subnet node is clicked', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('subnet-node'));

    expect(screen.getByText('Subnet')).toBeInTheDocument();
    expect(screen.getByText('public-subnet-1')).toBeInTheDocument();
    expect(screen.getByText('subnet-123')).toBeInTheDocument();
    expect(screen.getByText('10.0.1.0/24')).toBeInTheDocument();
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText('us-east-1a')).toBeInTheDocument();
  });

  it('shows IGW details when IGW node is clicked', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('igw-node'));

    expect(screen.getByText('Internet Gateway')).toBeInTheDocument();
    expect(screen.getByText('main-igw')).toBeInTheDocument();
    expect(screen.getByText('igw-123')).toBeInTheDocument();
  });

  it('shows NAT Gateway details when NAT node is clicked', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('nat-node'));

    expect(screen.getByText('NAT Gateway')).toBeInTheDocument();
    expect(screen.getByText('nat-gateway-1')).toBeInTheDocument();
    expect(screen.getByText('nat-123')).toBeInTheDocument();
    expect(screen.getByText('54.1.2.4')).toBeInTheDocument();
  });

  it('closes detail panel when close button is clicked', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('ec2-node'));

    expect(screen.getByText('EC2 Instance')).toBeInTheDocument();

    // Find and click the close button (the X icon)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(
      (btn) => btn.querySelector('svg')?.classList.contains('lucide-x')
    );
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    // Panel should be closed
    expect(screen.queryByText('EC2 Instance')).not.toBeInTheDocument();
  });

  it('shows TF badge for terraform managed resources', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('ec2-node'));

    expect(screen.getByText('TF')).toBeInTheDocument();
  });

  it('does not show TF badge for unmanaged resources', () => {
    render(<TopologyPage />);
    fireEvent.click(screen.getByTestId('rds-node'));

    // RDS in our mock is not TF managed
    expect(screen.queryByText('TF')).not.toBeInTheDocument();
  });
});
