import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { format } from 'date-fns';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { PageHeader, Button, Input, DataTable, Modal, ConfirmDialog } from '../../components/ui';
import { getHolidays, createHoliday, deleteHoliday } from '../../api/metadata';

const holidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required'),
  date: z.string().min(1, 'Date is required'),
});

export default function HolidaysPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['holidays', 'list'],
    queryFn: () => getHolidays({ limit: 200 }),
    select: (res) => res.data.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(holidaySchema), defaultValues: { name: '', date: '' } });

  const createMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      toast.success('Holiday added successfully');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setModalOpen(false);
      reset();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to add holiday'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      toast.success('Holiday deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete holiday'),
  });

  const columns = [
    { key: 'name', header: 'Holiday', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'date', header: 'Date', render: (r) => (r.date ? format(new Date(r.date), 'EEEE, MMM d, yyyy') : '—') },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <button onClick={() => setDeleteTarget(r)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50">
          <FiTrash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Holidays"
        subtitle="Manage the company holiday calendar"
        actions={
          <Button icon={FiPlus} onClick={() => setModalOpen(true)}>
            Add Holiday
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white card-shadow">
        <DataTable
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          page={1}
          limit={data?.length || 1}
          total={data?.length || 0}
          rowKey={(r) => r._id}
          emptyMessage="No holidays found"
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Holiday">
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="flex flex-col gap-4">
          <Input label="Holiday Name" error={errors.name?.message} {...register('name')} />
          <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        title="Delete Holiday"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
