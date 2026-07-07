import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { PageHeader, Card, Input, Button, FileInput, Badge } from '../../components/ui';
import { profileSchema } from '../../schemas/profileSchemas';
import { changePasswordSchema } from '../../schemas/authSchemas';
import { updateMyProfile } from '../../api/users';
import { changePassword } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { updateUser as updateUserAction } from '../../features/auth/authSlice';

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
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPassword();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to change password'),
  });

  const onProfileSubmit = (values) => {
    profileMutation.mutate({ ...values, profilePhoto: photo || undefined });
  };

  return (
    <div>
      <PageHeader title="Profile & Settings" subtitle="Manage your personal information and security" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Account Overview" className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 text-center">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700">
                {user?.name?.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-slate-800">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <Badge color="indigo">{user?.role}</Badge>
            <div className="mt-2 w-full space-y-1 text-left text-sm text-slate-500">
              <p><span className="font-medium text-slate-600">Employee ID:</span> {user?.employeeId || '—'}</p>
              <p><span className="font-medium text-slate-600">Department:</span> {user?.department?.name || '—'}</p>
              <p><span className="font-medium text-slate-600">Designation:</span> {user?.designation || '—'}</p>
              <p>
                <span className="font-medium text-slate-600">Joined:</span>{' '}
                {user?.joiningDate ? format(new Date(user.joiningDate), 'MMM d, yyyy') : '—'}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Update Profile">
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name" error={profileErrors.name?.message} {...registerProfile('name')} />
              <Input label="Phone" error={profileErrors.phone?.message} {...registerProfile('phone')} />
              <FileInput
                label="Profile Photo"
                accept="image/*"
                fileName={photo?.name}
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="sm:col-span-2"
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" isLoading={profileMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Change Password">
            <form onSubmit={handlePasswordSubmit((v) => passwordMutation.mutate(v))} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Current Password"
                type="password"
                containerClassName="sm:col-span-2"
                error={passwordErrors.oldPassword?.message}
                {...registerPassword('oldPassword')}
              />
              <Input
                label="New Password"
                type="password"
                error={passwordErrors.newPassword?.message}
                {...registerPassword('newPassword')}
              />
              <Input
                label="Confirm New Password"
                type="password"
                error={passwordErrors.confirmPassword?.message}
                {...registerPassword('confirmPassword')}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" isLoading={passwordMutation.isPending}>
                  Change Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
