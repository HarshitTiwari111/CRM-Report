import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  FiMail,
  FiPhone,
  FiBriefcase,
  FiCalendar,
  FiHash,
  FiUser,
  FiLock,
  FiShield,
} from 'react-icons/fi';
import { PageHeader, Card, Input, Button, FileInput, Badge } from '../../components/ui';
import { profileSchema } from '../../schemas/profileSchemas';
import { changePasswordSchema } from '../../schemas/authSchemas';
import { updateMyProfile } from '../../api/users';
import { changePassword, setupTwoFactor, enableTwoFactor, disableTwoFactor } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { updateUser as updateUserAction, setCredentials as setCredentialsAction } from '../../features/auth/authSlice';
import { isAdminRole, ROLE_LABELS } from '../../utils/constants';

function TwoFactorCard({ user, dispatch }) {
  const [setup, setSetup] = useState(null); // { qrDataUrl, secret }
  const [code, setCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const setupMutation = useMutation({
    mutationFn: setupTwoFactor,
    onSuccess: ({ data }) => setSetup(data.data),
    onError: (error) => toast.error(error.response?.data?.message || 'Could not start 2FA setup'),
  });

  const enableMutation = useMutation({
    mutationFn: () => enableTwoFactor(code.trim()),
    onSuccess: () => {
      toast.success('Two-factor authentication enabled');
      dispatch(updateUserAction({ twoFactorEnabled: true }));
      setSetup(null);
      setCode('');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Invalid code'),
  });

  const disableMutation = useMutation({
    mutationFn: () => disableTwoFactor({ password: disablePassword, code: disableCode.trim() }),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled');
      dispatch(updateUserAction({ twoFactorEnabled: false }));
      setDisablePassword('');
      setDisableCode('');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not disable 2FA'),
  });

  return (
    <Card
      title="Two-Factor Authentication (2FA)"
      actions={<FiShield className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
    >
      {user?.twoFactorEnabled ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge color="green">Enabled</Badge>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Your account requires an authenticator code at sign-in.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              disableMutation.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Current Password"
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            <Input
              label="Authentication Code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
            />
            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-700">
              <Button type="submit" variant="danger" isLoading={disableMutation.isPending}>
                Disable 2FA
              </Button>
            </div>
          </form>
        </div>
      ) : setup ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Scan this QR code with Google Authenticator, Authy or a similar app, then enter the
            6-digit code to confirm.
          </p>
          <div className="flex justify-center">
            <img src={setup.qrDataUrl} alt="2FA QR code" className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700" />
          </div>
          <p className="break-all text-center text-xs text-slate-400 dark:text-slate-500">
            Manual key: <span className="font-mono">{setup.secret}</span>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim().length !== 6) {
                toast.error('Enter the 6-digit code');
                return;
              }
              enableMutation.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Authentication Code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
              <Button type="button" variant="secondary" onClick={() => setSetup(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={enableMutation.isPending}>
                Verify & Enable
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="-mt-2 text-xs text-slate-400 dark:text-slate-500">
            Add an extra layer of protection to your account. Strongly recommended for admin
            accounts — even if your password leaks, nobody can sign in without your phone.
          </p>
          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-700">
            <Button type="button" onClick={() => setupMutation.mutate()} isLoading={setupMutation.isPending}>
              Enable 2FA
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [photo, setPhoto] = useState(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const profileMutation = useMutation({
    mutationFn: (payload) => updateMyProfile(payload),
    onSuccess: ({ data }) => {
      toast.success('Profile updated successfully');
      dispatch(updateUserAction(data.data));
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }) => changePassword({ oldPassword, newPassword }),
    onSuccess: ({ data }) => {
      toast.success('Password changed successfully');
      // Server revoked all other sessions and issued this one fresh
      if (data.data?.accessToken) {
        dispatch(setCredentialsAction({ accessToken: data.data.accessToken }));
      }
      resetPassword();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to change password'),
  });

  const onProfileSubmit = (values) => {
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('phone', values.phone || '');
    if (photo) formData.append('profilePhoto', photo);
    profileMutation.mutate(formData);
  };

  return (
    <div>
      <PageHeader title="Profile & Settings" subtitle="Manage your personal information and security" />

      {/* Cover / identity banner */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white card-shadow dark:border-slate-700 dark:bg-slate-800">
        <div className="h-20 bg-gradient-to-r from-navy-950 via-navy-900 to-primary-700 sm:h-24" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:gap-5 sm:px-6">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.name}
              className="-mt-10 h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover shadow-md sm:h-24 sm:w-24 dark:border-slate-800"
            />
          ) : (
            <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-primary-600 text-2xl font-semibold text-white shadow-md sm:h-24 sm:w-24 dark:border-slate-800">
              {user?.name?.charAt(0)}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-1 pt-1 sm:flex-row sm:items-center sm:justify-between sm:pt-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{user?.name}</h2>
                <Badge color={isAdminRole(user?.role) ? 'purple' : 'indigo'} className="flex items-center gap-1">
                  <FiShield className="h-3 w-3" />
                  {ROLE_LABELS[user?.role] || 'Employee'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 sm:px-6 dark:divide-slate-700 dark:border-slate-700">
          <InfoRow icon={FiHash} label="Employee ID" value={user?.employeeId} />
          <InfoRow icon={FiBriefcase} label="Department" value={user?.department?.name} />
          <InfoRow icon={FiUser} label="Designation" value={user?.designation} />
          <InfoRow
            icon={FiCalendar}
            label="Joined"
            value={user?.joiningDate ? format(new Date(user.joiningDate), 'MMM d, yyyy') : null}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Personal Information"
          actions={<FiUser className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
        >
          <p className="-mt-2 mb-4 text-xs text-slate-400 dark:text-slate-500">Update your name, phone number and profile photo.</p>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              icon={FiUser}
              error={profileErrors.name?.message}
              {...registerProfile('name')}
            />
            <Input
              label="Phone"
              icon={FiPhone}
              error={profileErrors.phone?.message}
              {...registerProfile('phone')}
            />
            <Input label="Email" icon={FiMail} value={user?.email || ''} disabled />
            <FileInput
              label="Profile Photo"
              accept="image/*"
              fileName={photo?.name}
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-700">
              <Button type="submit" isLoading={profileMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Security"
          actions={<FiLock className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
        >
          <p className="-mt-2 mb-4 text-xs text-slate-400 dark:text-slate-500">
            Choose a strong password you don&apos;t use elsewhere.
          </p>
          <form onSubmit={handlePasswordSubmit((v) => passwordMutation.mutate(v))} className="flex flex-col gap-4">
            <Input
              label="Current Password"
              type="password"
              autoComplete="current-password"
              error={passwordErrors.oldPassword?.message}
              {...registerPassword('oldPassword')}
            />
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              error={passwordErrors.newPassword?.message}
              {...registerPassword('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword')}
            />
            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-700">
              <Button type="submit" isLoading={passwordMutation.isPending}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>

        <TwoFactorCard user={user} dispatch={dispatch} />
      </div>
    </div>
  );
}
