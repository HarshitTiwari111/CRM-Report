import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import AuthLayout from '../../components/layout/AuthLayout';
import { Input, Button } from '../../components/ui';
import { registerSchema } from '../../schemas/authSchemas';
import { register as registerApi } from '../../api/auth';
import { setCredentials } from '../../features/auth/authSlice';
import { roleHome } from '../../utils/constants';

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: registerApi,
    onSuccess: ({ data }) => {
      const { accessToken, user } = data.data;
      dispatch(setCredentials({ accessToken, user }));
      toast.success(`Welcome, ${user.name}!`);
      navigate(roleHome(user.role), { replace: true });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });

  const onSubmit = (values) => {
    const { confirmPassword, ...payload } = values;
    mutation.mutate(payload);
  };

  return (
    <AuthLayout title="Create account" subtitle="Sign up to get started with TaskPulse">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Full Name"
          placeholder="John Doe"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="+91 9876543210"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            tabIndex={-1}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="mt-2 w-full" isLoading={mutation.isPending}>
          Create Account
        </Button>

        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
