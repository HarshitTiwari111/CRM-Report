import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Modal, Select, Button } from '../../components/ui';
import { assignSchema } from '../../schemas/employeeSchemas';
import { assignUser, getUsers } from '../../api/users';
import { getDepartments, getTeams } from '../../api/metadata';

export default function AssignModal({ isOpen, onClose, employee }) {
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => getDepartments({ limit: 100 }),
    select: (res) => res.data.data,
    enabled: isOpen,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams', 'all'],
    queryFn: () => getTeams({ limit: 100 }),
    select: (res) => res.data.data,
    enabled: isOpen,
  });

  const { data: managers } = useQuery({
    queryKey: ['users', 'managers'],
    queryFn: () => getUsers({ limit: 100, role: 'employee' }),
    select: (res) => res.data.data,
    enabled: isOpen,
  });

  const {
    control,
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(assignSchema),
    defaultValues: { department: '', team: '', manager: '' },
  });

  useEffect(() => {
    if (isOpen && employee) {
      reset({
        department: employee.department?._id || employee.department || '',
        team: employee.team?._id || employee.team || '',
        manager: employee.manager?._id || employee.manager || '',
      });
    }
  }, [isOpen, employee, reset]);

  const mutation = useMutation({
    mutationFn: (payload) => assignUser(employee._id, payload),
    onSuccess: () => {
      toast.success('Assignment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Something went wrong'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign — ${employee?.name || ''}`} size="sm">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        <Controller
          control={control}
          name="department"
          render={({ field }) => (
            <Select
              label="Department"
              placeholder="No department"
              options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="team"
          render={({ field }) => (
            <Select
              label="Team"
              placeholder="No team"
              options={(teams || []).map((t) => ({ value: t._id, label: t.name }))}
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="manager"
          render={({ field }) => (
            <Select
              label="Manager"
              placeholder="No manager"
              options={(managers || [])
                .filter((m) => m._id !== employee?._id)
                .map((m) => ({ value: m._id, label: m.name }))}
              {...field}
            />
          )}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
