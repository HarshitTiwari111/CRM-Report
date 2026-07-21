import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { Modal, Input, Select, Textarea, Button } from '../../components/ui';
import { taskSchema } from '../../schemas/taskSchemas';
import { createTask, updateTask } from '../../api/tasks';
import { getProjects, getDepartments } from '../../api/metadata';
import { getUsers } from '../../api/users';
import { TASK_PRIORITY_OPTIONS, TASK_TYPE_OPTIONS, TASK_STATUS_OPTIONS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

function toDateInput(value) {
  if (!value) return '';
  try {
    return format(new Date(value), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export default function TaskFormModal({ isOpen, onClose, task, prefill }) {
  const isEdit = Boolean(task);
  const { isAdminLevel } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => getProjects({ limit: 200 }),
    select: (res) => res.data.data,
    enabled: isOpen,
  });
  const { data: departments } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => getDepartments({ limit: 100 }),
    select: (res) => res.data.data,
    enabled: isOpen,
  });
  const { data: employees } = useQuery({
    queryKey: ['users', 'all-employees'],
    queryFn: () => getUsers({ limit: 200 }),
    select: (res) => res.data.data,
    enabled: isOpen && isAdminLevel,
  });

  const defaultValues = useMemo(
    () => ({
      title: '',
      description: '',
      project: '',
      department: '',
      priority: 'medium',
      taskType: 'development',
      startTime: '',
      endTime: '',
      taskDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
      assignedTo: '',
    }),
    []
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(taskSchema), defaultValues });

  useEffect(() => {
    if (!isOpen) return;
    const source = task || prefill;
    if (source) {
      reset({
        title: source.title || '',
        description: source.description || '',
        project: source.project?._id || source.project || '',
        department: source.department?._id || source.department || '',
        priority: source.priority || 'medium',
        taskType: source.taskType || 'development',
        startTime: source.startTime || '',
        endTime: source.endTime || '',
        taskDate: isEdit ? (toDateInput(task.taskDate) || format(new Date(), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd'),
        status: source.status || 'pending',
        assignedTo: source.assignedTo?._id || source.assignedTo || '',
      });
    } else {
      reset(defaultValues);
    }
  }, [isOpen, task, prefill, reset, defaultValues, isEdit]);

  const mutation = useMutation({
    mutationFn: (values) => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      return isEdit ? updateTask(task._id, formData) : createTask(formData);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Task updated successfully' : 'Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Something went wrong'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} size="xl">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Task Title"
          containerClassName="sm:col-span-2"
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          label="Description"
          containerClassName="sm:col-span-2"
          error={errors.description?.message}
          {...register('description')}
        />

        <Controller
          control={control}
          name="project"
          render={({ field }) => (
            <Select
              label="Project"
              placeholder="Select project"
              options={(projects || []).map((p) => ({ value: p._id, label: p.name }))}
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="department"
          render={({ field }) => (
            <Select
              label="Department"
              placeholder="Select department"
              options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
              {...field}
            />
          )}
        />

        {isAdminLevel && (
          <Controller
            control={control}
            name="assignedTo"
            render={({ field }) => (
              <Select
                label="Assigned To"
                placeholder="Select employee"
                options={(employees || []).map((e) => ({ value: e._id, label: e.name }))}
                {...field}
              />
            )}
          />
        )}

        <Controller
          control={control}
          name="priority"
          render={({ field }) => <Select label="Priority" options={TASK_PRIORITY_OPTIONS} {...field} />}
        />
        <Controller
          control={control}
          name="taskType"
          render={({ field }) => <Select label="Task Type" options={TASK_TYPE_OPTIONS} {...field} />}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => <Select label="Status" options={TASK_STATUS_OPTIONS} {...field} />}
        />

        <Input label="Task Date" type="date" error={errors.taskDate?.message} {...register('taskDate')} />
        <Input label="Start Time" type="time" {...register('startTime')} />
        <Input label="End Time" type="time" {...register('endTime')} />

        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
