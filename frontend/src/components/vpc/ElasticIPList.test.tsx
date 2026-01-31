import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ElasticIPList } from './ElasticIPList';

const mockElasticIPs = [
  {
    allocation_id: 'eipalloc-123',
    name: 'Web Server EIP',
    public_ip: '54.1.2.3',
    private_ip: '10.0.1.100',
    display_status: 'active' as const,
    domain: 'vpc',
    association_id: 'eipassoc-123',
    instance_id: 'i-123',
    network_interface_id: null,
    tf_managed: true,
    updated_at: '2024-01-15T12:00:00Z',
  },
  {
    allocation_id: 'eipalloc-456',
    name: 'Unused EIP',
    public_ip: '54.1.2.4',
    private_ip: null,
    display_status: 'inactive' as const,
    domain: 'vpc',
    association_id: null,
    instance_id: null,
    network_interface_id: null,
    tf_managed: false,
    updated_at: '2024-01-14T12:00:00Z',
  },
  {
    allocation_id: 'eipalloc-789',
    name: 'ENI EIP',
    public_ip: '54.1.2.5',
    private_ip: '10.0.2.100',
    display_status: 'active' as const,
    domain: 'vpc',
    association_id: 'eipassoc-789',
    instance_id: null,
    network_interface_id: 'eni-123',
    tf_managed: true,
    updated_at: '2024-01-13T12:00:00Z',
  },
];

let mockData = { data: mockElasticIPs, meta: { total: 3 } };
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock('@/hooks', () => ({
  useElasticIPs: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe('ElasticIPList', () => {
  const mockOnFilterChange = vi.fn();
  const defaultProps = {
    filters: {},
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockElasticIPs, meta: { total: 3 } };
    mockIsLoading = false;
    mockError = null;
  });

  it('renders Elastic IP count', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('3 Elastic IPs found')).toBeInTheDocument();
  });

  it('renders Elastic IP names', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('Web Server EIP')).toBeInTheDocument();
    expect(screen.getByText('Unused EIP')).toBeInTheDocument();
    expect(screen.getByText('ENI EIP')).toBeInTheDocument();
  });

  it('renders allocation IDs', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('eipalloc-123')).toBeInTheDocument();
    expect(screen.getByText('eipalloc-456')).toBeInTheDocument();
    expect(screen.getByText('eipalloc-789')).toBeInTheDocument();
  });

  it('renders public IPs', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('54.1.2.3')).toBeInTheDocument();
    expect(screen.getByText('54.1.2.4')).toBeInTheDocument();
    expect(screen.getByText('54.1.2.5')).toBeInTheDocument();
  });

  it('renders private IPs when available', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
    expect(screen.getByText('10.0.2.100')).toBeInTheDocument();
  });

  it('renders domain badges', () => {
    render(<ElasticIPList {...defaultProps} />);
    const domainBadges = screen.getAllByText('vpc');
    expect(domainBadges.length).toBe(3);
  });

  it('renders instance association', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('i-123')).toBeInTheDocument();
  });

  it('renders network interface association', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('eni-123')).toBeInTheDocument();
  });

  it('renders Unassociated for unassociated IPs', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('Unassociated')).toBeInTheDocument();
  });

  it('renders terraform badges', () => {
    render(<ElasticIPList {...defaultProps} />);
    const managedBadges = screen.getAllByText('Managed');
    const unmanagedBadges = screen.getAllByText('Unmanaged');
    expect(managedBadges.length).toBeGreaterThan(0);
    expect(unmanagedBadges.length).toBeGreaterThan(0);
  });

  it('renders table headers', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Public IP')).toBeInTheDocument();
    expect(screen.getByText('Private IP')).toBeInTheDocument();
    expect(screen.getByText('Association')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Terraform')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    mockData = null as unknown as typeof mockData;
    const { container } = render(<ElasticIPList {...defaultProps} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockError = new Error('Failed to fetch');
    mockData = null as unknown as typeof mockData;
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('Error loading Elastic IPs')).toBeInTheDocument();
  });

  it('shows empty state when no Elastic IPs', () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByText('No Elastic IPs found')).toBeInTheDocument();
  });

  it('renders resource filters', () => {
    render(<ElasticIPList {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search by name or ID...')).toBeInTheDocument();
  });
});
