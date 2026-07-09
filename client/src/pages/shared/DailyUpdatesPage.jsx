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

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'MMM d, yyyy');
  } catch {
    return '-';
  }
};

function UpdateCard({ update, isAdmin }) {
  const items = update.items || [];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {isAdmin ? update.employee?.name || 'Employee' : 'My update'}
            </h3>
            <span className="text-xs text-slate-400">
              {update.employee?.employeeId || ''}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <FiCalendar className="h-3.5 w-3.5" />
            {formatDate(update.workDate)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <FiEdit3 className="h-3.5 w-3.5" />
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="mt-4">
        <ol className="space-y-2">
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
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <span className="font-medium text-slate-500 dark:text-slate-400">Notes:</span> {update.notes}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Daily Updates"
        subtitle={isSuperAdmin ? 'Track what each employee worked on, day by day.' : 'Add your daily work items and review your history.'}
      />

      {!isSuperAdmin && (
        <Card title="Submit Daily Update">
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
              placeholder={"One task per line\nExample:\nChecked landing page bugs\nUpdated Google Ads keywords\nShared client follow-up notes"}
              required
            />
            <Textarea
              label="Notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context, blockers, or follow-up notes"
            />

            <div className="flex items-center gap-3">
              <Button type="submit" icon={FiPlus} isLoading={createMutation.isPending}>
                Save Update
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <FiFilter className="h-3.5 w-3.5" /> Filters
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isSuperAdmin ? 'Filter by employee or date to review work logs.' : 'Search your own history.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(search || employeeFilter || dateFrom || dateTo) && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            {isFetching && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="Search work items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={FiSearch}
          />
          {isSuperAdmin ? (
            <Select
              label="Employee"
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
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-700/30 dark:text-slate-300">
              Showing your own updates
            </div>
          )}
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

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

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-40 rounded-2xl border border-slate-200 bg-white animate-pulse dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
          <FiCheckSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">No daily updates found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {updates.map((update) => (
            <UpdateCard key={update._id} update={update} isAdmin={isSuperAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
