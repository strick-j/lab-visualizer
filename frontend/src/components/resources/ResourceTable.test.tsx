import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ResourceTable } from './ResourceTable';

interface TestItem {
  id: string;
  name: string;
  status: string;
}

const mockData: TestItem[] = [
  { id: '1', name: 'Item 1', status: 'active' },
  { id: '2', name: 'Item 2', status: 'inactive' },
  { id: '3', name: 'Item 3', status: 'error' },
];

const mockColumns = [
  { key: 'id', header: 'ID', render: (item: TestItem) => item.id },
  { key: 'name', header: 'Name', render: (item: TestItem) => item.name },
  { key: 'status', header: 'Status', render: (item: TestItem) => item.status },
];

describe('ResourceTable', () => {
  it('renders table headers', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders table data', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('renders empty message when data is empty', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={[]}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const handleRowClick = vi.fn();
    render(
      <ResourceTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
        onRowClick={handleRowClick}
      />
    );

    fireEvent.click(screen.getByText('Item 1'));
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('applies cursor-pointer to rows when onRowClick is provided', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
        onRowClick={() => {}}
      />
    );

    const rows = screen.getAllByRole('row').slice(1); // Skip header row
    rows.forEach((row) => {
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  it('does not apply cursor-pointer when onRowClick is not provided', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    const rows = screen.getAllByRole('row').slice(1);
    rows.forEach((row) => {
      expect(row).not.toHaveClass('cursor-pointer');
    });
  });

  it('applies custom className to columns', () => {
    const columnsWithClass = [
      {
        key: 'id',
        header: 'ID',
        render: (item: TestItem) => item.id,
        className: 'custom-column',
      },
    ];

    render(
      <ResourceTable
        columns={columnsWithClass}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    const header = screen.getByText('ID');
    expect(header).toHaveClass('custom-column');
  });

  it('renders correct number of rows', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4); // 1 header + 3 data rows
  });

  it('renders table element', () => {
    render(
      <ResourceTable
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
