import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import { PageHeader, Card, Button, DataTable, Badge } from '../../components/ui';
import { clockIn, clockOut, getMyAttendance } from '../../api/attendance';

export default function AttendancePage() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'me', month],
    queryFn: () => getMyAttendance(month),
    select: (res) => res.data.data,
  });

  const clockInMutation = useMutation({
    mutationFn: clockIn,
    onSuccess: () => {
      toast.success('Clocked in successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to clock in'),
  });

  const clockOutMutation = useMutation({
    mutationFn: clockOut,
    onSuccess: () => {
      toast.success('Clocked out successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to clock out'),
  });

  const records = Array.isArray(data) ? data : data?.records || [];

  const columns = [
    { key: 'date', header: 'Date', render: (r) => (r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—') },
    { key: 'clockIn', header: 'Clock In', render: (r) => (r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '—') },
    { key: 'clockOut', header: 'Clock Out', render: (r) => (r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '—') },
    { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'present' ? 'green' : 'yellow'}>{r.status || '—'}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Track your daily clock in and clock out" />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={FiLogIn} onClick={() => clockInMutation.mutate()} isLoading={clockInMutation.isPending}>
            Clock In
          </Button>
          <Button icon={FiLogOut} variant="secondary" onClick={() => clockOutMutation.mutate()} isLoading={clockOutMutation.isPending}>
            Clock Out
          </Button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
          />
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800">
        <DataTable
          columns={columns}
          data={records}
          isLoading={isLoading}
          page={1}
          limit={records.length || 1}
          total={records.length || 0}
          rowKey={(r) => r._id || r.date}
          emptyMessage="No attendance records for this month"
        />
      </div>
    </div>
  );
}
