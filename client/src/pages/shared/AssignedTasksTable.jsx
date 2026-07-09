import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { FiClock, FiFileText, FiSave, FiUser } from 'react-icons/fi';
import { Badge } from '../../components/ui';

const statusColor = {
  pending: 'slate',
  assigned: 'blue',
  'in-progress': 'blue',
  completed: 'green',
  hold: 'yellow',
  cancelled: 'red',
};

const statusLabels = {
  pending: 'Pending',
  assigned: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  hold: 'Hold',
  cancelled: 'Cancelled',
};

const editableStatuses = [
  { value: 'assigned', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const pickTitleKey = (headers = []) =>
  headers.find((header) => /task.?name|title|subject/i.test(header)) || headers[1] || headers[0];

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'MMM d, yyyy HH:mm');
  } catch {
    return '-';
  }
};

const formatAssignedBy = (task) => {
  if (task.assignmentSource === 'employee') {
    return task.assignedBy?.name ? `Self (${task.assignedBy.name})` : 'Self assigned';
  }
  if (task.assignmentSource === 'admin') {
    return task.assignedBy?.name ? `Admin (${task.assignedBy.name})` : 'Assigned by admin';
  }
  return task.assignedBy?.name || '-';
};

function ProgressBar({ value = 0 }) {
  const progress = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="flex min-w-[130px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${progress}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-slate-500 dark:text-slate-400">{progress}%</span>
    </div>
  );
}

function TaskProgressEditor({ task, onUpdateProgress, isUpdating }) {
  const [status, setStatus] = useState(task.status || 'assigned');
  const [progress, setProgress] = useState(task.progress ?? 0);

  useEffect(() => {
    setStatus(task.status || 'assigned');
    setProgress(task.progress ?? 0);
  }, [task._id, task.status, task.progress]);

  const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  const hasChanges = status !== (task.status || 'assigned') || normalizedProgress !== (task.progress ?? 0);

  const handleSave = () => {
    onUpdateProgress(task._id, {
      status,
      progress: normalizedProgress,
    });
  };

  return (
    <div className="flex min-w-[360px] flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={isUpdating}
        className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-primary-900/40"
      >
        {editableStatuses.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="range"
        min="0"
        max="100"
        value={progress}
        onChange={(e) => setProgress(e.target.value)}
        disabled={isUpdating}
        className="w-28 accent-primary-600"
      />
      <input
        type="number"
        min="0"
        max="100"
        value={progress}
        onChange={(e) => setProgress(e.target.value)}
        disabled={isUpdating}
        className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-primary-900/40"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!hasChanges || isUpdating}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        title="Save progress"
      >
        <FiSave className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AssignedTasksTable({
  tasks = [],
  headers = [],
  showEmployee = true,
  onUpdateProgress,
  updatingTaskId,
}) {
  const titleKey = pickTitleKey(headers);
  const detailHeaders = headers.filter((header) => header !== titleKey).slice(0, 3);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40">
              <th className="min-w-[260px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Task
              </th>
              {showEmployee && (
                <th className="min-w-[190px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Employee
                </th>
              )}
              <th className="min-w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Assigned Time
              </th>
              <th className="min-w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Assigned By
              </th>
              <th className="min-w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="min-w-[180px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Progress
              </th>
              {onUpdateProgress && (
                <th className="min-w-[380px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Update
                </th>
              )}
              <th className="min-w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Last Updated
              </th>
              {detailHeaders.map((header) => (
                <th
                  key={header}
                  className="min-w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const data = task.data || {};
              const title = String(data[titleKey] || 'Untitled Task').trim();

              return (
                <tr key={task._id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <FiFileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">Row #{task.rowNumber}</p>
                      </div>
                    </div>
                  </td>
                  {showEmployee && (
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <FiUser className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium">{task.assignedTo?.name || '-'}</p>
                          {task.assignedTo?.employeeId && (
                            <p className="text-xs text-slate-400">{task.assignedTo.employeeId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <FiClock className="h-4 w-4 text-slate-400" />
                      {formatDateTime(task.assignedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <span className="whitespace-nowrap">{formatAssignedBy(task)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor[task.status] || 'slate'}>
                      {statusLabels[task.status] || task.status || 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar value={task.progress} />
                  </td>
                  {onUpdateProgress && (
                    <td className="px-4 py-3">
                      <TaskProgressEditor
                        task={task}
                        onUpdateProgress={onUpdateProgress}
                        isUpdating={updatingTaskId === task._id}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <span className="whitespace-nowrap">{formatDateTime(task.updatedAt)}</span>
                  </td>
                  {detailHeaders.map((header) => (
                    <td key={header} className="max-w-[240px] px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div className="truncate">{String(data[header] || '-')}</div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
