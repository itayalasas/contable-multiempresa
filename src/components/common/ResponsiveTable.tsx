import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Column<T> {
  key: string;
  title: string;
  render: (item: T) => React.ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  mobileCardView?: boolean;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No hay datos para mostrar',
  isLoading = false,
  mobileCardView = true
}: ResponsiveTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && sortColumn === column.key && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`${
                  onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                }`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView ? (
        <div className="md:hidden space-y-4">
          {data.map((item) => (
            <div
              key={keyExtractor(item)}
              className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${
                onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
              }`}
              onClick={() => onRowClick && onRowClick(item)}
            >
              <div className="space-y-3">
                {columns
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        {column.mobileLabel || column.title}:
                      </span>
                      <div className="text-sm text-gray-900 text-right ml-2">
                        {column.render(item)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="md:hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.filter((c) => !c.hideOnMobile).map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase"
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={keyExtractor(item)} onClick={() => onRowClick && onRowClick(item)}>
                  {columns.filter((c) => !c.hideOnMobile).map((column) => (
                    <td key={column.key} className="px-3 py-2 text-sm text-gray-900">
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
