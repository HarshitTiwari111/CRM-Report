import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiArrowLeft, FiCheckCircle, FiClock, FiTrendingUp, FiAward } from 'react-icons/fi';
import { PageHeader, Button, Spinner, StatCard } from '../../components/ui';
import { getUserPerformance, getUser } from '../../api/users';

export default function EmployeePerformancePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: employee } = useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser(id),
    select: (res) => res.data.data,
  });

  const { data: performance, isLoading } = useQuery({
    queryKey: ['users', id, 'performance'],
    queryFn: () => getUserPerformance(id),
    select: (res) => res.data.data,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const completionRate = performance?.totalTasks
    ? Math.round((performance.completed / performance.totalTasks) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title={`Performance — ${employee?.name || ''}`}
        subtitle={employee?.designation}
        actions={
          <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/employees')}>
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Tasks Completed" value={performance?.completed ?? 0} icon={FiCheckCircle} color="green" />
        <StatCard label="Avg. Hours" value={performance?.avgHours ?? '—'} icon={FiClock} color="blue" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} icon={FiTrendingUp} color="indigo" />
        <StatCard label="Total Tasks" value={performance?.totalTasks ?? 0} icon={FiAward} color="yellow" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pending" value={performance?.pending ?? 0} icon={FiClock} color="yellow" />
        <StatCard label="In Progress" value={performance?.inProgress ?? 0} icon={FiClock} color="blue" />
        <StatCard label="On Hold" value={performance?.hold ?? 0} icon={FiClock} color="orange" />
        <StatCard label="Total Hours" value={performance?.totalHours ?? 0} icon={FiClock} color="slate" />
      </div>
    </div>
  );
}
