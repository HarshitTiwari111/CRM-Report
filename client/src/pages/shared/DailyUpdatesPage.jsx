import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
  FiCalendar,
  FiCheckSquare,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiEdit3,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiUser,
  FiClock,
  FiFileText,
  FiChevronRight as FiArrowRight,
} from 'react-icons/fi';
import { Button, Card, Input, PageHeader, Select, Textarea } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { createDailyUpdate, getDailyUpdates } from '../../api/dailyUpdates';
import { getUsers } from '../../api/users';

const PAGE_SIZE = 10;

const parseItems = (value) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const formatDate = (value, pattern = 'MMM d, yyyy') => {
  if (!value) return '-';
  try {
    return format(new Date(value), pattern);
  } catch {
    return '-';
  }
};

/* -------------------------------------------------------------------------- */
/* Reusable Modal                                                             */
/* -------------------------------------------------------------------------- */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable Detail Drawer (sidebar)                                           */
/* -------------------------------------------------------------------------- */
function DetailDrawer({ update, isAdmin, onClose }) {
  if (!update) return null;
  const items = update.items || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-800 sm:w-[420px]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <h3 className="pr-4 text-base font-semibold leading-snug text-slate-800 dark:text-slate-100">
            {isAdmin ? update.employee?.name || 'Employee' : 'My Update'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5">
          <div className="mb-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FiClock className="h-3.5 w-3.5" />
            <span>{formatDate(update.workDate, 'dd/MM/yyyy')}</span>
          </div>

          {isAdmin && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                {(update.employee?.name || '?').charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {update.employee?.name || 'Employee'}
                </p>
                <p className="text-xs text-slate-400">{update.employee?.employeeId || ''}</p>
              </div>
            </div>
          )}

          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <FiFileText className="h-3.5 w-3.5" /> Work Items
          </p>
          <ol className="mb-5 space-y-2">
            {items.map((item, index) => (
              <li
                key={`${update._id}-${index}`}
                className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-700/30 dark:text-slate-200"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {index + 1}
                </span>
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ol>

          {update.notes ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Notes
              </p>
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {update.notes}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                  */
/* -------------------------------------------------------------------------- */
export default function DailyUpdatesPage() {
  const { isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [workDate, setWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [itemsText, setItemsText] = useState('');
  const [notes, setNotes] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const { data: employeesRes } = useQuery({
    queryKey: ['daily-updates', 'employees'],
    queryFn: () => getUsers({ role: 'employee', status: 'active', limit: 500 }),
    enabled: isSuperAdmin,
  });

  const employees = employeesRes?.data?.data || [];

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      employeeId: isSuperAdmin ? employeeFilter || undefined : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [page, search, isSuperAdmin, employeeFilter, dateFrom, dateTo]
  );

  const { data: updatesRes, isLoading, isFetching } = useQuery({
    queryKey: ['daily-updates', queryParams],
    queryFn: () => getDailyUpdates(queryParams),
    keepPreviousData: true,
    refetchInterval: 10000,
  });

  const updates = updatesRes?.data?.data || [];
  const total = updatesRes?.data?.meta?.total || 0;
  const totalPages = updatesRes?.data?.meta?.pages || 1;

  const createMutation = useMutation({
    mutationFn: createDailyUpdate,
    onSuccess: () => {
      toast.success('Daily update saved');
      setItemsText('');
      setNotes('');
      setShowFormModal(false);
      queryClient.invalidateQueries({ queryKey: ['daily-updates'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to save daily update'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const items = parseItems(itemsText);

    if (!items.length) {
      toast.error('Please add at least one work item, one per line');
      return;
    }

    createMutation.mutate({
      workDate,
      items,
      notes: notes || undefined,
    });
  };

  const clearFilters = () => {
    setSearch('');
    setEmployeeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = search || employeeFilter || dateFrom || dateTo;

  return (
    <div className="flex flex-col gap-6">
      {/* Header row with Add Update button on the right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Daily Updates"
          subtitle={
            isSuperAdmin
              ? 'Track what each employee worked on, day by day.'
              : 'Add your daily work items and review your history.'
          }
        />
        {!isSuperAdmin && (
          <Button icon={FiPlus} onClick={() => setShowFormModal(true)} className="shrink-0">
            Add Update
          </Button>
        )}
      </div>

      {/* Submit form now lives in a modal */}
      {!isSuperAdmin && (
        <Modal open={showFormModal} onClose={() => setShowFormModal(false)} title="Submit Daily Update">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Work Date"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
              />
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-700/30 dark:text-slate-300">
                <p className="font-medium text-slate-700 dark:text-slate-200">{user?.name}</p>
                <p className="text-xs text-slate-400">Your work log will be visible to admin.</p>
              </div>
            </div>

            <Textarea
              label="Work Items"
              rows={6}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              placeholder={'One task per line\nExample:\nChecked landing page bugs\nUpdated Google Ads keywords\nShared client follow-up notes'}
              required
            />
            <Textarea
              label="Notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context, blockers, or follow-up notes"
            />

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setShowFormModal(false)}>
                Cancel
              </Button>
              <Button type="submit" icon={FiPlus} isLoading={createMutation.isPending}>
                Save Update
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Filters - plain inline inputs, no card wrapper */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1 sm:flex-none sm:w-72">
          <Input
            placeholder="Search work items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={FiSearch}
          />
        </div>

        {isSuperAdmin ? (
          <div className="w-full sm:w-56">
            <Select
              placeholder="All employees"
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value);
                setPage(1);
              }}
              options={employees.map((employee) => ({
                value: employee._id,
                label: employee.name,
              }))}
            />
          </div>
        ) : (
          <div className="flex h-[42px] items-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Your own updates
          </div>
        )}

        <div className="w-[160px]">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-[160px]">
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {isFetching && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
            Refreshing
          </span>
        )}
        {hasActiveFilters && (
          <Button variant="secondary" size="sm" icon={FiX} onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Result count + pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {total} update{total !== 1 ? 's' : ''}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={FiChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Prev
            </Button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={FiChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-14 rounded-xl border border-slate-200 bg-white animate-pulse dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
          <FiCheckSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">No daily updates found.</p>
        </div>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="max-h-[560px] overflow-y-auto no-scrollbar">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  {isSuperAdmin && <th className="px-5 py-3">Employee</th>}
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Work Items</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {updates.map((update) => {
                  const items = update.items || [];
                  const preview = items.slice(0, 2).join(', ');
                  const remaining = items.length - 2;

                  return (
                    <tr
                      key={update._id}
                      onClick={() => setSelectedUpdate(update)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      {isSuperAdmin && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                              {(update.employee?.name || '?').charAt(0)}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {update.employee?.name || 'Employee'}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <FiCalendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(update.workDate)}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <FiEdit3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {preview || '-'}
                            {remaining > 0 ? ` +${remaining} more` : ''}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {update.notes || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <FiArrowRight className="ml-auto h-4 w-4 text-slate-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail sidebar drawer */}
      {selectedUpdate && (
        <DetailDrawer
          update={selectedUpdate}
          isAdmin={isSuperAdmin}
          onClose={() => setSelectedUpdate(null)}
        />
      )}

      {/* Hides scrollbar visually while keeping scroll functional */}
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}