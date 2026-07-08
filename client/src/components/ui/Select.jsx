import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Select = forwardRef(function Select(
  { label, error, className, containerClassName, id, options = [], placeholder, children, ...props },
  ref
) {
  const selectId = id || props.name;
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 bg-white',
          'focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400',
          'disabled:bg-slate-100 disabled:cursor-not-allowed',
          'dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-primary-900/40 dark:disabled:bg-slate-700',
          error ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Select;
