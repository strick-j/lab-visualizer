import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { NATGatewayDetailPanel } from './NATGatewayDetailPanel';

const mockNATGateway = {
  nat_gateway_id: 'nat-123456',
  name: 'NAT Gateway 1',
  vpc_id: 'vpc-123',
  subnet_id: 'subnet-123',
  display_status: 'active' as const,
  state: 'available',
  connectivity_type: 'public',
  primary_public_ip: '54.1.2.3',
  primary_private_ip: '10.0.1.100',
  allocation_id: 'eipalloc-123',
  network_interface_id: 'eni-123',
  region_name: 'us-east-1',
  tf_managed: true,
  tf_state_source: 'prod/terraform.tfstate',
  tf_resource_address: 'aws_nat_gateway.main',
  updated_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  tags: { Environment: 'production' },
};

describe('NATGatewayDetailPanel', () => {
  const mockOnClose = vi.fn();

  it('renders panel header', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('NAT Gateway Details')).toBeInTheDocument();
  });

  it('renders NAT gateway name', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('NAT Gateway 1')).toBeInTheDocument();
  });

  it('renders NAT gateway ID', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('nat-123456')).toBeInTheDocument();
  });

  it('renders VPC ID', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('vpc-123')).toBeInTheDocument();
  });

  it('renders subnet ID', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('subnet-123')).toBeInTheDocument();
  });

  it('renders connectivity type', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    // Multiple "public" labels may exist (badge and detail row)
    const publicElements = screen.getAllByText('public');
    expect(publicElements.length).toBeGreaterThan(0);
  });

  it('renders public IP', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('54.1.2.3')).toBeInTheDocument();
  });

  it('renders private IP', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
  });

  it('renders allocation ID', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('eipalloc-123')).toBeInTheDocument();
  });

  it('renders network interface ID', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('eni-123')).toBeInTheDocument();
  });

  it('renders terraform section when managed', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('prod/terraform.tfstate')).toBeInTheDocument();
    expect(screen.getByText('aws_nat_gateway.main')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<NATGatewayDetailPanel natGateway={mockNATGateway} onClose={mockOnClose} />);
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not show terraform section when not managed', () => {
    const unmanagedNAT = { ...mockNATGateway, tf_managed: false };
    render(<NATGatewayDetailPanel natGateway={unmanagedNAT} onClose={mockOnClose} />);
    expect(screen.queryByText('prod/terraform.tfstate')).not.toBeInTheDocument();
  });
});
