import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { PageHeader, Card, Input, Select, Button, Checkbox, FileInput, Spinner } from '../../components/ui';
import { settingsSchema } from '../../schemas/settingsSchemas';
import { getSettings, updateSettings } from '../../api/settings';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export default function SettingsPage() {
  const [logo, setLogo] = useState(null);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    select: (res) => res.data.data,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: '',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      officeHoursStart: '09:00',
      officeHoursEnd: '18:00',
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        companyName: settings.companyName || '',
        timezone: settings.timezone || 'Asia/Kolkata',
        dateFormat: settings.dateFormat || 'DD/MM/YYYY',
        workingDays: settings.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        officeHoursStart: settings.officeHours?.start || '09:00',
        officeHoursEnd: settings.officeHours?.end || '18:00',
      });
    }
  }, [settings, reset]);

  const workingDays = watch('workingDays') || [];

  const toggleDay = (day) => {
    const next = workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day];
    setValue('workingDays', next, { shouldValidate: true });
  };

  const mutation = useMutation({
    mutationFn: (values) =>
      updateSettings({
        companyName: values.companyName,
        logo: logo || settings?.logo,
        timezone: values.timezone,
        dateFormat: values.dateFormat,
        workingDays: values.workingDays,
        officeHours: { start: values.officeHoursStart, end: values.officeHoursEnd },
        theme: 'light',
      }),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update settings'),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Company Settings" subtitle="Configure company-wide preferences" />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <Card title="General" className="mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Company Name" error={errors.companyName?.message} {...register('companyName')} />
            <FileInput
              label="Company Logo"
              accept="image/*"
              fileName={logo?.name}
              onChange={(e) => setLogo(e.target.files?.[0] || null)}
            />
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => <Select label="Timezone" options={TIMEZONE_OPTIONS} {...field} />}
            />
            <Controller
              control={control}
              name="dateFormat"
              render={({ field }) => <Select label="Date Format" options={DATE_FORMAT_OPTIONS} {...field} />}
            />
          </div>
        </Card>

        <Card title="Working Schedule" className="mb-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Working Days</label>
            <div className="flex flex-wrap gap-3">
              {WEEK_DAYS.map((day) => (
                <Checkbox key={day} label={day} checked={workingDays.includes(day)} onChange={() => toggleDay(day)} />
              ))}
            </div>
            {errors.workingDays && <p className="mt-1 text-xs text-red-600">{errors.workingDays.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Office Hours Start" type="time" error={errors.officeHoursStart?.message} {...register('officeHoursStart')} />
            <Input label="Office Hours End" type="time" error={errors.officeHoursEnd?.message} {...register('officeHoursEnd')} />
          </div>
        </Card>

        <Card title="Appearance" className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Theme</p>
              <p className="text-xs text-slate-400">This application supports a light theme only.</p>
            </div>
            <Select value="light" disabled options={[{ value: 'light', label: 'Light theme only' }]} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={mutation.isPending}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
