import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { SubnetDetailPanel } from './SubnetDetailPanel';

const mockSubnet = {
  id: 1,
  subnet_id: 'subnet-123456',
  vpc_id: 'vpc-123',
  name: 'Public Subnet 1',
  cidr_block: '10.0.1.0/24',
  availability_zone: 'us-east-1a',
  subnet_type: 'public' as const,
  display_status: 'active' as const,
  state: 'available',
  region_name: 'us-east-1',
  available_ip_count: 251,
  map_public_ip_on_launch: true,
  tf_managed: true,
  tf_state_source: 'prod/terraform.tfstate',
  tf_resource_address: 'aws_subnet.public',
  updated_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  is_deleted: false,
  deleted_at: null,
  tags: { Environment: 'production' },
};

describe('SubnetDetailPanel', () => {
  const mockOnClose = vi.fn();

  it('renders panel header', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('Subnet Details')).toBeInTheDocument();
  });

  it('renders subnet name', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('Public Subnet 1')).toBeInTheDocument();
  });

  it('renders subnet ID', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('subnet-123456')).toBeInTheDocument();
  });

  it('renders CIDR block', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('10.0.1.0/24')).toBeInTheDocument();
  });

  it('renders VPC ID', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('vpc-123')).toBeInTheDocument();
  });

  it('renders availability zone', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('us-east-1a')).toBeInTheDocument();
  });

  it('renders available IP count', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('251')).toBeInTheDocument();
  });

  it('renders subnet type badge', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    // Multiple "Public" badges may appear
    const publicBadges = screen.getAllByText('Public');
    expect(publicBadges.length).toBeGreaterThan(0);
  });

  it('renders auto-assign public IP status', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    // "Enabled" appears for auto-assign public IP
    const enabledElements = screen.getAllByText('Enabled');
    expect(enabledElements.length).toBeGreaterThan(0);
  });

  it('renders terraform section when managed', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('prod/terraform.tfstate')).toBeInTheDocument();
    expect(screen.getByText('aws_subnet.public')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    expect(screen.getByText('Environment')).toBeInTheDocument();
    // "production" may appear multiple times
    const productionElements = screen.getAllByText('production');
    expect(productionElements.length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', () => {
    render(<SubnetDetailPanel subnet={mockSubnet} onClose={mockOnClose} />);
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not show terraform section when not managed', () => {
    const unmanagedSubnet = { ...mockSubnet, tf_managed: false };
    render(<SubnetDetailPanel subnet={unmanagedSubnet} onClose={mockOnClose} />);
    expect(screen.queryByText('prod/terraform.tfstate')).not.toBeInTheDocument();
  });
});
