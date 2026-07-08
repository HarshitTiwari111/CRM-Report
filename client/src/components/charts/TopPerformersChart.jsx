import { FiAward } from 'react-icons/fi';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import { cn } from '../../utils/cn';

const RANK_STYLES = [
  'bg-amber-100 text-amber-700 ring-2 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700',
  'bg-slate-200 text-slate-600 ring-2 ring-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600',
  'bg-orange-100 text-orange-700 ring-2 ring-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-700',
];

export default function TopPerformersChart({ data, isLoading }) {
  const performers = data || [];
  const maxCompleted = Math.max(1, ...performers.map((p) => p.completedTasks || 0));

  return (
    <Card
      title="Top Performers"
      actions={<FiAward className="h-4 w-4 text-amber-500" />}
    >
      <p className="-mt-2 mb-4 text-xs text-slate-400 dark:text-slate-500">Ranked by completed tasks this period</p>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : performers.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <FiAward className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No completed tasks yet</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {performers.map((performer, idx) => (
            <li
              key={performer.employeeId || performer.email || idx}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  RANK_STYLES[idx] || 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                )}
              >
                {idx + 1}
              </span>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                {performer.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{performer.name}</p>
                  <p className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {performer.completedTasks} <span className="font-normal text-slate-400 dark:text-slate-500">tasks</span>
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${Math.max(6, ((performer.completedTasks || 0) / maxCompleted) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
