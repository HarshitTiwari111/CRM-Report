import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiArrowLeft } from 'react-icons/fi';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PageHeader, Card, Button, Spinner, StatCard } from '../../components/ui';
import { getUserPerformance, getUser } from '../../api/users';
import { FiCheckCircle, FiClock, FiTrendingUp, FiAward } from 'react-icons/fi';

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
        <StatCard label="Tasks Completed" value={performance?.tasksCompleted ?? 0} icon={FiCheckCircle} color="green" />
        <StatCard label="Avg. Completion Time" value={performance?.avgCompletionTime ?? '—'} icon={FiClock} color="blue" />
        <StatCard label="Completion Rate" value={performance?.completionRate ? `${performance.completionRate}%` : '—'} icon={FiTrendingUp} color="indigo" />
        <StatCard label="Rank" value={performance?.rank ?? '—'} icon={FiAward} color="yellow" />
      </div>

      <Card title="Performance Trend" className="mt-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performance?.trend || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
            <Line type="monotone" dataKey="completed" stroke="#4f46e5" strokeWidth={2} name="Completed" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
