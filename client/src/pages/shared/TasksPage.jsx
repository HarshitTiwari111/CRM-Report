import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  FiRefreshCw, FiTrash2, FiAlertTriangle, FiLink,
  FiSearch, FiGlobe, FiLock, FiCopy, FiCheckCircle, FiGrid,
  FiClock, FiUser, FiTag,
} from 'react-icons/fi';
import {
  PageHeader, Button, Input, ConfirmDialog, Card,
} from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import {
  getGoogleSheets, saveGoogleSheet, syncGoogleSheet,
  getGoogleSheetTasks, deleteGoogleSheet,
} from '../../api/googleSheets';

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────────────────── */
const STATUS_META = {
  pending:      { bg: 'bg-slate-100 dark:bg-slate-700',   text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  'in-progress':{ bg: 'bg-blue-100 dark:bg-blue-900/40',  text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  completed:    { bg: 'bg-green-100 dark:bg-green-900/40',text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  hold:         { bg: 'bg-yellow-100 dark:bg-yellow-900/40',text:'text-yellow-700 dark:text-yellow-300',dot:'bg-yellow-500'},
  cancelled:    { bg: 'bg-red-100 dark:bg-red-900/40',    text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500' },
};
const PRIORITY_META = {
  low:    { bg: 'bg-slate-100 dark:bg-slate-700',    text: 'text-slate-600 dark:text-slate-300' },
  medium: { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300' },
  high:   { bg: 'bg-orange-100 dark:bg-orange-900/40',text:'text-orange-700 dark:text-orange-300' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-700 dark:text-red-300' },
};

const isStatus   = (v) => !!STATUS_META[String(v).toLowerCase()];
const isPriority = (v) => !!PRIORITY_META[String(v).toLowerCase()];
const SHORT = 70; // chars — below this = chip; above = expandable panel

/* ────────────────────────────────────────────────────────────────────────────
   Apps Script builder
──────────────────────────────────────────────────────────────────────────── */
const buildAppsScript = (apiBase) =>
  `function syncTasksToCRM() {\n  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();\n  var rows = sheet.getDataRange().getValues();\n  var crmUrl = "${apiBase}/api/google-sheets/webhook-sync";\n  var payload = JSON.stringify({\n    url: SpreadsheetApp.getActiveSpreadsheet().getUrl(),\n    rows: rows\n  });\n  var options = {\n    method: "post",\n    contentType: "application/json",\n    payload: payload,\n    muteHttpExceptions: true\n  };\n  var response = UrlFetchApp.fetch(crmUrl, options);\n  Logger.log("Response: " + response.getContentText());\n}`;

/* ────────────────────────────────────────────────────────────────────────────
   TaskCard
──────────────────────────────────────────────────────────────────────────── */
function TaskCard({ row, headers }) {
  const data = row.data || {};

  // Pick best title field
  const titleKey =
    headers.find((h) => /task.?name|title|subject/i.test(h)) ||
    headers[1] ||
    headers[0];
  const title = String(data[titleKey] || 'Untitled Task').trim();

  const otherHeaders = headers.filter((h) => h !== titleKey);

  // Split: short values → chips; long values → panels
  const chipHeaders  = otherHeaders.filter((h) => String(data[h] || '').trim().length <= SHORT);
  const panelHeaders = otherHeaders.filter((h) => String(data[h] || '').trim().length > SHORT);

  const renderChip = (h) => {
    const v = String(data[h] || '').trim();
    if (!v) return null;
    const lower = v.toLowerCase();

    if (isStatus(lower)) {
      const m = STATUS_META[lower];
      return (
        <span key={h} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
          {v}
        </span>
      );
    }
    if (isPriority(lower)) {
      const m = PRIORITY_META[lower];
      return (
        <span key={h} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}>
          {v}
        </span>
      );
    }

    const hLow = h.toLowerCase();
    const isDate = hLow.includes('date') || hLow.includes('timestamp');
    const Icon = isDate ? FiClock : hLow.includes('name') || hLow.includes('who') || hLow.includes('vertical') ? FiUser : FiTag;
    let display = v;
    if (isDate) {
      const p = new Date(v);
      if (!isNaN(p)) { try { display = format(p, 'MMM d, yyyy'); } catch (_) { /**/ } }
    }

    return (
      <span key={h} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/60 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
        <Icon className="h-3 w-3 text-slate-400 flex-shrink-0" />
        <span className="font-medium text-slate-400 dark:text-slate-500 mr-0.5">{h}:</span>
        {display}
      </span>
    );
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
      {/* coloured top bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 to-indigo-500 flex-shrink-0" />

      <div className="flex flex-col flex-1 gap-4 p-5">
        {/* Title */}
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base leading-snug">
          {title}
        </h3>

        {/* Chips row */}
        {chipHeaders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chipHeaders.map(renderChip)}
          </div>
        )}

        {/* Long-text panels with internal scroll */}
        {panelHeaders.map((h) => {
          const v = String(data[h] || '').trim();
          if (!v) return null;
          return (
            <div key={h} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3 flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{h}</p>
              <div className="max-h-36 overflow-y-auto pr-1">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                  {v}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main page component
──────────────────────────────────────────────────────────────────────────── */
export default function TasksPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const [search, setSearch] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [syncMode, setSyncMode] = useState('push');
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawApiUrl = import.meta.env.VITE_API_URL || 'https://crm-report-api.onrender.com/api';
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

  const { data: tasksRes, isLoading: tasksLoading, isFetching: tasksFetching } = useQuery({
    queryKey: ['google-sheets-tasks', config?._id, page, LIMIT, search],
    queryFn: () => getGoogleSheetTasks(config?._id, { page, limit: LIMIT, search }),
    enabled: Boolean(config?._id),
    keepPreviousData: true,
  });

  const tasksData = tasksRes?.data?.data || [];
  const totalTasks = tasksRes?.data?.meta?.total || 0;
  const totalPages = Math.ceil(totalTasks / LIMIT);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['google-sheets-configs'] });
    queryClient.invalidateQueries({ queryKey: ['google-sheets-tasks'] });
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
              Connect your Google Sheet to view tasks in beautiful cards automatically.
            </p>
          </div>

          {isSuperAdmin ? (
            <form onSubmit={handleConnect} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Sheet Access Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'pull', Icon: FiGlobe, label: 'Public Sheet',  sub: 'Anyone with link can view' },
                    { val: 'push', Icon: FiLock,  label: 'Private Sheet', sub: 'Via Google Apps Script' },
                  ].map(({ val, Icon, label, sub }) => (
                    <button
                      key={val} type="button" onClick={() => setSyncMode(val)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        syncMode === val
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
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isPushMode
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
            {tasksFetching && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </div>
            )}
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {totalTasks} task{totalTasks !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ──────────── CARDS GRID ──────────── */}
          {tasksLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-52 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse" />
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {tasksData.map((row) => (
                  <TaskCard key={row._id} row={row} headers={config.headers || []} />
                ))}
              </div>

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
