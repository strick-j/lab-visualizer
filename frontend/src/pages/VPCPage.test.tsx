import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { VPCPage } from './VPCPage';

// Mock all VPC list components
vi.mock('@/components/vpc/VPCList', () => ({
  VPCList: ({ filters }: { filters: object }) => (
    <div data-testid="vpc-list">VPC List {JSON.stringify(filters)}</div>
  ),
}));

vi.mock('@/components/vpc/SubnetList', () => ({
  SubnetList: ({ filters }: { filters: object }) => (
    <div data-testid="subnet-list">Subnet List {JSON.stringify(filters)}</div>
  ),
}));

vi.mock('@/components/vpc/IGWList', () => ({
  IGWList: ({ filters }: { filters: object }) => (
    <div data-testid="igw-list">IGW List {JSON.stringify(filters)}</div>
  ),
}));

vi.mock('@/components/vpc/NATGatewayList', () => ({
  NATGatewayList: ({ filters }: { filters: object }) => (
    <div data-testid="nat-gateway-list">NAT Gateway List {JSON.stringify(filters)}</div>
  ),
}));

vi.mock('@/components/vpc/ElasticIPList', () => ({
  ElasticIPList: ({ filters }: { filters: object }) => (
    <div data-testid="elastic-ip-list">Elastic IP List {JSON.stringify(filters)}</div>
  ),
}));

describe('VPCPage', () => {
  it('renders page title', () => {
    render(<VPCPage />);
    expect(screen.getByText('VPC Network Resources')).toBeInTheDocument();
  });

  it('renders page description', () => {
    render(<VPCPage />);
    expect(screen.getByText('Virtual Private Cloud networking components')).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(<VPCPage />);
    expect(screen.getByText('VPCs')).toBeInTheDocument();
    expect(screen.getByText('Subnets')).toBeInTheDocument();
    expect(screen.getByText('Internet Gateways')).toBeInTheDocument();
    expect(screen.getByText('NAT Gateways')).toBeInTheDocument();
    expect(screen.getByText('Elastic IPs')).toBeInTheDocument();
  });

  it('shows VPCs tab content by default', () => {
    render(<VPCPage />);
    expect(screen.getByTestId('vpc-list')).toBeInTheDocument();
  });

  it('switches to Subnets tab when clicked', () => {
    render(<VPCPage />);

    fireEvent.click(screen.getByText('Subnets'));

    expect(screen.getByTestId('subnet-list')).toBeInTheDocument();
    expect(screen.queryByTestId('vpc-list')).not.toBeInTheDocument();
  });

  it('switches to Internet Gateways tab when clicked', () => {
    render(<VPCPage />);

    fireEvent.click(screen.getByText('Internet Gateways'));

    expect(screen.getByTestId('igw-list')).toBeInTheDocument();
  });

  it('switches to NAT Gateways tab when clicked', () => {
    render(<VPCPage />);

    fireEvent.click(screen.getByText('NAT Gateways'));

    expect(screen.getByTestId('nat-gateway-list')).toBeInTheDocument();
  });

  it('switches to Elastic IPs tab when clicked', () => {
    render(<VPCPage />);

    fireEvent.click(screen.getByText('Elastic IPs'));

    expect(screen.getByTestId('elastic-ip-list')).toBeInTheDocument();
  });

  it('renders network icon', () => {
    const { container } = render(<VPCPage />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('can switch between tabs multiple times', () => {
    render(<VPCPage />);

    // Start with VPCs
    expect(screen.getByTestId('vpc-list')).toBeInTheDocument();

    // Go to Subnets
    fireEvent.click(screen.getByText('Subnets'));
    expect(screen.getByTestId('subnet-list')).toBeInTheDocument();

    // Go back to VPCs
    fireEvent.click(screen.getByText('VPCs'));
    expect(screen.getByTestId('vpc-list')).toBeInTheDocument();
  });
});
