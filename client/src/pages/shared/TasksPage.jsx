import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiCheckCircle,
  FiArchive,
  FiClipboard,
  FiX,
} from 'react-icons/fi';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  statusColor,
  priorityColor,
  DataTable,
  ConfirmDialog,
} from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../hooks/useAuth';
import {
  getTasks,
  deleteTask,
  setTaskStatus,
  duplicateTask,
  bulkUpdateTasks,
  bulkDeleteTasks,
  getCopyPreviousTasks,
} from '../../api/tasks';
import { getProjects, getDepartments } from '../../api/metadata';
import { getUsers } from '../../api/users';
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from '../../utils/constants';
import TaskFormModal from '../../features/tasks/TaskFormModal';

export default function TasksPage() {
  const { isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [project, setProject] = useState('');
  const [department, setDepartment] = useState('');
  const [employee, setEmployee] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('taskDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [formModal, setFormModal] = useState({ open: false, task: null, prefill: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const debouncedSearch = useDebounce(search);
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => getProjects({ limit: 200 }),
    select: (res) => res.data.data,
  });
  const { data: departments } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => getDepartments({ limit: 100 }),
    select: (res) => res.data.data,
  });
  const { data: employees } = useQuery({
    queryKey: ['users', 'all-employees'],
    queryFn: () => getUsers({ limit: 200 }),
    select: (res) => res.data.data,
    enabled: isSuperAdmin,
  });

  const params = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
      status: status || undefined,
      priority: priority || undefined,
      project: project || undefined,
      department: department || undefined,
      employee: isSuperAdmin ? employee || undefined : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, status, priority, project, department, employee, dateFrom, dateTo, sortBy, sortOrder, isSuperAdmin]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', params],
    queryFn: () => getTasks(params),
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast.success('Task deleted successfully');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete task'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => setTaskStatus(id, status),
    onSuccess: () => {
      toast.success('Task marked complete');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update status'),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateTask,
    onSuccess: () => {
      toast.success('Task duplicated successfully');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to duplicate task'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => bulkUpdateTasks([id], { isArchived: true }),
    onSuccess: () => {
      toast.success('Task archived successfully');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to archive task'),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, update }) => bulkUpdateTasks(ids, update),
    onSuccess: () => {
      toast.success('Tasks updated successfully');
      invalidate();
      setSelectedIds(new Set());
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Bulk update failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteTasks,
    onSuccess: () => {
      toast.success('Tasks deleted successfully');
      invalidate();
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Bulk delete failed'),
  });

  const handleCopyPrevious = async () => {
    try {
      const res = await getCopyPreviousTasks();
      const tasksList = res.data.data;
      const prefillTask = Array.isArray(tasksList) ? tasksList[0] : tasksList;
      if (!prefillTask) {
        toast.info('No previous tasks found to copy');
        return;
      }
      setFormModal({ open: true, task: null, prefill: prefillTask });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch previous tasks');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const rows = data?.data || [];
    setSelectedIds((prev) => {
      const allSelected = rows.length > 0 && rows.every((r) => prev.has(r._id));
      if (allSelected) return new Set();
      return new Set(rows.map((r) => r._id));
    });
  };

  const handleSortChange = (key) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const columns = [
    { key: 'title', header: 'Title', sortable: true, render: (r) => <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span> },
    { key: 'project', header: 'Project', render: (r) => r.project?.name || '—' },
    ...(isSuperAdmin ? [{ key: 'assignedTo', header: 'Employee', render: (r) => r.assignedTo?.name || '—' }] : []),
    { key: 'department', header: 'Department', render: (r) => r.department?.name || '—' },
    { key: 'taskDate', header: 'Date', sortable: true, render: (r) => (r.taskDate ? format(new Date(r.taskDate), 'MMM d, yyyy') : '—') },
    { key: 'priority', header: 'Priority', render: (r) => <Badge color={priorityColor[r.priority] || 'slate'}>{r.priority}</Badge> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <Badge color={statusColor[r.status] || 'slate'}>{r.status}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button title="Edit" onClick={() => setFormModal({ open: true, task: r, prefill: null })} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
            <FiEdit2 className="h-4 w-4" />
          </button>
          {r.status !== 'completed' && (
            <button
              title="Mark complete"
              onClick={() => statusMutation.mutate({ id: r._id, status: 'completed' })}
              className="rounded-md p-1.5 text-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            >
              <FiCheckCircle className="h-4 w-4" />
            </button>
          )}
          <button title="Duplicate" onClick={() => duplicateMutation.mutate(r._id)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
            <FiCopy className="h-4 w-4" />
          </button>
          <button title="Archive" onClick={() => archiveMutation.mutate(r._id)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
            <FiArchive className="h-4 w-4" />
          </button>
          <button title="Delete" onClick={() => setDeleteTarget(r)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40">
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={isSuperAdmin ? 'All Tasks' : 'My Tasks'}
        subtitle="Track, filter and manage daily tasks"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" icon={FiClipboard} onClick={handleCopyPrevious}>
              Copy Previous Task
            </Button>
            <Button icon={FiPlus} onClick={() => setFormModal({ open: true, task: null, prefill: null })}>
              New Task
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 card-shadow dark:border-slate-700 dark:bg-slate-800">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          containerClassName="w-full sm:w-52"
        />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={TASK_STATUS_OPTIONS}
          containerClassName="w-40"
        />
        <Select
          placeholder="All priorities"
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(1); }}
          options={TASK_PRIORITY_OPTIONS}
          containerClassName="w-40"
        />
        <Select
          placeholder="All projects"
          value={project}
          onChange={(e) => { setProject(e.target.value); setPage(1); }}
          options={(projects || []).map((p) => ({ value: p._id, label: p.name }))}
          containerClassName="w-40"
        />
        <Select
          placeholder="All departments"
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
          containerClassName="w-40"
        />
        {isSuperAdmin && (
          <Select
            placeholder="All employees"
            value={employee}
            onChange={(e) => { setEmployee(e.target.value); setPage(1); }}
            options={(employees || []).map((e) => ({ value: e._id, label: e.name }))}
            containerClassName="w-40"
          />
        )}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 dark:border-slate-700">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            containerClassName="w-40"
          />
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            containerClassName="w-40"
          />
        </div>
        {(search || status || priority || project || department || employee || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setStatus(''); setPriority(''); setProject(''); setDepartment(''); setEmployee(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
            title="Reset all filters"
          >
            <FiX className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 dark:border-primary-800 dark:bg-primary-900/30">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{selectedIds.size} selected</span>
          <Button size="sm" variant="secondary" onClick={() => bulkUpdateMutation.mutate({ ids: [...selectedIds], update: { status: 'completed' } })}>
            Mark Complete
          </Button>
          <Button size="sm" variant="secondary" onClick={() => bulkUpdateMutation.mutate({ ids: [...selectedIds], update: { isArchived: true } })}>
            Archive
          </Button>
          <Button size="sm" variant="danger" onClick={() => setBulkDeleteConfirm(true)}>
            Delete Selected
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          page={page}
          limit={limit}
          total={data?.meta?.total || 0}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          rowKey={(r) => r._id}
          emptyMessage="No tasks found"
        />
      </div>

      <TaskFormModal
        isOpen={formModal.open}
        task={formModal.task}
        prefill={formModal.prefill}
        onClose={() => setFormModal({ open: false, task: null, prefill: null })}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}
        title="Delete Tasks"
        message={`Are you sure you want to delete ${selectedIds.size} selected task(s)?`}
        confirmLabel="Delete"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
