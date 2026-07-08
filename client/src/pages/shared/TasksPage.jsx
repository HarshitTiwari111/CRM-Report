import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  FiGrid,
  FiRefreshCw,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiLink,
  FiSearch,
  FiPlus,
} from 'react-icons/fi';
import {
  PageHeader,
  Button,
  Input,
  Badge,
  DataTable,
  ConfirmDialog,
  Card,
} from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import {
  getGoogleSheets,
  saveGoogleSheet,
  syncGoogleSheet,
  getGoogleSheetTasks,
  deleteGoogleSheet,
} from '../../api/googleSheets';

const renderDynamicCell = (header, val) => {
  if (val === undefined || val === null || val === '') return '—';

  const text = String(val).trim();
  const lowerText = text.toLowerCase();

  // Status check
  if (['pending', 'in-progress', 'completed', 'hold', 'cancelled'].includes(lowerText)) {
    const statusMap = {
      pending: 'slate',
      'in-progress': 'blue',
      completed: 'green',
      hold: 'yellow',
      cancelled: 'red',
    };
    return <Badge color={statusMap[lowerText] || 'slate'}>{text}</Badge>;
  }

  // Priority check
  if (['low', 'medium', 'high', 'urgent'].includes(lowerText)) {
    const priorityMap = {
      low: 'slate',
      medium: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return <Badge color={priorityMap[lowerText] || 'slate'}>{text}</Badge>;
  }

  // Date check
  const headerLower = header.toLowerCase();
  if (headerLower.includes('date') || headerLower.includes('timestamp')) {
    const datePattern = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/;
    if (datePattern.test(text)) {
      return text;
    }
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      try {
        return format(parsed, 'MMM d, yyyy');
      } catch {
        return text;
      }
    }
  }

  // Email format check
  if (text.includes('@') && text.includes('.')) {
    return (
      <a href={`mailto:${text}`} className="text-primary-600 hover:underline dark:text-primary-400">
        {text}
      </a>
    );
  }

  // URL check
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noreferrer"
        className="text-primary-600 hover:underline dark:text-primary-400"
      >
        Link
      </a>
    );
  }

  return text;
};

export default function TasksPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);

  // Fetch configs
  const { data: configsRes, isLoading: configLoading } = useQuery({
    queryKey: ['google-sheets-configs'],
    queryFn: getGoogleSheets,
  });

  const config = configsRes?.data?.data?.[0] || null;

  // Fetch dynamic tasks
  const { data: tasksRes, isLoading: tasksLoading, isFetching: tasksFetching } = useQuery({
    queryKey: ['google-sheets-tasks', config?._id, page, limit, search],
    queryFn: () => getGoogleSheetTasks(config?._id, { page, limit, search }),
    enabled: Boolean(config?._id),
    keepPreviousData: true,
  });

  const tasksData = tasksRes?.data?.data || [];
  const totalTasks = tasksRes?.data?.meta?.total || 0;

  // Invalidation helper
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['google-sheets-configs'] });
    queryClient.invalidateQueries({ queryKey: ['google-sheets-tasks'] });
  };

  // Mutate Save Config
  const saveConfigMutation = useMutation({
    mutationFn: saveGoogleSheet,
    onSuccess: () => {
      toast.success('Google Sheet linked successfully!');
      setSheetUrl('');
      setSheetName('');
      invalidateAll();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save Google Sheet URL');
    },
  });

  // Mutate Sync Config
  const syncMutation = useMutation({
    mutationFn: () => syncGoogleSheet(config?._id),
    onSuccess: (res) => {
      toast.success(`Sync finished! Fetched ${res.data.data.count} tasks.`);
      invalidateAll();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Sync failed');
      invalidateAll();
    },
  });

  // Mutate Disconnect Config
  const deleteMutation = useMutation({
    mutationFn: () => deleteGoogleSheet(config?._id),
    onSuccess: () => {
      toast.success('Google Sheet unlinked successfully');
      setDisconnectConfirm(false);
      invalidateAll();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to unlink Google Sheet');
    },
  });

  const handleConnect = (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) {
      toast.error('URL is required');
      return;
    }
    saveConfigMutation.mutate({ url: sheetUrl, name: sheetName || undefined });
  };

  const columns = useMemo(() => {
    if (!config?.headers) return [];
    return config.headers.map((header) => ({
      key: header,
      header: header,
      render: (row) => renderDynamicCell(header, row.data?.get ? row.data.get(header) : row.data?.[header]),
    }));
  }, [config?.headers]);

  if (configLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Loading configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Task Management"
        subtitle="Automatically sync and monitor tasks directly from Google Sheets"
      />

      {!config ? (
        <Card className="max-w-2xl mx-auto mt-8">
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300">
              <FiLink className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Link Your Google Sheet
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              Please share your Google Sheet as "Anyone with link can view", paste the URL below, and we will sync tasks automatically.
            </p>
          </div>

          {isSuperAdmin ? (
            <form onSubmit={handleConnect} className="mt-6 flex flex-col gap-4">
              <Input
                label="Google Sheet URL"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                required
              />
              <Input
                label="Configuration Name (Optional)"
                placeholder="Marketing Form Tasks"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
              <Button
                type="submit"
                className="mt-2 w-full"
                isLoading={saveConfigMutation.isPending}
              >
                Link & Sync Sheet
              </Button>
            </form>
          ) : (
            <div className="text-center text-sm text-amber-600 mt-4">
              Only a Superadmin can configure and link the Google Sheet.
            </div>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Config Detail Banner */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 card-shadow dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">
                  {config.name}
                </h3>
                <Badge color={config.syncError ? 'red' : 'green'}>
                  {config.syncError ? 'Sync Failed' : 'Active Sync'}
                </Badge>
              </div>
              <p className="mt-1.5 truncate text-xs text-slate-400 max-w-lg dark:text-slate-500">
                {config.url}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                {config.lastSyncedAt && (
                  <span>
                    Last Synced:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {format(new Date(config.lastSyncedAt), 'MMM d, yyyy HH:mm:ss')}
                    </span>
                  </span>
                )}
                {config.syncError && (
                  <span className="flex items-center gap-1 text-red-500">
                    <FiAlertTriangle className="h-3.5 w-3.5" />
                    Error: {config.syncError}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={FiRefreshCw}
                onClick={() => syncMutation.mutate()}
                isLoading={syncMutation.isPending || tasksFetching}
              >
                Sync Now
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="danger"
                  icon={FiTrash2}
                  onClick={() => setDisconnectConfirm(true)}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          {/* Search bar & Tasks list */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search spreadsheet tasks..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                containerClassName="w-full sm:w-80"
                icon={FiSearch}
              />
              {tasksFetching && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Syncing table...
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800">
              {columns.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={tasksData}
                  isLoading={tasksLoading}
                  page={page}
                  limit={limit}
                  total={totalTasks}
                  onPageChange={setPage}
                  rowKey={(row) => row._id}
                  emptyMessage="No matching rows found in Google Sheet"
                />
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">
                  Initializing table headers... please run manual Sync.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disconnect dialog */}
      <ConfirmDialog
        isOpen={disconnectConfirm}
        onClose={() => setDisconnectConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Disconnect Google Sheet"
        message="Are you sure you want to disconnect this Google Sheet? All synced task logs will be removed from CRM database."
        confirmLabel="Disconnect"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
