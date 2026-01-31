import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ElasticIPDetailPanel } from './ElasticIPDetailPanel';

const mockElasticIP = {
  id: 1,
  allocation_id: 'eipalloc-123456',
  name: 'Web Server EIP',
  public_ip: '54.1.2.3',
  private_ip: '10.0.1.100',
  display_status: 'active' as const,
  domain: 'vpc',
  association_id: 'eipassoc-123',
  instance_id: 'i-123',
  network_interface_id: null,
  region_name: 'us-east-1',
  tf_managed: true,
  tf_state_source: 'prod/terraform.tfstate',
  tf_resource_address: 'aws_eip.web',
  updated_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  is_deleted: false,
  deleted_at: null,
  tags: { Environment: 'production' },
};

describe('ElasticIPDetailPanel', () => {
  const mockOnClose = vi.fn();

  it('renders panel header', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('Elastic IP Details')).toBeInTheDocument();
  });

  it('renders Elastic IP name', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('Web Server EIP')).toBeInTheDocument();
  });

  it('renders allocation ID', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('eipalloc-123456')).toBeInTheDocument();
  });

  it('renders public IP', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('54.1.2.3')).toBeInTheDocument();
  });

  it('renders private IP', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
  });

  it('renders domain badge', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    // Multiple "vpc" labels may exist (badge and detail row)
    const vpcElements = screen.getAllByText('vpc');
    expect(vpcElements.length).toBeGreaterThan(0);
  });

  it('renders association status as Associated', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('Associated')).toBeInTheDocument();
  });

  it('renders association ID', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('eipassoc-123')).toBeInTheDocument();
  });

  it('renders instance ID when associated with instance', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    // i-123 may appear in multiple places
    const instanceIdElements = screen.getAllByText('i-123');
    expect(instanceIdElements.length).toBeGreaterThan(0);
  });

  it('renders terraform section when managed', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('prod/terraform.tfstate')).toBeInTheDocument();
    expect(screen.getByText('aws_eip.web')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ElasticIPDetailPanel elasticIP={mockElasticIP} onClose={mockOnClose} />);
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows Unassociated status when no association', () => {
    const unassociatedEIP = { ...mockElasticIP, association_id: null, instance_id: null };
    render(<ElasticIPDetailPanel elasticIP={unassociatedEIP} onClose={mockOnClose} />);
    expect(screen.getByText('Unassociated')).toBeInTheDocument();
  });

  it('renders network interface association type', () => {
    const eniEIP = {
      ...mockElasticIP,
      instance_id: null,
      network_interface_id: 'eni-456',
    };
    render(<ElasticIPDetailPanel elasticIP={eniEIP} onClose={mockOnClose} />);
    // Multiple "Network Interface" elements may appear
    const networkInterfaceElements = screen.getAllByText('Network Interface');
    expect(networkInterfaceElements.length).toBeGreaterThan(0);
    // Multiple eni-456 may appear in different sections
    const eniElements = screen.getAllByText('eni-456');
    expect(eniElements.length).toBeGreaterThan(0);
  });

  it('does not show terraform section when not managed', () => {
    const unmanagedEIP = { ...mockElasticIP, tf_managed: false };
    render(<ElasticIPDetailPanel elasticIP={unmanagedEIP} onClose={mockOnClose} />);
    expect(screen.queryByText('prod/terraform.tfstate')).not.toBeInTheDocument();
  });
});
