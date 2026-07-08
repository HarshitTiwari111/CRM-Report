import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import AuthLayout from '../../components/layout/AuthLayout';
import { Input, Button, Checkbox } from '../../components/ui';
import { loginSchema } from '../../schemas/authSchemas';
import { login as loginApi } from '../../api/auth';
import { setCredentials } from '../../features/auth/authSlice';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: ({ data }) => {
      const { accessToken, refreshToken, user } = data.data;
      dispatch(setCredentials({ accessToken, refreshToken, user }));
      toast.success(`Welcome back, ${user.name}!`);
      const redirectTo = location.state?.from || (user.role === 'superadmin' ? '/admin/dashboard' : '/employee/dashboard');
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid email or password');
    },
  });

  const onSubmit = (values) => mutation.mutate(values);

  return (
    <AuthLayout title="Sign in" subtitle="Enter your credentials to access your dashboard">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
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

        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" {...register('rememberMe')} />
          <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="mt-2 w-full" isLoading={mutation.isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
