import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiKey,
  FiUserCheck,
  FiBarChart2,
  FiToggleLeft,
  FiToggleRight,
} from 'react-icons/fi';
import { PageHeader, Button, Input, Select, Badge, DataTable, ConfirmDialog } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { getUsers, deleteUser, setUserStatus } from '../../api/users';
import { getDepartments } from '../../api/metadata';
import EmployeeFormModal from '../../features/employees/EmployeeFormModal';
import AssignModal from '../../features/employees/AssignModal';
import ResetPasswordModal from '../../features/employees/ResetPasswordModal';

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);

  const [formModal, setFormModal] = useState({ open: false, employee: null });
  const [assignModal, setAssignModal] = useState({ open: false, employee: null });
  const [resetModal, setResetModal] = useState({ open: false, employee: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => getDepartments({ limit: 100 }),
    select: (res) => res.data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, limit, search: debouncedSearch, department, status }],
    queryFn: () =>
      getUsers({
        page,
        limit,
        search: debouncedSearch || undefined,
        department: department || undefined,
        status: status || undefined,
      }),
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete employee'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }) => setUserStatus(id, isActive),
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update status'),
  });

  const columns = [
    { key: 'employeeId', header: 'ID', render: (r) => r.employeeId || '—' },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.name}</p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (r) => r.department?.name || '—' },
    { key: 'designation', header: 'Designation', render: (r) => r.designation || '—' },
    { key: 'manager', header: 'Manager', render: (r) => r.manager?.name || '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => <Badge color={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            title="Edit"
            onClick={() => setFormModal({ open: true, employee: r })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            title="Assign department/team/manager"
            onClick={() => setAssignModal({ open: true, employee: r })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <FiUserCheck className="h-4 w-4" />
          </button>
          <button
            title="Reset password"
            onClick={() => setResetModal({ open: true, employee: r })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <FiKey className="h-4 w-4" />
          </button>
          <button
            title={r.isActive ? 'Deactivate' : 'Activate'}
            onClick={() => statusMutation.mutate({ id: r._id, isActive: !r.isActive })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            {r.isActive ? <FiToggleRight className="h-4 w-4 text-emerald-500" /> : <FiToggleLeft className="h-4 w-4" />}
          </button>
          <Link
            to={`/admin/employees/${r._id}/performance`}
            title="View performance"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <FiBarChart2 className="h-4 w-4" />
          </Link>
          <button
            title="Delete"
            onClick={() => setDeleteTarget(r)}
            className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employee Management"
        subtitle="Manage employee profiles, roles and assignments"
        actions={
          <Button icon={FiPlus} onClick={() => setFormModal({ open: true, employee: null })}>
            Add Employee
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:w-64"
        />
        <Select
          placeholder="All departments"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
          options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
          containerClassName="sm:w-48"
        />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          containerClassName="sm:w-40"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white card-shadow">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          page={page}
          limit={limit}
          total={data?.meta?.total || 0}
          onPageChange={setPage}
          rowKey={(r) => r._id}
          emptyMessage="No employees found"
        />
      </div>

      <EmployeeFormModal
        isOpen={formModal.open}
        employee={formModal.employee}
        onClose={() => setFormModal({ open: false, employee: null })}
      />
      <AssignModal
        isOpen={assignModal.open}
        employee={assignModal.employee}
        onClose={() => setAssignModal({ open: false, employee: null })}
      />
      <ResetPasswordModal
        isOpen={resetModal.open}
        employee={resetModal.employee}
        onClose={() => setResetModal({ open: false, employee: null })}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
