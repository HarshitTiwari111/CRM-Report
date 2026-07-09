import { cn } from '../../utils/cn';

const colorMap = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  indigo: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

// Domain-specific mappers so components don't repeat this logic
export const statusColor = {
  pending: 'slate',
  assigned: 'blue',
  'in-progress': 'blue',
  completed: 'green',
  hold: 'yellow',
  cancelled: 'red',
};

export const priorityColor = {
  low: 'slate',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

export default function Badge({ children, color = 'slate', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        colorMap[color] || colorMap.slate,
        className
      )}
    >
      {children}
    </span>
  );
}
