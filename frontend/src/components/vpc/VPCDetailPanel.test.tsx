import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { VPCDetailPanel } from './VPCDetailPanel';

const mockVPC = {
  vpc_id: 'vpc-123456',
  name: 'Production VPC',
  cidr_block: '10.0.0.0/16',
  display_status: 'active' as const,
  state: 'available',
  region_name: 'us-east-1',
  is_default: false,
  enable_dns_support: true,
  enable_dns_hostnames: true,
  tf_managed: true,
  tf_state_source: 'prod/terraform.tfstate',
  tf_resource_address: 'aws_vpc.main',
  updated_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  instance_tenancy: 'default',
  tags: { Environment: 'production', Project: 'main' },
};

describe('VPCDetailPanel', () => {
  const mockOnClose = vi.fn();

  it('renders panel header', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('VPC Details')).toBeInTheDocument();
  });

  it('renders VPC name', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('Production VPC')).toBeInTheDocument();
  });

  it('renders VPC ID', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('vpc-123456')).toBeInTheDocument();
  });

  it('renders CIDR block', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('10.0.0.0/16')).toBeInTheDocument();
  });

  it('renders state', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('available')).toBeInTheDocument();
  });

  it('renders region', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
  });

  it('renders DNS configuration', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    // Two "Enabled" labels for DNS Support and DNS Hostnames
    const enabledElements = screen.getAllByText('Enabled');
    expect(enabledElements.length).toBe(2);
  });

  it('renders terraform section when managed', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('prod/terraform.tfstate')).toBeInTheDocument();
    expect(screen.getByText('aws_vpc.main')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('Environment')).toBeInTheDocument();
    // "production" may appear multiple times
    const productionElements = screen.getAllByText('production');
    expect(productionElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Project')).toBeInTheDocument();
    // "main" may appear in multiple places
    const mainElements = screen.getAllByText('main');
    expect(mainElements.length).toBeGreaterThan(0);
  });

  it('renders status badge', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders terraform badge', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    expect(screen.getByText('Managed')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<VPCDetailPanel vpc={mockVPC} onClose={mockOnClose} />);
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows Default VPC badge when is_default is true', () => {
    const defaultVPC = { ...mockVPC, is_default: true };
    render(<VPCDetailPanel vpc={defaultVPC} onClose={mockOnClose} />);
    // Multiple "Default VPC" elements may appear (badge and detail row)
    const defaultVpcElements = screen.getAllByText('Default VPC');
    expect(defaultVpcElements.length).toBeGreaterThan(0);
  });

  it('does not show terraform section when not managed', () => {
    const unmanagedVPC = { ...mockVPC, tf_managed: false };
    render(<VPCDetailPanel vpc={unmanagedVPC} onClose={mockOnClose} />);
    expect(screen.queryByText('prod/terraform.tfstate')).not.toBeInTheDocument();
  });
});
