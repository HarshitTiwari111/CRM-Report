import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
  FiGrid,
  FiRefreshCw,
  FiTrash2,
  FiAlertTriangle,
  FiLink,
  FiSearch,
  FiGlobe,
  FiLock,
  FiCopy,
  FiCheckCircle,
} from "react-icons/fi";
import {
  PageHeader,
  Button,
  Input,
  Badge,
  DataTable,
  ConfirmDialog,
  Card,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  getGoogleSheets,
  saveGoogleSheet,
  syncGoogleSheet,
  getGoogleSheetTasks,
  deleteGoogleSheet,
} from "../../api/googleSheets";

const renderDynamicCell = (header, val) => {
  if (val === undefined || val === null || val === "") return "—";
  const text = String(val).trim();
  const lowerText = text.toLowerCase();

  if (["pending", "in-progress", "completed", "hold", "cancelled"].includes(lowerText)) {
    const map = { pending: "slate", "in-progress": "blue", completed: "green", hold: "yellow", cancelled: "red" };
    return <Badge color={map[lowerText] || "slate"}>{text}</Badge>;
  }
  if (["low", "medium", "high", "urgent"].includes(lowerText)) {
    const map = { low: "slate", medium: "blue", high: "orange", urgent: "red" };
    return <Badge color={map[lowerText] || "slate"}>{text}</Badge>;
  }
  const headerLower = header.toLowerCase();
  if (headerLower.includes("date") || headerLower.includes("timestamp")) {
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      try { return format(parsed, "MMM d, yyyy"); } catch { /**/ }
    }
  }
  if (text.includes("@") && text.includes(".")) {
    return <a href={"mailto:" + text} className="text-primary-600 hover:underline dark:text-primary-400">{text}</a>;
  }
  if (text.startsWith("http://") || text.startsWith("https://")) {
    return <a href={text} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline dark:text-primary-400">Link</a>;
  }
  return text;
};

const buildAppsScript = (apiBase) =>
  `function syncTasksToCRM() {\n  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();\n  var rows = sheet.getDataRange().getValues();\n  var crmUrl = "${apiBase}/api/google-sheets/webhook-sync";\n  var payload = JSON.stringify({\n    url: SpreadsheetApp.getActiveSpreadsheet().getUrl(),\n    rows: rows\n  });\n  var options = {\n    method: "post",\n    contentType: "application/json",\n    payload: payload,\n    muteHttpExceptions: true\n  };\n  var response = UrlFetchApp.fetch(crmUrl, options);\n  Logger.log("Response: " + response.getContentText());\n}`;

export default function TasksPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [syncMode, setSyncMode] = useState("push");
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawApiUrl = import.meta.env.VITE_API_URL || "https://crm-report-api.onrender.com/api";
  const apiBase = rawApiUrl.replace(/\/api$/, "");
  const appsScriptCode = buildAppsScript(apiBase);

  const handleCopy = () => {
    navigator.clipboard.writeText(appsScriptCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const { data: configsRes, isLoading: configLoading } = useQuery({
    queryKey: ["google-sheets-configs"],
    queryFn: getGoogleSheets,
  });

  const config = configsRes?.data?.data?.[0] || null;
  const isPushMode = config?.syncMode === "push";

  const { data: tasksRes, isLoading: tasksLoading, isFetching: tasksFetching } = useQuery({
    queryKey: ["google-sheets-tasks", config?._id, page, limit, search],
    queryFn: () => getGoogleSheetTasks(config?._id, { page, limit, search }),
    enabled: Boolean(config?._id),
    keepPreviousData: true,
  });

  const tasksData = tasksRes?.data?.data || [];
  const totalTasks = tasksRes?.data?.meta?.total || 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["google-sheets-configs"] });
    queryClient.invalidateQueries({ queryKey: ["google-sheets-tasks"] });
  };

  const saveConfigMutation = useMutation({
    mutationFn: saveGoogleSheet,
    onSuccess: () => {
      toast.success("Google Sheet linked successfully!");
      setSheetUrl("");
      setSheetName("");
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to save"),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncGoogleSheet(config?._id),
    onSuccess: (res) => {
      toast.success("Sync finished! Fetched " + res.data.data.count + " tasks.");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Sync failed");
      invalidateAll();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGoogleSheet(config?._id),
    onSuccess: () => {
      toast.success("Google Sheet unlinked successfully");
      setDisconnectConfirm(false);
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to unlink"),
  });

  const handleConnect = (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) { toast.error("URL is required"); return; }
    saveConfigMutation.mutate({ url: sheetUrl, name: sheetName || undefined, syncMode });
  };

  const columns = useMemo(() => {
    if (!config?.headers?.length) return [];
    return config.headers.map((header) => ({
      key: header,
      header,
      render: (row) => renderDynamicCell(header, row.data?.get ? row.data.get(header) : row.data?.[header]),
    }));
  }, [config?.headers]);

  if (configLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Loading...</p>
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
            <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Link Your Google Sheet</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              Connect your Google Sheet to automatically view and track tasks in the CRM.
            </p>
          </div>

          {isSuperAdmin ? (
            <form onSubmit={handleConnect} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Sheet Access Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSyncMode("pull")}
                    className={"flex items-center gap-3 rounded-xl border p-4 text-left transition-all " + (syncMode === "pull" ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400" : "border-slate-200 dark:border-slate-700 hover:border-slate-300")}
                  >
                    <FiGlobe className={"h-5 w-5 flex-shrink-0 " + (syncMode === "pull" ? "text-primary-600" : "text-slate-400")} />
                    <div>
                      <p className={"text-sm font-medium " + (syncMode === "pull" ? "text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-200")}>Public Sheet</p>
                      <p className="text-xs text-slate-500 mt-0.5">Anyone with link can view</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncMode("push")}
                    className={"flex items-center gap-3 rounded-xl border p-4 text-left transition-all " + (syncMode === "push" ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400" : "border-slate-200 dark:border-slate-700 hover:border-slate-300")}
                  >
                    <FiLock className={"h-5 w-5 flex-shrink-0 " + (syncMode === "push" ? "text-primary-600" : "text-slate-400")} />
                    <div>
                      <p className={"text-sm font-medium " + (syncMode === "push" ? "text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-200")}>Private Sheet</p>
                      <p className="text-xs text-slate-500 mt-0.5">Via Google Apps Script</p>
                    </div>
                  </button>
                </div>
              </div>
              <Input label="Google Sheet URL" placeholder="https://docs.google.com/spreadsheets/d/.../edit" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} required />
              <Input label="Configuration Name (Optional)" placeholder="Marketing Form Tasks" value={sheetName} onChange={(e) => setSheetName(e.target.value)} />
              <Button type="submit" className="mt-2 w-full" isLoading={saveConfigMutation.isPending}>Link Sheet</Button>
            </form>
          ) : (
            <div className="text-center text-sm text-amber-600 mt-4">Only a Superadmin can configure and link the Google Sheet.</div>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Config banner */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 card-shadow dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{config.name}</h3>
                <Badge color={isPushMode ? "blue" : config.syncError ? "red" : "green"}>
                  {isPushMode ? "Private (Apps Script)" : config.syncError ? "Sync Failed" : "Active Sync"}
                </Badge>
              </div>
              <p className="mt-1.5 truncate text-xs text-slate-400 max-w-lg dark:text-slate-500">{config.url}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                {config.lastSyncedAt && (
                  <span>Last Synced: <span className="font-medium text-slate-700 dark:text-slate-200">{format(new Date(config.lastSyncedAt), "MMM d, yyyy HH:mm:ss")}</span></span>
                )}
                {!isPushMode && config.syncError && (
                  <span className="flex items-center gap-1 text-red-500"><FiAlertTriangle className="h-3.5 w-3.5" />Error: {config.syncError}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isPushMode && (
                <Button variant="outline" icon={FiRefreshCw} onClick={() => syncMutation.mutate()} isLoading={syncMutation.isPending || tasksFetching}>Sync Now</Button>
              )}
              {isSuperAdmin && (
                <Button variant="danger" icon={FiTrash2} onClick={() => setDisconnectConfirm(true)}>Disconnect</Button>
              )}
            </div>
          </div>

          {/* Push mode: Apps Script instructions */}
          {isPushMode && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-5">
              <div className="flex items-start gap-3">
                <FiLock className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Setup Google Apps Script for automatic sync</h4>
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Since your sheet is private, copy the code below and add it to your Google Sheet via <strong>Extensions → Apps Script</strong>. Then run it once and set a trigger.
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-900 text-slate-100 text-xs overflow-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                      <span className="text-slate-400 font-medium">Apps Script Code</span>
                      <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                        {copied ? <><FiCheckCircle className="h-3.5 w-3.5 text-green-400" /> Copied!</> : <><FiCopy className="h-3.5 w-3.5" /> Copy</>}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{appsScriptCode}</pre>
                  </div>
                  <ol className="mt-4 space-y-1.5 text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside">
                    <li>Open your Google Sheet → <strong>Extensions</strong> → <strong>Apps Script</strong></li>
                    <li>Paste the copied code and click <strong>Run</strong> (authorize when prompted)</li>
                    <li>To auto-sync: click ⏰ <strong>Triggers</strong> → <strong>Add Trigger</strong> → event: <strong>On change</strong></li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Tasks table */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search spreadsheet tasks..."
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
                  emptyMessage="No rows found. Run the Apps Script at least once."
                />
              ) : (
                <div className="p-8 text-center">
                  <FiGrid className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500">
                    {isPushMode
                      ? "Waiting for first sync via Apps Script. Follow the setup instructions above."
                      : "No headers yet — click Sync Now to import the sheet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={disconnectConfirm}
        onClose={() => setDisconnectConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Disconnect Google Sheet"
        message="Are you sure? All synced task data will be removed from the CRM database."
        confirmLabel="Disconnect"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
