import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AuthLayout from '../../components/layout/AuthLayout';
import { Input, Button } from '../../components/ui';
import { forgotPasswordSchema } from '../../schemas/authSchemas';
import { forgotPassword } from '../../api/auth';

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const mutation = useMutation({
    mutationFn: ({ email }) => forgotPassword(email),
    onSuccess: () => {
      toast.success('If that email exists, a reset link has been sent.');
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Something went wrong');
    },
  });

  return (
    <AuthLayout title="Forgot password" subtitle="We'll email you a link to reset your password">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" className="mt-2 w-full" isLoading={mutation.isPending}>
          Send reset link
        </Button>
        <Link to="/login" className="text-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
