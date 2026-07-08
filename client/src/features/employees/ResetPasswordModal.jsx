import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Modal, Input, Button } from '../../components/ui';
import { resetPasswordAdminSchema } from '../../schemas/employeeSchemas';
import { resetUserPassword } from '../../api/users';

export default function ResetPasswordModal({ isOpen, onClose, employee }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordAdminSchema), defaultValues: { newPassword: '' } });

  const mutation = useMutation({
    mutationFn: ({ newPassword }) => resetUserPassword(employee._id, newPassword),
    onSuccess: () => {
      toast.success('Password reset successfully');
      reset();
      onClose();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Something went wrong'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reset Password — ${employee?.name || ''}`} size="sm">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4" autoComplete="off">
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Reset Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
