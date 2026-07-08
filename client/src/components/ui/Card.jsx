import { cn } from '../../utils/cn';

export default function Card({ children, className, title, actions, padding = true }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-700">
          {title && <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}
