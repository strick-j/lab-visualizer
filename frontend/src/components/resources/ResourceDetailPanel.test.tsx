import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { EC2DetailPanel, RDSDetailPanel } from './ResourceDetailPanel';
import type { EC2Instance, RDSInstance } from '@/types';

const mockEC2Instance: EC2Instance = {
  instance_id: 'i-1234567890abcdef0',
  name: 'Test EC2 Instance',
  instance_type: 't3.micro',
  state: 'running',
  display_status: 'active',
  region_name: 'us-east-1',
  availability_zone: 'us-east-1a',
  private_ip: '10.0.1.100',
  public_ip: '54.123.45.67',
  vpc_id: 'vpc-12345678',
  subnet_id: 'subnet-12345678',
  tf_managed: true,
  tf_state_source: 'prod/terraform.tfstate',
  tf_resource_address: 'aws_instance.web_server',
  launch_time: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T12:00:00Z',
  tags: {
    Environment: 'Production',
    Team: 'DevOps',
  },
};

const mockRDSInstance: RDSInstance = {
  db_instance_identifier: 'prod-db-01',
  name: 'Production Database',
  db_instance_class: 'db.t3.micro',
  status: 'available',
  display_status: 'active',
  region_name: 'us-east-1',
  engine: 'mysql',
  engine_version: '8.0.28',
  allocated_storage: 100,
  multi_az: true,
  endpoint: 'prod-db-01.abc123.us-east-1.rds.amazonaws.com',
  port: 3306,
  vpc_id: 'vpc-12345678',
  availability_zone: 'us-east-1a',
  tf_managed: true,
  tf_state_source: 'prod/terraform.tfstate',
  tf_resource_address: 'aws_db_instance.main',
  updated_at: '2024-01-15T12:00:00Z',
};

describe('EC2DetailPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders instance details header', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Instance Details')).toBeInTheDocument();
  });

  it('renders instance name', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Test EC2 Instance')).toBeInTheDocument();
  });

  it('renders instance ID when no name', () => {
    const instanceWithoutName = { ...mockEC2Instance, name: '' };
    render(<EC2DetailPanel instance={instanceWithoutName} onClose={mockOnClose} />);
    // Instance ID appears both as title and in Basic Info section
    const instanceIds = screen.getAllByText('i-1234567890abcdef0');
    expect(instanceIds).toHaveLength(2);
  });

  it('renders status badge', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders terraform badge', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Managed')).toBeInTheDocument();
  });

  it('renders basic info section', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Instance ID')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('t3.micro')).toBeInTheDocument();
    expect(screen.getByText('State')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('renders network section', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Private IP')).toBeInTheDocument();
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
    expect(screen.getByText('Public IP')).toBeInTheDocument();
    expect(screen.getByText('54.123.45.67')).toBeInTheDocument();
  });

  it('renders terraform section when managed', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Terraform')).toBeInTheDocument();
    expect(screen.getByText('State File')).toBeInTheDocument();
    expect(screen.getByText('prod/terraform.tfstate')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('aws_instance.web_server')).toBeInTheDocument();
  });

  it('does not render terraform section when not managed', () => {
    const unmanagedInstance = { ...mockEC2Instance, tf_managed: false };
    render(<EC2DetailPanel instance={unmanagedInstance} onClose={mockOnClose} />);
    expect(screen.queryByText('State File')).not.toBeInTheDocument();
  });

  it('renders timestamps section', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Timestamps')).toBeInTheDocument();
    expect(screen.getByText('Launched')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
  });

  it('renders tags section when tags exist', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('DevOps')).toBeInTheDocument();
  });

  it('does not render tags section when no tags', () => {
    const instanceWithoutTags = { ...mockEC2Instance, tags: {} };
    render(<EC2DetailPanel instance={instanceWithoutTags} onClose={mockOnClose} />);
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<EC2DetailPanel instance={mockEC2Instance} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

describe('RDSDetailPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders database details header', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Database Details')).toBeInTheDocument();
  });

  it('renders database name', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Production Database')).toBeInTheDocument();
  });

  it('renders identifier when no name', () => {
    const instanceWithoutName = { ...mockRDSInstance, name: '' };
    render(<RDSDetailPanel instance={instanceWithoutName} onClose={mockOnClose} />);
    // Identifier appears both as title and in Basic Info section
    const identifiers = screen.getAllByText('prod-db-01');
    expect(identifiers).toHaveLength(2);
  });

  it('renders status badge', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders terraform badge', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Managed')).toBeInTheDocument();
  });

  it('renders basic info section', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Identifier')).toBeInTheDocument();
    expect(screen.getByText('prod-db-01')).toBeInTheDocument();
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getByText('db.t3.micro')).toBeInTheDocument();
  });

  it('renders database section', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText('mysql 8.0.28')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('100 GB')).toBeInTheDocument();
    expect(screen.getByText('Multi-AZ')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('renders Multi-AZ as No when false', () => {
    const singleAZInstance = { ...mockRDSInstance, multi_az: false };
    render(<RDSDetailPanel instance={singleAZInstance} onClose={mockOnClose} />);
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders connection section', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.getByText('3306')).toBeInTheDocument();
  });

  it('renders terraform section when managed', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Terraform')).toBeInTheDocument();
    expect(screen.getByText('State File')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('aws_db_instance.main')).toBeInTheDocument();
  });

  it('does not render terraform section when not managed', () => {
    const unmanagedInstance = { ...mockRDSInstance, tf_managed: false };
    render(<RDSDetailPanel instance={unmanagedInstance} onClose={mockOnClose} />);
    expect(screen.queryByText('State File')).not.toBeInTheDocument();
  });

  it('renders timestamps section', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    expect(screen.getByText('Timestamps')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<RDSDetailPanel instance={mockRDSInstance} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
