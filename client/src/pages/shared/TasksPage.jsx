import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  FiRefreshCw, FiTrash2, FiAlertTriangle, FiLink,
  FiSearch, FiGlobe, FiLock, FiCopy, FiCheckCircle, FiGrid,
  FiClock, FiUser, FiTag, FiX,
} from 'react-icons/fi';
import {
  PageHeader, Button, Input, ConfirmDialog, Card,
  Select,
} from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import {
  getGoogleSheets, saveGoogleSheet, syncGoogleSheet,
  getGoogleSheetTasks, deleteGoogleSheet,
  selfAssignGoogleSheetTask, assignGoogleSheetTask,
} from '../../api/googleSheets';
import { getUsers } from '../../api/users';

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────────────────── */
const STATUS_META = {
  pending: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  assigned: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  'in-progress': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  hold: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};
const PRIORITY_META = {
  low: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' },
  medium: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' },
};

const isStatus = (v) => !!STATUS_META[String(v).toLowerCase()];
const isPriority = (v) => !!PRIORITY_META[String(v).toLowerCase()];
const LONG = 60; // chars — above this we treat the field as a "long" field in the detail panel

/* Hide scrollbars but keep scrolling functional (Chrome/Safari + Firefox + IE/Edge) */
const HIDE_SCROLLBAR_CSS = `
  .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .hide-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;

/* ────────────────────────────────────────────────────────────────────────────
   Apps Script builder
──────────────────────────────────────────────────────────────────────────── */
const buildAppsScript = (apiBase) =>
  `function syncTasksToCRM() {\n  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();\n  var rows = sheet.getDataRange().getValues();\n  var crmUrl = "${apiBase}/api/google-sheets/webhook-sync";\n  var payload = JSON.stringify({\n    url: SpreadsheetApp.getActiveSpreadsheet().getUrl(),\n    rows: rows\n  });\n  var options = {\n    method: "post",\n    contentType: "application/json",\n    payload: payload,\n    muteHttpExceptions: true\n  };\n  var response = UrlFetchApp.fetch(crmUrl, options);\n  Logger.log("Response: " + response.getContentText());\n}`;

/* ────────────────────────────────────────────────────────────────────────────
   Small presentational bits shared by table + detail panel
──────────────────────────────────────────────────────────────────────────── */
function StatusChip({ value }) {
  const lower = String(value).toLowerCase();
  if (isStatus(lower)) {
    const m = STATUS_META[lower];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${m.bg} ${m.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
        {value}
      </span>
    );
  }
  if (isPriority(lower)) {
    const m = PRIORITY_META[lower];
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${m.bg} ${m.text}`}>
        {value}
      </span>
    );
  }
  return null;
}

function ProgressMini({ value = 0 }) {
  const progress = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${progress}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-medium text-slate-500 dark:text-slate-400">{progress}%</span>
    </div>
  );
}

const fieldIcon = (header) => {
  const h = header.toLowerCase();
  if (h.includes('date') || h.includes('timestamp')) return FiClock;
  if (h.includes('name') || h.includes('who') || h.includes('vertical')) return FiUser;
  return FiTag;
};

const formatIfDate = (header, value) => {
  const h = header.toLowerCase();
  if (!h.includes('date') && !h.includes('timestamp')) return value;
  const p = new Date(value);
  if (isNaN(p)) return value;
  try { return format(p, 'MMM d, yyyy'); } catch { return value; }
};

/* ────────────────────────────────────────────────────────────────────────────
   TaskTable — replaces the card grid
──────────────────────────────────────────────────────────────────────────── */
function TaskTable({
  rows,
  headers,
  onRowClick,
  activeRowId,
  isAdmin,
  employees = [],
  onSelfAssign,
  onAdminAssign,
  assigningTaskId,
  section = 'all',
}) {
  const titleKey =
    headers.find((h) => /task.?name|title|subject/i.test(h)) ||
    headers[1] ||
    headers[0];
  const otherHeaders = headers.filter((h) => h !== titleKey);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
      <div className="overflow-x-auto hide-scrollbar">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-700">
              <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-700/40 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs px-4 py-3 min-w-[220px]">
                {titleKey}
              </th>
              {otherHeaders.map((h) => (
                <th
                  key={h}
                  className="text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs px-4 py-3 whitespace-nowrap min-w-[140px]"
                >
                  {h}
                </th>
              ))}
              <th className="text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs px-4 py-3 whitespace-nowrap min-w-[150px]">
                Current Task Status
              </th>
              <th className="text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs px-4 py-3 whitespace-nowrap min-w-[150px]">
                Progress
              </th>
              <th className="text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs px-4 py-3 whitespace-nowrap min-w-[190px]">
                Task Assign
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const data = row.data || {};
              const title = String(data[titleKey] || 'Untitled Task').trim();
              const isActive = activeRowId === row._id;
              const rowBg = isActive
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30';
              return (
                <tr
                  key={row._id}
                  onClick={() => onRowClick(row)}
                  className={`group cursor-pointer border-b border-slate-100 dark:border-slate-700/60 transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                >
                  {/* Sticky column needs its OWN solid background (not transparent/inherit),
                      otherwise the horizontally-scrolling columns behind it show through
                      and overlap the title text while scrolling. */}
                  <td className={`sticky left-0 z-10 px-4 py-3 font-medium text-slate-800 dark:text-slate-100 max-w-[280px] transition-colors ${rowBg}`}>
                    <div className="overflow-x-auto hide-scrollbar whitespace-nowrap">{title}</div>
                  </td>
                  {otherHeaders.map((h) => {
                    const raw = String(data[h] || '').trim();
                    if (!raw) return <td key={h} className="px-4 py-3 text-slate-300 dark:text-slate-600">—</td>;
                    const lower = raw.toLowerCase();
                    if (isStatus(lower) || isPriority(lower)) {
                      return (
                        <td key={h} className="px-4 py-3">
                          <StatusChip value={raw} />
                        </td>
                      );
                    }
                    const display = formatIfDate(h, raw);
                    return (
                      <td key={h} className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[220px]">
                        <div className="overflow-x-auto hide-scrollbar whitespace-nowrap">{display}</div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <StatusChip value={row.status || 'pending'} />
                  </td>
                  <td className="px-4 py-3">
                    <ProgressMini value={row.progress} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <Select
                        value={row.assignedTo?._id || ''}
                        onChange={(e) => onAdminAssign(row._id, e.target.value)}
                        disabled={assigningTaskId === row._id}
                        placeholder="Assign employee"
                        className="min-w-[170px]"
                        options={employees.map((employee) => ({
                          value: employee._id,
                          label: employee.name,
                        }))}
                      />
                    ) : row.assignedTo?._id ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        Assigned to You
                      </span>
                    ) : section === 'available' ? (
                      <Button
                        size="sm"
                        onClick={() => onSelfAssign(row._id)}
                        isLoading={assigningTaskId === row._id}
                      >
                        Assign to Me
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Available</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   TaskDetailModal — full record on click, like the reference screenshot
──────────────────────────────────────────────────────────────────────────── */
function TaskDetailModal({ row, headers, onClose }) {
  if (!row) return null;
  const data = row.data || {};

  const titleKey =
    headers.find((h) => /task.?name|title|subject/i.test(h)) ||
    headers[1] ||
    headers[0];
  const title = String(data[titleKey] || 'Untitled Task').trim();
  const otherHeaders = headers.filter((h) => h !== titleKey);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-snug">{title}</h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body — ALL headers rendered in ONE loop, same order every time */}
        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar px-6 py-5 flex flex-col gap-3">
          {otherHeaders.map((h) => {
            const raw = data[h];
            const value = String(raw ?? '').trim();
            const lower = value.toLowerCase();
            const Icon = fieldIcon(h);

            // Status/Priority → chip
            if (value && (isStatus(lower) || isPriority(lower))) {
              return (
                <div key={h} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-4 py-2.5">
                  <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 w-32 flex-shrink-0">
                    {h}
                  </span>
                  <StatusChip value={raw} />
                </div>
              );
            }

            // Long text → stacked block with internal scroll (content never hidden, just scrollable)
            if (value.length > LONG) {
              return (
                <div key={h} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-4 flex flex-col gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{h}</p>
                  <div className="max-h-64 overflow-y-auto hide-scrollbar pr-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                      {value}
                    </p>
                  </div>
                </div>
              );
            }

            // Short field (or empty) → single inline row, always shown, "—" if empty
            return (
              <div key={h} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-4 py-2.5">
                <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 w-32 flex-shrink-0">
                  {h}
                </span>
                <span className={`text-sm break-words overflow-x-auto hide-scrollbar whitespace-nowrap ${
                  value ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'
                }`}>
                  {value ? formatIfDate(h, raw) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
/* ────────────────────────────────────────────────────────────────────────────
   Main page component
──────────────────────────────────────────────────────────────────────────── */
export default function TasksPage() {
  const { isSuperAdmin, isEmployee } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const [search, setSearch] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [syncMode, setSyncMode] = useState('push');
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState('');

  const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
  const apiBase = rawApiUrl.replace(/\/api$/, '');
  const appsScriptCode = buildAppsScript(apiBase);

  const handleCopy = () => {
    navigator.clipboard.writeText(appsScriptCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── queries
  const { data: configsRes, isLoading: configLoading } = useQuery({
    queryKey: ['google-sheets-configs'],
    queryFn: getGoogleSheets,
  });
  const config = configsRes?.data?.data?.[0] || null;
  const isPushMode = config?.syncMode === 'push';

  const { data: usersRes } = useQuery({
    queryKey: ['users', 'employees-for-task-assign'],
    queryFn: () => getUsers({ role: 'employee', status: 'active', limit: 500 }),
    enabled: isSuperAdmin,
  });
  const employees = usersRes?.data?.data || [];

  const { data: tasksRes, isLoading: tasksLoading, isFetching: tasksFetching } = useQuery({
    queryKey: ['google-sheets-tasks', 'admin', config?._id, page, LIMIT, search, employeeFilter, statusFilter],
    queryFn: () => getGoogleSheetTasks(config?._id, {
      page,
      limit: LIMIT,
      search,
      employee: employeeFilter || undefined,
      status: statusFilter || undefined,
    }),
    enabled: Boolean(config?._id) && isSuperAdmin,
    keepPreviousData: true,
    refetchInterval: 15000,
  });

  const tasksData = tasksRes?.data?.data || [];
  const totalTasks = tasksRes?.data?.meta?.total || 0;
  const totalPages = Math.ceil(totalTasks / LIMIT);

  const { data: availableTasksRes, isLoading: availableLoading, isFetching: availableFetching } = useQuery({
    queryKey: ['google-sheets-tasks', 'available', config?._id, search],
    queryFn: () => getGoogleSheetTasks(config?._id, {
      page: 1,
      limit: 200,
      search,
      view: 'available',
    }),
    enabled: Boolean(config?._id) && isEmployee,
    refetchInterval: 10000,
  });

  const availableTasks = availableTasksRes?.data?.data || [];
  const employeeTotalTasks = availableTasksRes?.data?.meta?.total || 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['google-sheets-configs'] });
    queryClient.invalidateQueries({ queryKey: ['google-sheets-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // ── mutations
  const saveConfigMutation = useMutation({
    mutationFn: saveGoogleSheet,
    onSuccess: () => { toast.success('Sheet linked!'); setSheetUrl(''); setSheetName(''); invalidateAll(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncGoogleSheet(config?._id),
    onSuccess: (res) => { toast.success(`Sync done! ${res.data.data.count} tasks fetched.`); invalidateAll(); },
    onError: (err) => { toast.error(err.response?.data?.message || 'Sync failed'); invalidateAll(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGoogleSheet(config?._id),
    onSuccess: () => { toast.success('Sheet unlinked'); setDisconnectConfirm(false); invalidateAll(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to unlink'),
  });

  const selfAssignMutation = useMutation({
    mutationFn: selfAssignGoogleSheetTask,
    onMutate: (taskId) => setAssigningTaskId(taskId),
    onSuccess: () => {
      toast.success('Task assigned to you');
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'This task has already been assigned to someone else'),
    onSettled: () => setAssigningTaskId(''),
  });

  const adminAssignMutation = useMutation({
    mutationFn: ({ taskId, employeeId }) => assignGoogleSheetTask(taskId, employeeId),
    onMutate: ({ taskId }) => setAssigningTaskId(taskId),
    onSuccess: () => {
      toast.success('Task assigned');
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to assign task'),
    onSettled: () => setAssigningTaskId(''),
  });

  const handleSelfAssign = (taskId) => {
    selfAssignMutation.mutate(taskId);
  };

  const handleAdminAssign = (taskId, employeeId) => {
    if (!employeeId) return;
    adminAssignMutation.mutate({ taskId, employeeId });
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) { toast.error('URL is required'); return; }
    saveConfigMutation.mutate({ url: sheetUrl, name: sheetName || undefined, syncMode });
  };

  // ── loading
  if (configLoading) return (
    <div className="flex h-64 items-center justify-center">
      <FiRefreshCw className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <style>{HIDE_SCROLLBAR_CSS}</style>
      <PageHeader title="Task Management" subtitle="Sync and track tasks from your Google Sheet" />

      {/* ──────────── NOT CONFIGURED ──────────── */}
      {!config ? (
        <Card className="max-w-2xl mx-auto">
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 mb-4">
              <FiLink className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Link Your Google Sheet</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              Connect your Google Sheet to view tasks in a table automatically.
            </p>
          </div>

          {isSuperAdmin ? (
            <form onSubmit={handleConnect} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Sheet Access Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'pull', Icon: FiGlobe, label: 'Public Sheet', sub: 'Anyone with link can view' },
                    { val: 'push', Icon: FiLock, label: 'Private Sheet', sub: 'Via Google Apps Script' },
                  ].map(({ val, Icon, label, sub }) => (
                    <button
                      key={val} type="button" onClick={() => setSyncMode(val)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${syncMode === val
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 ${syncMode === val ? 'text-primary-600' : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-sm font-medium ${syncMode === val ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Google Sheet URL"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                required
              />
              <Input
                label="Configuration Name (Optional)"
                placeholder="My Tasks Sheet"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
              <Button type="submit" className="w-full" isLoading={saveConfigMutation.isPending}>
                Link Sheet
              </Button>
            </form>
          ) : (
            <p className="text-center text-sm text-amber-600 mt-4">Only a Superadmin can configure the Google Sheet.</p>
          )}
        </Card>
      ) : (
        <>
          {/* ──────────── CONFIG BANNER ──────────── */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{config.name}</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isPushMode
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : config.syncError
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  }`}>
                  {isPushMode ? 'Private (Apps Script)' : config.syncError ? 'Sync Failed' : 'Active Sync'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 break-all max-w-lg">{config.url}</p>
              {config.lastSyncedAt && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Last synced:{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {format(new Date(config.lastSyncedAt), 'MMM d, yyyy HH:mm:ss')}
                  </span>
                </p>
              )}
              {!isPushMode && config.syncError && (
                <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                  <FiAlertTriangle className="h-3.5 w-3.5" />{config.syncError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isPushMode && (
                <Button variant="outline" icon={FiRefreshCw} onClick={() => syncMutation.mutate()} isLoading={syncMutation.isPending || tasksFetching}>
                  Sync Now
                </Button>
              )}
              {isSuperAdmin && (
                <Button variant="danger" icon={FiTrash2} onClick={() => setDisconnectConfirm(true)}>
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          {/* ──────────── APPS SCRIPT PANEL (push only) ──────────── */}
          {isPushMode && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-5">
              <div className="flex items-start gap-3">
                <FiLock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Setup Google Apps Script for automatic sync</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Copy the code below → open your Sheet → <strong>Extensions → Apps Script</strong> → paste → Run once → set a trigger for <strong>On change</strong>.
                  </p>
                  <div className="mt-3 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                      <span className="text-slate-400 font-medium">Apps Script Code</span>
                      <button onClick={handleCopy} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors">
                        {copied
                          ? <><FiCheckCircle className="h-3.5 w-3.5 text-green-400" /> Copied!</>
                          : <><FiCopy className="h-3.5 w-3.5" /> Copy</>}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{appsScriptCode}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────── SEARCH BAR ──────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              containerClassName="w-full sm:w-80"
              icon={FiSearch}
            />
            {isSuperAdmin && (
              <>
                <Select
                  value={employeeFilter}
                  onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
                  placeholder="All employees"
                  containerClassName="w-full sm:w-56"
                  options={employees.map((employee) => ({
                    value: employee._id,
                    label: employee.name,
                  }))}
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  placeholder="All statuses"
                  containerClassName="w-full sm:w-48"
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'assigned', label: 'Assigned' },
                    { value: 'in-progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'hold', label: 'Hold' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </>
            )}
            {(tasksFetching || availableFetching) && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </div>
            )}
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {isSuperAdmin ? totalTasks : employeeTotalTasks} task{(isSuperAdmin ? totalTasks : employeeTotalTasks) !== 1 ? 's' : ''} · click a row to view full details
            </span>
          </div>

          {/* ──────────── TABLE ──────────── */}
          {isEmployee ? (
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Available Tasks</h2>
                  <span className="text-xs text-slate-500">{availableTasks.length} available</span>
                </div>
                {availableLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : availableTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
                    No unassigned tasks available.
                  </div>
                ) : (
                  <TaskTable
                    rows={availableTasks}
                    headers={config.headers || []}
                    onRowClick={setSelectedRow}
                    activeRowId={selectedRow?._id}
                    isAdmin={false}
                    onSelfAssign={handleSelfAssign}
                    assigningTaskId={assigningTaskId}
                    section="available"
                  />
                )}
              </section>

            </div>
          ) : tasksLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : tasksData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FiGrid className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-sm font-medium text-slate-500">
                {isPushMode
                  ? 'No tasks yet. Run the Apps Script in your Google Sheet to sync data.'
                  : 'No tasks found. Try a different search or sync the sheet.'}
              </p>
            </div>
          ) : (
            <>
              <TaskTable
                rows={tasksData}
                headers={config.headers || []}
                onRowClick={setSelectedRow}
                activeRowId={selectedRow?._id}
                isAdmin
                employees={employees}
                onAdminAssign={handleAdminAssign}
                assigningTaskId={assigningTaskId}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {selectedRow && (
        <TaskDetailModal
          row={selectedRow}
          headers={config?.headers || []}
          onClose={() => setSelectedRow(null)}
        />
      )}

      <ConfirmDialog
        isOpen={disconnectConfirm}
        onClose={() => setDisconnectConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Disconnect Google Sheet"
        message="All synced task data will be removed from the CRM database. Continue?"
        confirmLabel="Disconnect"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
