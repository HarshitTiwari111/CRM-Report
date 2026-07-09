import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiAlertTriangle,
  FiTrendingUp,
  FiTrendingDown,
  FiPercent,
  FiList,
} from 'react-icons/fi';
import { PageHeader, StatCard, Card, Badge, statusColor, priorityColor } from '../../components/ui';
import { getEmployeeDashboard } from '../../api/dashboard';
import { getGoogleSheets, getGoogleSheetTasks } from '../../api/googleSheets';

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
  const data = task.data || {};
  const entries = Object.entries(data);
  const titleEntry =
    entries.find(([key]) => /task.?name|title|subject/i.test(key)) ||
    entries.find(([, value]) => String(value || '').trim());

  return String(titleEntry?.[1] || `Sheet row #${task.rowNumber}`).trim();
};

export default function EmployeeDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: getEmployeeDashboard,
    select: (res) => res.data.data,
  });

  const { data: configsRes } = useQuery({
    queryKey: ['google-sheets-configs'],
    queryFn: getGoogleSheets,
  });

  const config = configsRes?.data?.data?.[0] || null;

  const { data: sheetTasksRes, isLoading: sheetTasksLoading } = useQuery({
    queryKey: ['google-sheets-tasks', 'employee-dashboard', config?._id],
    queryFn: () =>
      getGoogleSheetTasks(config?._id, {
        page: 1,
        limit: 500,
        view: 'mine',
      }),
    enabled: Boolean(config?._id),
    refetchInterval: 10000,
  });

  const apiCards = data?.cards || {};
  const apiRecentTasks = data?.recentTasks || [];
  const upcomingDeadlines = data?.upcomingDeadlines || [];
  const sheetTasks = sheetTasksRes?.data?.data || [];
  const dashboardAlreadyHasSheetTasks = apiRecentTasks.some((task) => task.source === 'google-sheet');

  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const sheetStats = sheetTasks.reduce(
    (acc, task) => {
      const status = task.status || 'assigned';
      const assignedAt = new Date(task.assignedAt || task.createdAt || task.updatedAt);
      const progress = Number(task.progress) || 0;

      acc.totalAssigned += 1;
      acc.progressTotal += progress;

      if (status === 'completed') acc.completed += 1;
      else if (status === 'in-progress') acc.inProgress += 1;
      else acc.pending += 1;

      if (assignedAt >= todayStart && assignedAt <= todayEnd) acc.todayTasks += 1;
      if (assignedAt >= weekStart) acc.weeklySummary += 1;
      if (assignedAt >= monthStart) acc.monthlySummary += 1;

      return acc;
    },
    {
      totalAssigned: 0,
      todayTasks: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      weeklySummary: 0,
      monthlySummary: 0,
      progressTotal: 0,
    }
  );

  const sheetAverageProgress = sheetStats.totalAssigned
    ? Math.round(sheetStats.progressTotal / sheetStats.totalAssigned)
    : 0;

  const cards = dashboardAlreadyHasSheetTasks
    ? apiCards
    : {
        ...apiCards,
        totalAssigned: (apiCards.totalAssigned || 0) + sheetStats.totalAssigned,
        todayTasks: (apiCards.todayTasks || 0) + sheetStats.todayTasks,
        completed: (apiCards.completed || 0) + sheetStats.completed,
        pending: (apiCards.pending || 0) + sheetStats.pending,
        inProgress: (apiCards.inProgress || 0) + sheetStats.inProgress,
        weeklySummary: (apiCards.weeklySummary || 0) + sheetStats.weeklySummary,
        monthlySummary: (apiCards.monthlySummary || 0) + sheetStats.monthlySummary,
        averageProgress: sheetAverageProgress,
      };

  const sheetRecentTasks = dashboardAlreadyHasSheetTasks
    ? []
    : sheetTasks.map((task) => ({
        _id: task._id,
        title: getSheetTaskTitle(task),
        project: { name: 'Google Sheet Task' },
        priority: 'medium',
        status: task.status,
        progress: task.progress || 0,
        createdAt: task.assignedAt || task.createdAt,
        updatedAt: task.updatedAt,
        source: 'google-sheet',
      }));

  const recentTasks = [...apiRecentTasks, ...sheetRecentTasks]
    .sort((a, b) => toTimestamp(b.updatedAt || b.createdAt) - toTimestamp(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const statusLabels = {
    assigned: 'Pending',
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    hold: 'Hold',
    cancelled: 'Cancelled',
  };

  const statCards = [
    { label: 'Total Assigned', value: cards.totalAssigned, icon: FiList, color: 'blue' },
    { label: "Today's Tasks", value: cards.todayTasks, icon: FiCalendar, color: 'blue' },
    { label: 'Completed', value: cards.completed, icon: FiCheckCircle, color: 'green' },
    { label: 'Pending', value: cards.pending, icon: FiClock, color: 'yellow' },
    { label: 'In Progress', value: cards.inProgress, icon: FiLoader, color: 'purple' },
    { label: 'Overdue', value: cards.overdue, icon: FiAlertTriangle, color: 'red' },
    { label: 'Weekly Summary', value: cards.weeklySummary, icon: FiTrendingUp, color: 'indigo' },
    { label: 'Monthly Summary', value: cards.monthlySummary, icon: FiTrendingDown, color: 'orange' },
    { label: 'Avg Progress', value: `${cards.averageProgress ?? 0}%`, icon: FiPercent, color: 'green' },
  ];

  return (
    <div>
      <PageHeader title="My Dashboard" subtitle="Your task overview at a glance" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} value={isLoading || sheetTasksLoading ? undefined : card.value ?? 0} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Recent Tasks" actions={<Link to="/employee/tasks" className="text-xs font-medium text-primary-600 hover:text-primary-700">View all</Link>}>
          <ul className="flex flex-col gap-3">
            {recentTasks.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No recent tasks</p>}
            {recentTasks.map((task) => (
              <li key={task._id} className="flex items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{task.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{task.project?.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge color={priorityColor[task.priority] || 'slate'}>{task.priority}</Badge>
                  <Badge color={statusColor[task.status] || 'slate'}>{statusLabels[task.status] || task.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Upcoming Deadlines">
          <ul className="flex flex-col gap-3">
            {upcomingDeadlines.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No upcoming deadlines</p>}
            {upcomingDeadlines.map((task) => (
              <li key={task._id} className="flex items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{task.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Due {task.expectedCompletion ? format(new Date(task.expectedCompletion), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </div>
                <Badge color={priorityColor[task.priority] || 'slate'}>{task.priority}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
