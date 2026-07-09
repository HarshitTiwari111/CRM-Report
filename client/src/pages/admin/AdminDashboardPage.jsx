import { useQuery } from '@tanstack/react-query';
import {
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiTrendingUp,
  FiTrendingDown,
  FiBriefcase,
} from 'react-icons/fi';
import { PageHeader, StatCard, Card, Badge, statusColor } from '../../components/ui';
import TopPerformersChart from '../../components/charts/TopPerformersChart';
import CompletionTrendChart from '../../components/charts/CompletionTrendChart';
import { getAdminDashboard } from '../../api/dashboard';
import { getTopPerformers, getCompletionTrend } from '../../api/analytics';
import { getGoogleSheets, getGoogleSheetTasks } from '../../api/googleSheets';
import { format } from 'date-fns';

const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const startOfWeek = () => {
  const date = startOfDay();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const startOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const toTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getSheetTaskTitle = (task) => {
  const entries = Object.entries(task.data || {});
  const titleEntry =
    entries.find(([key]) => /task.?name|title|subject/i.test(key)) ||
    entries.find(([, value]) => String(value || '').trim());

  return String(titleEntry?.[1] || `Sheet row #${task.rowNumber}`).trim();
};

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: getAdminDashboard,
    select: (res) => res.data.data,
  });

  const { data: configsRes } = useQuery({
    queryKey: ['google-sheets-configs'],
    queryFn: getGoogleSheets,
  });

  const config = configsRes?.data?.data?.[0] || null;

  const { data: sheetTasksRes, isLoading: sheetTasksLoading } = useQuery({
    queryKey: ['google-sheets-tasks', 'admin-dashboard', config?._id],
    queryFn: () =>
      getGoogleSheetTasks(config?._id, {
        page: 1,
        limit: 500,
      }),
    enabled: Boolean(config?._id),
    refetchInterval: 10000,
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

  const apiCards = dashboard?.cards || {};
  const apiRecentActivity = dashboard?.recentActivity || {};
  const sheetTasks = sheetTasksRes?.data?.data || [];
  const hasSheetTasks = sheetTasks.length > 0;

  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const sheetStats = sheetTasks.reduce(
    (acc, task) => {
      const status = task.status || 'pending';
      const createdAt = new Date(task.createdAt || task.updatedAt);

      acc.totalTasks += 1;
      if (status === 'completed') acc.completed += 1;
      else if (status === 'in-progress') acc.inProgress += 1;
      else acc.pending += 1;

      if (createdAt >= todayStart && createdAt <= todayEnd) acc.todayTasks += 1;
      if (createdAt >= weekStart) acc.weekly += 1;
      if (createdAt >= monthStart) acc.monthly += 1;

      return acc;
    },
    {
      totalTasks: 0,
      todayTasks: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      weekly: 0,
      monthly: 0,
    }
  );

  const cards = hasSheetTasks
    ? {
        ...apiCards,
        totalTasks: sheetStats.totalTasks,
        todayTasks: sheetStats.todayTasks,
        completed: sheetStats.completed,
        pending: sheetStats.pending,
        inProgress: sheetStats.inProgress,
        weekly: sheetStats.weekly,
        monthly: sheetStats.monthly,
      }
    : apiCards;

  const sheetRecentTasks = sheetTasks
    .map((task) => ({
      _id: task._id,
      title: getSheetTaskTitle(task),
      status: task.status || 'pending',
      assignedTo: task.assignedTo || { name: 'Unassigned' },
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }))
    .sort((a, b) => toTimestamp(b.updatedAt || b.createdAt) - toTimestamp(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const recentActivity = {
    ...apiRecentActivity,
    latestTasks: hasSheetTasks ? sheetRecentTasks : apiRecentActivity.latestTasks,
  };

  const statusLabels = {
    assigned: 'Pending',
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    hold: 'Hold',
    cancelled: 'Cancelled',
  };

  const statCards = [
    { label: 'Total Employees', value: cards.totalEmployees, icon: FiUsers, color: 'indigo' },
    { label: 'Total Tasks', value: cards.totalTasks, icon: FiBriefcase, color: 'slate' },
    { label: 'Completed', value: cards.completed, icon: FiCheckCircle, color: 'green' },
    { label: 'Pending', value: cards.pending, icon: FiClock, color: 'yellow' },
    { label: 'In Progress', value: cards.inProgress, icon: FiLoader, color: 'purple' },
    { label: 'Weekly', value: cards.weekly, icon: FiTrendingUp, color: 'indigo' },
    { label: 'Monthly', value: cards.monthly, icon: FiTrendingDown, color: 'orange' },
    { label: 'Departments', value: cards.departments, icon: FiBriefcase, color: 'slate' },
  ];

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Overview of company-wide task activity and performance" />

     <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} value={dashboardLoading || sheetTasksLoading ? undefined : card.value ?? 0} />
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
                <Badge color={statusColor[task.status] || 'slate'}>{statusLabels[task.status] || task.status}</Badge>
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
