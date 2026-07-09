import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiRefreshCw, FiSearch, FiUsers } from 'react-icons/fi';
import { getGoogleSheets, getGoogleSheetTasks } from '../../api/googleSheets';
import { getUsers } from '../../api/users';
import { Input, PageHeader, Select } from '../../components/ui';
import AssignedTasksTable from '../shared/AssignedTasksTable';

export default function TaskMonitorPage() {
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: configsRes, isLoading: configLoading } = useQuery({
    queryKey: ['google-sheets-configs'],
    queryFn: getGoogleSheets,
  });

  const config = configsRes?.data?.data?.[0] || null;

  const { data: usersRes } = useQuery({
    queryKey: ['users', 'task-monitor-employees'],
    queryFn: () => getUsers({ role: 'employee', status: 'active', limit: 500 }),
  });

  const employees = usersRes?.data?.data || [];

  const { data: tasksRes, isLoading, isFetching } = useQuery({
    queryKey: ['google-sheets-tasks', 'admin-monitor-page', config?._id, search, employeeFilter, statusFilter],
    queryFn: () => getGoogleSheetTasks(config?._id, {
      page: 1,
      limit: 500,
      search,
      employee: employeeFilter || undefined,
      status: statusFilter || undefined,
      assigned: employeeFilter ? undefined : 'only',
    }),
    enabled: Boolean(config?._id),
    refetchInterval: 10000,
  });

  const tasks = tasksRes?.data?.data || [];
  const activeEmployees = new Set(tasks.map((task) => task.assignedTo?._id).filter(Boolean)).size;

  if (configLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <FiRefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Employee Task Monitor" subtitle="Track which employee is working on which assigned task" />

      {!config ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
          <FiUsers className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">No Google Sheet task source is configured yet.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase text-slate-400">Assigned Tasks</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{tasks.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase text-slate-400">Active Employees</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{activeEmployees}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase text-slate-400">Status Filter</p>
              <p className="mt-1 text-2xl font-semibold capitalize text-slate-800 dark:text-slate-100">{statusFilter || 'All'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search assigned tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="w-full sm:w-80"
              icon={FiSearch}
            />
            <Select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              placeholder="All employees"
              containerClassName="w-full sm:w-56"
              options={employees.map((employee) => ({
                value: employee._id,
                label: employee.name,
              }))}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All statuses"
              containerClassName="w-full sm:w-48"
              options={[
                { value: 'assigned', label: 'Assigned' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'hold', label: 'Hold' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-12 rounded-lg border border-slate-200 bg-white animate-pulse dark:border-slate-700 dark:bg-slate-800" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
              <FiUsers className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500">No assigned tasks match the selected filters.</p>
            </div>
          ) : (
            <AssignedTasksTable tasks={tasks} headers={config.headers || []} showEmployee />
          )}
        </>
      )}
    </div>
  );
}
