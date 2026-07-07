import { FiUpload } from 'react-icons/fi';
import { cn } from '../../utils/cn';

export default function FileInput({ label, onChange, accept, error, fileName, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <label
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-slate-500 hover:bg-slate-50',
          error ? 'border-red-400' : 'border-slate-300'
        )}
      >
        <FiUpload className="h-4 w-4" />
        <span className="truncate">{fileName || 'Choose a file...'}</span>
        <input type="file" accept={accept} onChange={onChange} className="hidden" />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
