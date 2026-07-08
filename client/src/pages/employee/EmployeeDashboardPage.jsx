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
} from 'react-icons/fi';
import { PageHeader, StatCard, Card, Badge, statusColor, priorityColor } from '../../components/ui';
import { getEmployeeDashboard } from '../../api/dashboard';

export default function EmployeeDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: getEmployeeDashboard,
    select: (res) => res.data.data,
  });

  const cards = data?.cards || {};
  const recentTasks = data?.recentTasks || [];
  const upcomingDeadlines = data?.upcomingDeadlines || [];

  const statCards = [
    { label: "Today's Tasks", value: cards.todayTasks, icon: FiCalendar, color: 'blue' },
    { label: 'Completed', value: cards.completed, icon: FiCheckCircle, color: 'green' },
    { label: 'Pending', value: cards.pending, icon: FiClock, color: 'yellow' },
    { label: 'In Progress', value: cards.inProgress, icon: FiLoader, color: 'purple' },
    { label: 'Overdue', value: cards.overdue, icon: FiAlertTriangle, color: 'red' },
    { label: 'Weekly Summary', value: cards.weeklySummary, icon: FiTrendingUp, color: 'indigo' },
    { label: 'Monthly Summary', value: cards.monthlySummary, icon: FiTrendingDown, color: 'orange' },
  ];

  return (
    <div>
      <PageHeader title="My Dashboard" subtitle="Your task overview at a glance" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} value={isLoading ? undefined : card.value ?? 0} />
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
                  <Badge color={statusColor[task.status] || 'slate'}>{task.status}</Badge>
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
