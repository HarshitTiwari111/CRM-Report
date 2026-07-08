import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { FiDownload, FiCalendar, FiClock, FiCheckCircle, FiList, FiFilter } from 'react-icons/fi';
import { PageHeader, Card, Button, Select, Input, Badge, statusColor, StatCard } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { downloadPdfReport } from '../../api/reports';
import { getUsers } from '../../api/users';
import { getDepartments, getProjects } from '../../api/metadata';
import { getTasks } from '../../api/tasks';
import { DATE_RANGE_PRESETS, REPORT_TYPE_OPTIONS, TASK_STATUS_OPTIONS } from '../../utils/constants';
import { cn } from '../../utils/cn';

function computeRange(preset, customFrom, customTo) {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(today, 'yyyy-MM-dd') };
    case 'yesterday': {
      const y = subDays(today, 1);
      return { dateFrom: format(y, 'yyyy-MM-dd'), dateTo: format(y, 'yyyy-MM-dd') };
    }
    case 'weekly':
      return {
        dateFrom: format(startOfWeek(today), 'yyyy-MM-dd'),
        dateTo: format(endOfWeek(today), 'yyyy-MM-dd'),
      };
    case 'monthly':
      return {
        dateFrom: format(startOfMonth(today), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    case 'quarterly':
      return {
        dateFrom: format(startOfQuarter(today), 'yyyy-MM-dd'),
        dateTo: format(endOfQuarter(today), 'yyyy-MM-dd'),
      };
    case 'yearly':
      return {
        dateFrom: format(startOfYear(today), 'yyyy-MM-dd'),
        dateTo: format(endOfYear(today), 'yyyy-MM-dd'),
      };
    case 'custom':
      return { dateFrom: customFrom, dateTo: customTo };
    default:
      return { dateFrom: undefined, dateTo: undefined };
  }
}

export default function ReportsPage() {
  const { isSuperAdmin } = useAuth();
  const [preset, setPreset] = useState('monthly');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState('monthly');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const pickerRef = useRef(null);
  const [reportType, setReportType] = useState('employee');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['users', 'all-employees'],
    queryFn: () => getUsers({ limit: 200 }),
    select: (res) => res.data.data,
    enabled: isSuperAdmin,
  });
  const { data: departments } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => getDepartments({ limit: 100 }),
    select: (res) => res.data.data,
    enabled: isSuperAdmin,
  });
  const { data: projects } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => getProjects({ limit: 200 }),
    select: (res) => res.data.data,
  });

  const { dateFrom, dateTo } = useMemo(
    () => computeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  useEffect(() => {
    if (!isPickerOpen) return undefined;
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPickerOpen]);

  const openPicker = () => {
    setDraftPreset(preset);
    setDraftFrom(customFrom);
    setDraftTo(customTo);
    setIsPickerOpen(true);
  };

  const handleSubmitRange = () => {
    setPreset(draftPreset);
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
    setIsPickerOpen(false);
  };

  const filters = useMemo(
    () => ({
      type: reportType,
      employeeId: isSuperAdmin ? employeeId || undefined : undefined,
      department: departmentId || undefined,
      project: projectId || undefined,
      status: statusFilter || undefined,
      dateFrom,
      dateTo,
    }),
    [reportType, employeeId, departmentId, projectId, statusFilter, dateFrom, dateTo, isSuperAdmin]
  );

  const previewEnabled = Boolean(dateFrom && dateTo);
  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['tasks', 'report-preview', filters],
    queryFn: () =>
      getTasks({
        employee: filters.employeeId,
        department: filters.department,
        project: filters.project,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: 1,
        limit: 8,
        sortBy: 'taskDate',
        sortOrder: 'desc',
      }),
    select: (res) => res.data,
    enabled: previewEnabled,
    keepPreviousData: true,
  });

  const previewRows = preview?.data || [];
  const totalMatching = preview?.meta?.total ?? 0;
  const totalHoursPreview = previewRows.reduce((sum, t) => sum + (t.totalHours || 0), 0);
  const completedPreview = previewRows.filter((t) => t.status === 'completed').length;

  const pdfMutation = useMutation({
    mutationFn: () => downloadPdfReport(filters),
    onSuccess: () => toast.success('PDF report downloaded successfully'),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to download PDF report'),
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and export task reports for any date range"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative inline-block" ref={pickerRef}>
              <button
                type="button"
                onClick={() => (isPickerOpen ? setIsPickerOpen(false) : openPicker())}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-400 dark:hover:border-slate-600"
              >
                <FiCalendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                {dateFrom && dateTo ? (
                  <span>
                    {format(new Date(dateFrom), 'yyyy-MM-dd')} &ndash; {format(new Date(dateTo), 'yyyy-MM-dd')}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">Select date range</span>
                )}
              </button>

              {isPickerOpen && (
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex flex-col gap-1">
                    {DATE_RANGE_PRESETS.map((opt) => {
                      const active = draftPreset === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDraftPreset(opt.value)}
                          className={cn(
                            'rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-colors',
                            active ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {draftPreset === 'custom' && (
                    <div className="mt-2 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 dark:border-slate-700">
                      <Input label="From" type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
                      <Input label="To" type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
                    </div>
                  )}

                  <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <Button className="flex-1" onClick={handleSubmitRange}>
                      Submit
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => setIsPickerOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Button icon={FiDownload} isLoading={pdfMutation.isPending} onClick={() => pdfMutation.mutate()}>
              Download PDF
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <FiFilter className="h-3.5 w-3.5" /> Filters
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={REPORT_TYPE_OPTIONS}
          />
          {isSuperAdmin && (
            <Select
              label="Employee"
              placeholder="All employees"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              options={(employees || []).map((e) => ({ value: e._id, label: e.name }))}
            />
          )}
          {isSuperAdmin && (
            <Select
              label="Department"
              placeholder="All departments"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
            />
          )}
          <Select
            label="Project"
            placeholder="All projects"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={(projects || []).map((p) => ({ value: p._id, label: p.name }))}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={TASK_STATUS_OPTIONS}
          />
        </div>
      </Card>

      <Card title="Report Preview">
        {!previewEnabled ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <FiCalendar className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Select a date range above to preview matching tasks.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Matching Tasks" value={previewLoading ? undefined : totalMatching} icon={FiList} color="indigo" />
              <StatCard
                label="Completed (shown)"
                value={previewLoading ? undefined : completedPreview}
                icon={FiCheckCircle}
                color="green"
              />
              <StatCard
                label="Hours (shown)"
                value={previewLoading ? undefined : totalHoursPreview}
                icon={FiClock}
                color="blue"
                className="col-span-2 sm:col-span-1"
              />
            </div>

            {previewLoading ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">Loading preview…</p>
              </div>
            ) : previewRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                No tasks match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Title</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employee</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Hours</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-800">
                    {previewRows.map((task) => (
                      <tr key={task._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-700 dark:text-slate-300">{task.title}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{task.assignedTo?.name || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {task.taskDate ? format(new Date(task.taskDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{task.totalHours ?? 0}</td>
                        <td className="px-4 py-2.5">
                          <Badge color={statusColor[task.status] || 'slate'}>{task.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalMatching > previewRows.length && (
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Showing {previewRows.length} of {totalMatching} matching tasks — download the full report above to get everything.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
