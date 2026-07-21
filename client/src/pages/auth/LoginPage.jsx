import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import AuthLayout from '../../components/layout/AuthLayout';
import { Input, Button, Checkbox } from '../../components/ui';
import { loginSchema } from '../../schemas/authSchemas';
import { login as loginApi, verifyTwoFactorLogin } from '../../api/auth';
import { setCredentials } from '../../features/auth/authSlice';
import { roleHome } from '../../utils/constants';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  // When the server answers with requiresTwoFactor, we hold the temp token
  // and switch the form to the 6-digit code step.
  const [twoFactor, setTwoFactor] = useState(null);
  const [code, setCode] = useState('');
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

  const finishLogin = (data) => {
    const { accessToken, user } = data;
    dispatch(setCredentials({ accessToken, user }));
    toast.success(`Welcome back, ${user.name}!`);
    const redirectTo = location.state?.from || roleHome(user.role);
    navigate(redirectTo, { replace: true });
  };

  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: ({ data }) => {
      if (data.data.requiresTwoFactor) {
        setTwoFactor({ tempToken: data.data.tempToken });
        return;
      }
      finishLogin(data.data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid email or password');
    },
  });

  const twoFactorMutation = useMutation({
    mutationFn: verifyTwoFactorLogin,
    onSuccess: ({ data }) => finishLogin(data.data),
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid authentication code');
    },
  });

  const onSubmit = (values) => mutation.mutate(values);

  const onSubmitCode = (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    twoFactorMutation.mutate({ tempToken: twoFactor.tempToken, code: code.trim() });
  };

  if (twoFactor) {
    return (
      <AuthLayout title="Two-factor verification" subtitle="Enter the 6-digit code from your authenticator app">
        <form onSubmit={onSubmitCode} className="flex flex-col gap-4">
          <div className="flex items-center justify-center text-primary-600 dark:text-primary-400">
            <FiShield className="h-10 w-10" />
          </div>
          <Input
            label="Authentication code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <Button type="submit" className="w-full" isLoading={twoFactorMutation.isPending}>
            Verify
          </Button>
          <button
            type="button"
            onClick={() => {
              setTwoFactor(null);
              setCode('');
            }}
            className="text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Back to sign in
          </button>
        </form>
      </AuthLayout>
    );
  }

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
        </div>

        <Button type="submit" className="mt-2 w-full" isLoading={mutation.isPending}>
          Sign in
        </Button>

        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
