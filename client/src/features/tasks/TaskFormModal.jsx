import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { differenceInMinutes, format } from 'date-fns';
import { Modal, Input, Select, Textarea, Button, FileInput } from '../../components/ui';
import { taskSchema } from '../../schemas/taskSchemas';
import { createTask, updateTask } from '../../api/tasks';
import { getProjects, getClients, getDepartments } from '../../api/metadata';
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

function computeTotalHours(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const start = new Date(2000, 0, 1, sh, sm);
  let end = new Date(2000, 0, 1, eh, em);
  if (end < start) end = new Date(2000, 0, 2, eh, em);
  const minutes = differenceInMinutes(end, start);
  return (minutes / 60).toFixed(2);
}

export default function TaskFormModal({ isOpen, onClose, task, prefill }) {
  const isEdit = Boolean(task);
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [attachment, setAttachment] = useState(null);

  const { data: projects } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => getProjects({ limit: 200 }),
    select: (res) => res.data.data,
    enabled: isOpen,
  });
  const { data: clients } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => getClients({ limit: 200 }),
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
    enabled: isOpen && isSuperAdmin,
  });

  const defaultValues = useMemo(
    () => ({
      title: '',
      description: '',
      project: '',
      client: '',
      department: '',
      priority: 'medium',
      taskType: 'development',
      startTime: '',
      endTime: '',
      taskDate: format(new Date(), 'yyyy-MM-dd'),
      expectedCompletion: '',
      actualCompletion: '',
      status: 'pending',
      remarks: '',
      githubLink: '',
      taskUrl: '',
      notes: '',
      assignedTo: '',
    }),
    []
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(taskSchema), defaultValues });

  useEffect(() => {
    if (!isOpen) return;
    setAttachment(null);
    const source = task || prefill;
    if (source) {
      reset({
        title: source.title || '',
        description: source.description || '',
        project: source.project?._id || source.project || '',
        client: source.client?._id || source.client || '',
        department: source.department?._id || source.department || '',
        priority: source.priority || 'medium',
        taskType: source.taskType || 'development',
        startTime: source.startTime || '',
        endTime: source.endTime || '',
        taskDate: toDateInput(source.taskDate) || format(new Date(), 'yyyy-MM-dd'),
        expectedCompletion: toDateInput(source.expectedCompletion),
        actualCompletion: toDateInput(source.actualCompletion),
        status: source.status || 'pending',
        remarks: source.remarks || '',
        githubLink: source.githubLink || '',
        taskUrl: source.taskUrl || '',
        notes: source.notes || '',
        assignedTo: source.assignedTo?._id || source.assignedTo || '',
      });
    } else {
      reset(defaultValues);
    }
  }, [isOpen, task, prefill, reset, defaultValues]);

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const totalHours = computeTotalHours(startTime, endTime);

  const mutation = useMutation({
    mutationFn: (values) => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      if (totalHours) formData.append('totalHours', totalHours);
      if (attachment) formData.append('attachment', attachment);

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
          name="client"
          render={({ field }) => (
            <Select
              label="Client"
              placeholder="Select client"
              options={(clients || []).map((c) => ({ value: c._id, label: c.name }))}
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

        {isSuperAdmin && (
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
        <Input label="Total Hours" value={totalHours || ''} disabled readOnly containerClassName="opacity-90" />

        <Input label="Expected Completion" type="date" {...register('expectedCompletion')} />
        <Input label="Actual Completion" type="date" {...register('actualCompletion')} />

        <Input label="GitHub Link" placeholder="https://github.com/..." {...register('githubLink')} />
        <Input label="Task URL" placeholder="https://..." {...register('taskUrl')} />

        <Textarea label="Remarks" containerClassName="sm:col-span-2" {...register('remarks')} />
        <Textarea label="Notes" containerClassName="sm:col-span-2" {...register('notes')} />

        <FileInput
          label="Attachment / Image"
          fileName={attachment?.name}
          onChange={(e) => setAttachment(e.target.files?.[0] || null)}
          className="sm:col-span-2"
        />

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
