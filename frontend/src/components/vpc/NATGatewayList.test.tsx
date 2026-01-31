import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { NATGatewayList } from './NATGatewayList';

const mockNATGateways = [
  {
    nat_gateway_id: 'nat-123',
    name: 'NAT Gateway 1',
    vpc_id: 'vpc-123',
    subnet_id: 'subnet-123',
    display_status: 'active' as const,
    connectivity_type: 'public',
    primary_public_ip: '54.1.2.3',
    primary_private_ip: '10.0.1.100',
    tf_managed: true,
    state: 'available',
    updated_at: '2024-01-15T12:00:00Z',
  },
  {
    nat_gateway_id: 'nat-456',
    name: 'NAT Gateway 2',
    vpc_id: 'vpc-456',
    subnet_id: 'subnet-456',
    display_status: 'active' as const,
    connectivity_type: 'private',
    primary_public_ip: null,
    primary_private_ip: '10.0.2.100',
    tf_managed: false,
    state: 'available',
    updated_at: '2024-01-14T12:00:00Z',
  },
];

let mockData = { data: mockNATGateways, meta: { total: 2 } };
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock('@/hooks', () => ({
  useNATGateways: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe('NATGatewayList', () => {
  const mockOnFilterChange = vi.fn();
  const defaultProps = {
    filters: {},
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockNATGateways, meta: { total: 2 } };
    mockIsLoading = false;
    mockError = null;
  });

  it('renders NAT Gateway count', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('2 NAT Gateways found')).toBeInTheDocument();
  });

  it('renders NAT Gateway names', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('NAT Gateway 1')).toBeInTheDocument();
    expect(screen.getByText('NAT Gateway 2')).toBeInTheDocument();
  });

  it('renders NAT Gateway IDs', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('nat-123')).toBeInTheDocument();
    expect(screen.getByText('nat-456')).toBeInTheDocument();
  });

  it('renders VPC IDs', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('vpc-123')).toBeInTheDocument();
    expect(screen.getByText('vpc-456')).toBeInTheDocument();
  });

  it('renders subnet IDs', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('subnet-123')).toBeInTheDocument();
    expect(screen.getByText('subnet-456')).toBeInTheDocument();
  });

  it('renders connectivity types', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText('private')).toBeInTheDocument();
  });

  it('renders public IPs when available', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('54.1.2.3')).toBeInTheDocument();
  });

  it('renders dash when no public IP', () => {
    render(<NATGatewayList {...defaultProps} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders private IPs', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
    expect(screen.getByText('10.0.2.100')).toBeInTheDocument();
  });

  it('renders terraform badges', () => {
    render(<NATGatewayList {...defaultProps} />);
    const managedBadges = screen.getAllByText('Managed');
    const unmanagedBadges = screen.getAllByText('Unmanaged');
    expect(managedBadges.length).toBeGreaterThan(0);
    expect(unmanagedBadges.length).toBeGreaterThan(0);
  });

  it('renders table headers', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('VPC')).toBeInTheDocument();
    expect(screen.getByText('Subnet')).toBeInTheDocument();
    expect(screen.getByText('Public IP')).toBeInTheDocument();
    expect(screen.getByText('Private IP')).toBeInTheDocument();
    expect(screen.getByText('Terraform')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    mockData = null as unknown as typeof mockData;
    const { container } = render(<NATGatewayList {...defaultProps} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockError = new Error('Failed to fetch');
    mockData = null as unknown as typeof mockData;
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('Error loading NAT Gateways')).toBeInTheDocument();
  });

  it('shows empty state when no NAT Gateways', () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByText('No NAT Gateways found')).toBeInTheDocument();
  });

  it('renders resource filters', () => {
    render(<NATGatewayList {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search by name or ID...')).toBeInTheDocument();
  });
});
