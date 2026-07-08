import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { PageHeader, Button, Input, Textarea, DataTable, Modal, ConfirmDialog } from '../../components/ui';

const defaultSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
});

/**
 * Generic name/description CRUD page for simple reference-data resources
 * (Departments, Teams, Projects, Clients, Task Categories) — all of which
 * share GET/POST /resource and PUT/DELETE /resource/:id per API_CONTRACT.md.
 */
export default function SimpleCrudPage({
  title,
  subtitle,
  queryKey,
  listFn,
  createFn,
  updateFn,
  deleteFn,
  extraColumns = [],
  extraFields,
  schema = defaultSchema,
  defaultValues = { name: '', description: '' },
}) {
  const [modal, setModal] = useState({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, 'list', page, limit],
    queryFn: () => listFn({ page, limit }),
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues });

  const openCreate = () => {
    reset(defaultValues);
    setModal({ open: true, item: null });
  };

  const openEdit = (item) => {
    reset({ ...defaultValues, ...item });
    setModal({ open: true, item });
  };

  const saveMutation = useMutation({
    mutationFn: (values) => (modal.item ? updateFn(modal.item._id, values) : createFn(values)),
    onSuccess: () => {
      toast.success(modal.item ? `${title} updated successfully` : `${title} created successfully`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setModal({ open: false, item: null });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Something went wrong'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success(`${title} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete'),
  });

  const columns = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-800 dark:text-slate-100">{r.name}</span> },
    ...extraColumns,
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(r)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(r)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40">
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button icon={FiPlus} onClick={openCreate}>
            Add {title.replace(/s$/, '')}
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          page={page}
          limit={limit}
          total={data?.meta?.total || 0}
          onPageChange={setPage}
          rowKey={(r) => r._id}
          emptyMessage={`No ${title.toLowerCase()} found`}
        />
      </div>

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? `Edit ${title.replace(/s$/, '')}` : `Add ${title.replace(/s$/, '')}`}>
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          {extraFields && extraFields({ register, errors })}
          <Textarea label="Description" error={errors.description?.message} {...register('description')} />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal({ open: false, item: null })}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title={`Delete ${title.replace(/s$/, '')}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
