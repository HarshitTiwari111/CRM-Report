import { cn } from '../../utils/cn';

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export default function Spinner({ size = 'md', className }) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-primary-600',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
