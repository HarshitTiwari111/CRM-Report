import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Modal, Input, Select, Button } from '../../components/ui';
import { employeeSchema } from '../../schemas/employeeSchemas';
import { createUser, updateUser as updateUserApi } from '../../api/users';
import { getDepartments } from '../../api/metadata';
import { getUsers } from '../../api/users';
import { ROLES } from '../../utils/constants';
import { format } from 'date-fns';

export default function EmployeeFormModal({ isOpen, onClose, employee }) {
  const isEdit = Boolean(employee);
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => getDepartments({ limit: 100 }),
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
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(employeeSchema(isEdit)),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      department: '',
      designation: '',
      manager: '',
      joiningDate: '',
      role: ROLES.EMPLOYEE,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        reset({
          name: employee.name || '',
          email: employee.email || '',
          password: '',
          phone: employee.phone || '',
          department: employee.department?._id || employee.department || '',
          designation: employee.designation || '',
          manager: employee.manager?._id || employee.manager || '',
          joiningDate: employee.joiningDate ? format(new Date(employee.joiningDate), 'yyyy-MM-dd') : '',
          role: employee.role || ROLES.EMPLOYEE,
        });
      } else {
        reset({
          name: '',
          email: '',
          password: '',
          phone: '',
          department: '',
          designation: '',
          manager: '',
          joiningDate: '',
          role: ROLES.EMPLOYEE,
        });
      }
    }
  }, [isOpen, employee, reset]);

  const mutation = useMutation({
    mutationFn: (payload) => {
      const cleaned = { ...payload, manager: payload.manager || undefined };
      if (isEdit) {
        const { password, ...rest } = cleaned;
        const body = password ? cleaned : rest;
        return updateUserApi(employee._id, body);
      }
      return createUser(cleaned);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Employee updated successfully' : 'Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Something went wrong');
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'} size="lg">
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        autoComplete="off"
      >
        <Input label="Full Name" autoComplete="off" error={errors.name?.message} {...register('name')} />
        <Input
          label="Email"
          type="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={isEdit ? 'New Password (optional)' : 'Password'}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input label="Phone" autoComplete="off" error={errors.phone?.message} {...register('phone')} />

        <Controller
          control={control}
          name="department"
          render={({ field }) => (
            <Select
              label="Department"
              placeholder="Select department"
              error={errors.department?.message}
              options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
              {...field}
            />
          )}
        />

        <Input label="Designation" error={errors.designation?.message} {...register('designation')} />

        <Controller
          control={control}
          name="manager"
          render={({ field }) => (
            <Select
              label="Manager"
              placeholder="No manager"
              error={errors.manager?.message}
              options={(managers || [])
                .filter((m) => m._id !== employee?._id)
                .map((m) => ({ value: m._id, label: m.name }))}
              {...field}
            />
          )}
        />

        <Input label="Joining Date" type="date" error={errors.joiningDate?.message} {...register('joiningDate')} />

        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              label="Role"
              error={errors.role?.message}
              options={[
                { value: ROLES.EMPLOYEE, label: 'Employee' },
                { value: ROLES.MANAGER, label: 'Manager' },
                { value: ROLES.ADMIN, label: 'Admin' },
                { value: ROLES.SUPERADMIN, label: 'Super Admin' },
              ]}
              {...field}
            />
          )}
        />

        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
