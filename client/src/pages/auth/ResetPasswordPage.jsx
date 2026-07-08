import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AuthLayout from '../../components/layout/AuthLayout';
import { Input, Button } from '../../components/ui';
import { resetPasswordSchema } from '../../schemas/authSchemas';
import { resetPassword } from '../../api/auth';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: ({ password }) => resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset successfully. Please sign in.');
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Reset link is invalid or expired');
    },
  });

  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password for your account">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="mt-2 w-full" isLoading={mutation.isPending}>
          Reset password
        </Button>
        <Link to="/login" className="text-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
