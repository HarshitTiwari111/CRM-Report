import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PageHeader, Select, Input, DataTable, Badge } from '../../components/ui';
import { getAllAttendance } from '../../api/attendance';
import { getUsers } from '../../api/users';

export default function AdminAttendancePage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [employee, setEmployee] = useState('');
  const [date, setDate] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['users', 'all-employees'],
    queryFn: () => getUsers({ limit: 200 }),
    select: (res) => res.data.data,
  });

  const params = useMemo(
    () => ({ page, limit, employee: employee || undefined, date: date || undefined }),
    [page, limit, employee, date]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'all', params],
    queryFn: () => getAllAttendance(params),
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const columns = [
    { key: 'employee', header: 'Employee', render: (r) => r.employee?.name || r.user?.name || '—' },
    { key: 'date', header: 'Date', render: (r) => (r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—') },
    { key: 'clockIn', header: 'Clock In', render: (r) => (r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '—') },
    { key: 'clockOut', header: 'Clock Out', render: (r) => (r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '—') },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'present' ? 'green' : 'yellow'}>{r.status || '—'}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Attendance" subtitle="View attendance across all employees" />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Select
          placeholder="All employees"
          value={employee}
          onChange={(e) => { setEmployee(e.target.value); setPage(1); }}
          options={(employees || []).map((e) => ({ value: e._id, label: e.name }))}
        />
        <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
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
          emptyMessage="No attendance records found"
        />
      </div>
    </div>
  );
}
