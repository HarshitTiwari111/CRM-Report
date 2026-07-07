import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { FiDownload, FiFileText, FiFile, FiPrinter } from 'react-icons/fi';
import { PageHeader, Card, Button, Select, Input } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { downloadPdfReport, downloadExcelReport, downloadCsvReport } from '../../api/reports';
import { getUsers } from '../../api/users';
import { getDepartments, getProjects } from '../../api/metadata';
import { DATE_RANGE_PRESETS, REPORT_TYPE_OPTIONS, TASK_STATUS_OPTIONS } from '../../utils/constants';

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

  const filters = useMemo(() => {
    const { dateFrom, dateTo } = computeRange(preset, customFrom, customTo);
    // NOTE: API_CONTRACT.md strictly documents only
    // ?type&employeeId&dateFrom&dateTo for /reports/*. We additionally send
    // department/project/status as extra query params since the `type` enum
    // itself includes department|project|status groupings — these are
    // additive and safe to ignore if the backend doesn't use them.
    return {
      type: reportType,
      employeeId: isSuperAdmin ? employeeId || undefined : undefined,
      department: departmentId || undefined,
      project: projectId || undefined,
      status: statusFilter || undefined,
      dateFrom,
      dateTo,
    };
  }, [preset, customFrom, customTo, reportType, employeeId, departmentId, projectId, statusFilter, isSuperAdmin]);

  const pdfMutation = useMutation({
    mutationFn: () => downloadPdfReport(filters),
    onSuccess: () => toast.success('PDF report downloaded successfully'),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to download PDF report'),
  });
  const excelMutation = useMutation({
    mutationFn: () => downloadExcelReport(filters),
    onSuccess: () => toast.success('Excel report downloaded successfully'),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to download Excel report'),
  });
  const csvMutation = useMutation({
    mutationFn: () => downloadCsvReport(filters),
    onSuccess: () => toast.success('CSV report downloaded successfully'),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to download CSV report'),
  });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and export task reports" />

      <Card title="Filters" className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Date Range" value={preset} onChange={(e) => setPreset(e.target.value)} options={DATE_RANGE_PRESETS} />
          {preset === 'custom' && (
            <>
              <Input label="From" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input label="To" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
          <Select label="Report Type" value={reportType} onChange={(e) => setReportType(e.target.value)} options={REPORT_TYPE_OPTIONS} />
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

        <div className="mt-6 flex flex-wrap gap-3">
          <Button icon={FiFileText} onClick={() => pdfMutation.mutate()} isLoading={pdfMutation.isPending}>
            Download PDF
          </Button>
          <Button icon={FiFile} variant="secondary" onClick={() => excelMutation.mutate()} isLoading={excelMutation.isPending}>
            Download Excel
          </Button>
          <Button icon={FiDownload} variant="secondary" onClick={() => csvMutation.mutate()} isLoading={csvMutation.isPending}>
            Download CSV
          </Button>
          <Button icon={FiPrinter} variant="outline" onClick={() => window.print()}>
            Print View
          </Button>
        </div>
      </Card>

      <Card title="Report Preview">
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          Select filters above and choose a download format (PDF, Excel, or CSV) to generate the report.
          Use "Print View" for a print-friendly summary of the current filters.
        </div>
      </Card>
    </div>
  );
}
