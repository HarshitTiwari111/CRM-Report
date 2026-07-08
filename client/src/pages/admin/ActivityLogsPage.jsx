import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PageHeader, Input, DataTable } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { getActivityLogs } from '../../api/activityLogs';

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedUser = useDebounce(user);

  const params = useMemo(
    () => ({
      page,
      limit,
      user: debouncedUser || undefined,
      action: action || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [page, limit, debouncedUser, action, dateFrom, dateTo]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', params],
    queryFn: () => getActivityLogs(params),
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const formatDetails = (r) => {
    const value = r.details ?? r.description;
    if (!value) return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${typeof val === 'object' && val !== null ? JSON.stringify(val) : val}`)
        .join(', ');
    }
    return String(value);
  };

  const columns = [
    { key: 'user', header: 'User', render: (r) => r.user?.name || r.userName || '—' },
    { key: 'action', header: 'Action', render: (r) => r.action },
    { key: 'details', header: 'Details', render: (r) => formatDetails(r) },
    { key: 'createdAt', header: 'When', render: (r) => (r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy HH:mm') : '—') },
  ];

  return (
    <div>
      <PageHeader title="Activity Logs" subtitle="Audit trail of user activity across the system" />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Input placeholder="Filter by user..." value={user} onChange={(e) => { setUser(e.target.value); setPage(1); }} />
        <Input placeholder="Filter by action..." value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          page={page}
          limit={limit}
          total={data?.meta?.total || 0}
          onPageChange={setPage}
          rowKey={(r) => r._id}
          emptyMessage="No activity logs found"
        />
      </div>
    </div>
  );
}
