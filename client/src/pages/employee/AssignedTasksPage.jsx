import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiSearch, FiCheckSquare } from 'react-icons/fi';
import { getGoogleSheets, getGoogleSheetTasks, updateGoogleSheetTaskProgress } from '../../api/googleSheets';
import { getTasks, setTaskStatus } from '../../api/tasks';
import { useAuth } from '../../hooks/useAuth';
import { Input, PageHeader } from '../../components/ui';
import AssignedTasksTable from '../shared/AssignedTasksTable';

const manualProgressFromStatus = (status) => {
  if (status === 'completed') return 100;
  if (status === 'in-progress') return 50;
  if (status === 'hold') return 25;
  return 0;
};

const sheetStatusFromManual = (status) => {
  if (status === 'pending' || status === 'hold') return 'assigned';
  return status;
};

const manualStatusFromSheet = (status) => {
  if (status === 'assigned') return 'pending';
  return status;
};

const mapManualTaskToAssignedRow = (task, headers, currentUser) => {
  const titleKey =
    headers.find((header) => /task.?name|title|subject/i.test(header)) ||
    headers[1] ||
    headers[0] ||
    'Task Name';

  return {
    _id: task._id,
    data: { [titleKey]: task.title },
    rowNumber: 'Mine',
    assignedAt: task.createdAt,
    assignedBy: currentUser,
    assignmentSource: 'employee',
    status: sheetStatusFromManual(task.status),
    progress: manualProgressFromStatus(task.status),
    updatedAt: task.updatedAt,
    _isManual: true,
  };
};

export default function AssignedTasksPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState('');
  const queryClient = useQueryClient();

  const { data: configsRes, isLoading: configLoading } = useQuery({
    queryKey: ['google-sheets-configs'],
    queryFn: getGoogleSheets,
  });

  const config = configsRes?.data?.data?.[0] || null;
  const headers = config?.headers || [];

  const { data: tasksRes, isLoading: sheetLoading, isFetching: sheetFetching } = useQuery({
    queryKey: ['google-sheets-tasks', 'employee-assigned-page', config?._id, search],
    queryFn: () => getGoogleSheetTasks(config?._id, {
      page: 1,
      limit: 500,
      search,
      view: 'mine',
    }),
    enabled: Boolean(config?._id),
    refetchInterval: 10000,
  });

  const { data: manualTasksRes, isLoading: manualLoading, isFetching: manualFetching } = useQuery({
    queryKey: ['my-tasks', 'assigned-page', search],
    queryFn: () => getTasks({
      page: 1,
      limit: 500,
      search: search || undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    }),
    refetchInterval: 10000,
  });

  const sheetTasks = tasksRes?.data?.data || [];
  const manualTasks = manualTasksRes?.data?.data || [];
  const manualRows = manualTasks.map((task) => mapManualTaskToAssignedRow(task, headers, user));
  const tasks = [...manualRows, ...sheetTasks];
  const isLoading = sheetLoading || manualLoading;
  const isFetching = sheetFetching || manualFetching;

  const invalidateAssigned = () => {
    queryClient.invalidateQueries({ queryKey: ['google-sheets-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee'] });
  };

  const updateSheetProgressMutation = useMutation({
    mutationFn: ({ taskId, payload }) => updateGoogleSheetTaskProgress(taskId, payload),
    onMutate: ({ taskId }) => setUpdatingTaskId(taskId),
    onSuccess: () => {
      toast.success('Task progress updated');
      invalidateAssigned();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update task progress'),
    onSettled: () => setUpdatingTaskId(''),
  });

  const updateManualStatusMutation = useMutation({
    mutationFn: ({ taskId, status }) => setTaskStatus(taskId, status),
    onMutate: ({ taskId }) => setUpdatingTaskId(taskId),
    onSuccess: () => {
      toast.success('Task updated');
      invalidateAssigned();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update task'),
    onSettled: () => setUpdatingTaskId(''),
  });

  const handleUpdateProgress = (taskId, payload) => {
    const task = tasks.find((item) => item._id === taskId);
    if (task?._isManual) {
      updateManualStatusMutation.mutate({
        taskId,
        status: manualStatusFromSheet(payload.status),
      });
      return;
    }
    updateSheetProgressMutation.mutate({ taskId, payload });
  };

  if (configLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <FiRefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Assigned Tasks" subtitle="Sheet tasks assigned to you and tasks you created" />

      {!config ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
          <FiCheckSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">No Google Sheet task source is configured yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search my assigned tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="w-full sm:w-80"
              icon={FiSearch}
            />
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </div>
            )}
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {tasks.length} assigned task{tasks.length !== 1 ? 's' : ''}
              {manualRows.length > 0 && sheetTasks.length > 0 && (
                <span className="text-slate-400"> · {manualRows.length} mine · {sheetTasks.length} sheet</span>
              )}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-12 rounded-lg border border-slate-200 bg-white animate-pulse dark:border-slate-700 dark:bg-slate-800" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
              <FiCheckSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500">No tasks are assigned to you yet.</p>
            </div>
          ) : (
            <AssignedTasksTable
              tasks={tasks}
              headers={headers}
              showEmployee={false}
              onUpdateProgress={handleUpdateProgress}
              updatingTaskId={updatingTaskId}
            />
          )}
        </>
      )}
    </div>
  );
}
