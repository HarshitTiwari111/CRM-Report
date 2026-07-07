import { FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown, FiInbox } from 'react-icons/fi';
import Spinner from './Spinner';
import { cn } from '../../utils/cn';

/**
 * Generic data table with pagination + sorting.
 *
 * columns: [{ key, header, render?(row), sortable?, className? }]
 * data: array of row objects (each should have an `_id` or `id`)
 * page, limit, total: pagination state (1-indexed page)
 * onPageChange(page)
 * sortBy, sortOrder ('asc'|'desc'), onSortChange(key)
 * selectable: boolean, selectedIds: Set, onToggleSelect(id), onToggleSelectAll()
 */
export default function DataTable({
  columns,
  data = [],
  isLoading = false,
  page = 1,
  limit = 10,
  total = 0,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  rowKey = (row) => row._id || row.id,
  emptyMessage = 'No records found',
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const allSelected = selectable && data.length > 0 && data.every((row) => selectedIds?.has(rowKey(row)));

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-400"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500',
                    col.sortable && 'cursor-pointer select-none hover:text-slate-700',
                    col.className
                  )}
                  onClick={() => col.sortable && onSortChange?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortBy === col.key && (
                      sortOrder === 'asc' ? <FiChevronUp className="h-3.5 w-3.5" /> : <FiChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">
                  <FiInbox className="mx-auto mb-2 h-8 w-8" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50">
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(rowKey(row)) || false}
                        onChange={() => onToggleSelect?.(rowKey(row))}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-400"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-slate-700', col.cellClassName)}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && data.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span>–
            <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-medium">{total}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
