import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiSearch, FiCheckSquare } from 'react-icons/fi';
import { getGoogleSheets, getGoogleSheetTasks, updateGoogleSheetTaskProgress } from '../../api/googleSheets';
import { Input, PageHeader } from '../../components/ui';
import AssignedTasksTable from '../shared/AssignedTasksTable';

export default function AssignedTasksPage() {
  const [search, setSearch] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState('');
  const queryClient = useQueryClient();

  const { data: configsRes, isLoading: configLoading } = useQuery({
    queryKey: ['google-sheets-configs'],
    queryFn: getGoogleSheets,
  });

  const config = configsRes?.data?.data?.[0] || null;

  const { data: tasksRes, isLoading, isFetching } = useQuery({
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

  const tasks = tasksRes?.data?.data || [];

  const updateProgressMutation = useMutation({
    mutationFn: ({ taskId, payload }) => updateGoogleSheetTaskProgress(taskId, payload),
    onMutate: ({ taskId }) => setUpdatingTaskId(taskId),
    onSuccess: () => {
      toast.success('Task progress updated');
      queryClient.invalidateQueries({ queryKey: ['google-sheets-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'employee'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update task progress'),
    onSettled: () => setUpdatingTaskId(''),
  });

  const handleUpdateProgress = (taskId, payload) => {
    updateProgressMutation.mutate({ taskId, payload });
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
      <PageHeader title="My Assigned Tasks" subtitle="Tasks assigned to you by admin or claimed by you" />

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
              headers={config.headers || []}
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
