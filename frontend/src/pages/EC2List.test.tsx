import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { EC2ListPage } from './EC2List';

// Mock the hooks
const mockInstances = [
  {
    instance_id: 'i-123',
    name: 'web-server-1',
    instance_type: 't3.micro',
    state: 'running',
    display_status: 'active',
    private_ip: '10.0.1.100',
    public_ip: '54.1.2.3',
    availability_zone: 'us-east-1a',
    tf_managed: true,
    updated_at: '2024-01-15T12:00:00Z',
  },
  {
    instance_id: 'i-456',
    name: 'api-server-1',
    instance_type: 't3.small',
    state: 'stopped',
    display_status: 'inactive',
    private_ip: '10.0.1.101',
    public_ip: null,
    availability_zone: 'us-east-1b',
    tf_managed: false,
    updated_at: '2024-01-14T12:00:00Z',
  },
];

let mockData = { data: mockInstances, meta: { total: 2 } };
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock('@/hooks', () => ({
  useEC2Instances: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe('EC2ListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockInstances, meta: { total: 2 } };
    mockIsLoading = false;
    mockError = null;
  });

  it('renders page title', () => {
    render(<EC2ListPage />);
    expect(screen.getByText('EC2 Instances')).toBeInTheDocument();
  });

  it('renders instance count', () => {
    render(<EC2ListPage />);
    expect(screen.getByText('2 instances found')).toBeInTheDocument();
  });

  it('renders resource filters', () => {
    render(<EC2ListPage />);
    expect(screen.getByPlaceholderText('Search by name or ID...')).toBeInTheDocument();
  });

  it('renders instance data in table', () => {
    render(<EC2ListPage />);
    expect(screen.getByText('web-server-1')).toBeInTheDocument();
    expect(screen.getByText('api-server-1')).toBeInTheDocument();
    expect(screen.getByText('t3.micro')).toBeInTheDocument();
    expect(screen.getByText('t3.small')).toBeInTheDocument();
  });

  it('renders instance IDs', () => {
    render(<EC2ListPage />);
    expect(screen.getByText('i-123')).toBeInTheDocument();
    expect(screen.getByText('i-456')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<EC2ListPage />);
    // Multiple status badges may exist in the table and filters
    const activeBadges = screen.getAllByText('Active');
    const inactiveBadges = screen.getAllByText('Inactive');
    expect(activeBadges.length).toBeGreaterThan(0);
    expect(inactiveBadges.length).toBeGreaterThan(0);
  });

  it('renders terraform badges', () => {
    render(<EC2ListPage />);
    // Multiple terraform badges may exist
    const managedBadges = screen.getAllByText('Managed');
    const unmanagedBadges = screen.getAllByText('Unmanaged');
    expect(managedBadges.length).toBeGreaterThan(0);
    expect(unmanagedBadges.length).toBeGreaterThan(0);
  });

  it('renders IP addresses', () => {
    render(<EC2ListPage />);
    expect(screen.getByText('10.0.1.100')).toBeInTheDocument();
    expect(screen.getByText('54.1.2.3')).toBeInTheDocument();
    expect(screen.getByText('10.0.1.101')).toBeInTheDocument();
  });

  it('renders availability zones', () => {
    render(<EC2ListPage />);
    expect(screen.getByText('us-east-1a')).toBeInTheDocument();
    expect(screen.getByText('us-east-1b')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<EC2ListPage />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('IP Address')).toBeInTheDocument();
    expect(screen.getByText('AZ')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    mockData = null as unknown as typeof mockData;
    const { container } = render(<EC2ListPage />);
    // PageLoading shows a spinner with animate-spin class
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockError = new Error('Failed to fetch');
    mockData = null as unknown as typeof mockData;
    render(<EC2ListPage />);
    expect(screen.getByText('Error loading EC2 instances')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch EC2 instances. Please try again.')).toBeInTheDocument();
  });

  it('shows empty state when no instances', () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<EC2ListPage />);
    expect(screen.getByText('No EC2 instances found')).toBeInTheDocument();
  });

  it('shows appropriate empty state message with filters', () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<EC2ListPage />);
    expect(screen.getByText('No EC2 instances are available in your account')).toBeInTheDocument();
  });
});
