import { useQuery } from '@tanstack/react-query';
import {
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiAlertTriangle,
  FiTrendingUp,
  FiTrendingDown,
  FiBriefcase,
  FiUserCheck,
} from 'react-icons/fi';
import { PageHeader, StatCard, Card, Badge, statusColor } from '../../components/ui';
import TopPerformersChart from '../../components/charts/TopPerformersChart';
import CompletionTrendChart from '../../components/charts/CompletionTrendChart';
import { getAdminDashboard } from '../../api/dashboard';
import { getTopPerformers, getCompletionTrend } from '../../api/analytics';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: getAdminDashboard,
    select: (res) => res.data.data,
  });

  const { data: topPerformers, isLoading: topLoading } = useQuery({
    queryKey: ['analytics', 'top-performers'],
    queryFn: getTopPerformers,
    select: (res) => res.data.data,
  });

  const { data: completionTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics', 'completion-trend'],
    queryFn: getCompletionTrend,
    select: (res) => res.data.data,
  });

  const cards = dashboard?.cards || {};
  const recentActivity = dashboard?.recentActivity || {};

  const statCards = [
    { label: 'Total Employees', value: cards.totalEmployees, icon: FiUsers, color: 'indigo' },
    { label: "Today's Tasks", value: cards.todayTasks, icon: FiCalendar, color: 'blue' },
    { label: 'Completed', value: cards.completed, icon: FiCheckCircle, color: 'green' },
    { label: 'Pending', value: cards.pending, icon: FiClock, color: 'yellow' },
    { label: 'In Progress', value: cards.inProgress, icon: FiLoader, color: 'purple' },
    { label: 'Late', value: cards.late, icon: FiAlertTriangle, color: 'red' },
    { label: 'Weekly', value: cards.weekly, icon: FiTrendingUp, color: 'indigo' },
    { label: 'Monthly', value: cards.monthly, icon: FiTrendingDown, color: 'orange' },
    { label: 'Departments', value: cards.departments, icon: FiBriefcase, color: 'slate' },
    { label: 'Teams', value: cards.teams, icon: FiUserCheck, color: 'slate' },
  ];

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Overview of company-wide task activity and performance" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} value={dashboardLoading ? undefined : card.value ?? 0} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Recent Tasks" className="lg:col-span-1">
          <ul className="flex flex-col gap-3">
            {(recentActivity.latestTasks || []).length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">No recent tasks</p>
            )}
            {(recentActivity.latestTasks || []).map((task) => (
              <li key={task._id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{task.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{task.assignedTo?.name}</p>
                </div>
                <Badge color={statusColor[task.status] || 'slate'}>{task.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent Logins" className="lg:col-span-1">
          <ul className="flex flex-col gap-3">
            {(recentActivity.latestLogins || []).length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">No recent logins</p>
            )}
            {(recentActivity.latestLogins || []).map((login) => (
              <li key={login._id || login.userId} className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{login.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {login.lastLogin ? format(new Date(login.lastLogin), 'MMM d, HH:mm') : ''}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent Reports" className="lg:col-span-1">
          <ul className="flex flex-col gap-3">
            {(recentActivity.latestReports || []).length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">No recent reports</p>
            )}
            {(recentActivity.latestReports || []).map((rep, idx) => (
              <li key={rep._id || idx} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{rep.title || rep.type}</p>
                  {rep.generatedBy && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">by {rep.generatedBy}</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {rep.createdAt ? format(new Date(rep.createdAt), 'MMM d') : ''}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopPerformersChart data={topPerformers} isLoading={topLoading} />
        <CompletionTrendChart data={completionTrend} isLoading={trendLoading} />
      </div>
    </div>
  );
}
