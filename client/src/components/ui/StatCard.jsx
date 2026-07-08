import { cn } from '../../utils/cn';

const colorMap = {
  indigo: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  blue: 'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
};

export default function StatCard({ label, value, icon: Icon, color = 'indigo', className }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 card-shadow dark:border-slate-700 dark:bg-slate-800', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colorMap[color])}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{value ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
