import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiSettings, FiClock, FiSave } from 'react-icons/fi';
import { Modal, Card, Input, Select, Button, Spinner } from '../../components/ui';
import { closeSettingsModal } from '../uiSlice';
import { settingsSchema } from '../../schemas/settingsSchemas';
import { getSettings, updateSettings } from '../../api/settings';
import { cn } from '../../utils/cn';

const FORM_ID = 'company-settings-form';

const WEEK_DAYS = [
  { value: 'Monday', short: 'Mon' },
  { value: 'Tuesday', short: 'Tue' },
  { value: 'Wednesday', short: 'Wed' },
  { value: 'Thursday', short: 'Thu' },
  { value: 'Friday', short: 'Fri' },
  { value: 'Saturday', short: 'Sat' },
  { value: 'Sunday', short: 'Sun' },
];

const cardTitle = (Icon, label) => (
  <span className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-primary-600" /> {label}
  </span>
);

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

export default function SettingsModal() {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.settingsModalOpen);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    select: (res) => res.data.data,
    enabled: isOpen,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
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
    setValue('workingDays', next, { shouldValidate: true, shouldDirty: true });
  };

  const mutation = useMutation({
    mutationFn: (values) =>
      updateSettings({
        companyName: values.companyName,
        timezone: values.timezone,
        dateFormat: values.dateFormat,
        workingDays: values.workingDays,
        officeHours: { start: values.officeHoursStart, end: values.officeHoursEnd },
      }),
    onSuccess: (_data, values) => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      reset(values);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update settings'),
  });

  const handleClose = () => dispatch(closeSettingsModal());

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Company Settings"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Close
            </Button>
            <Button type="submit" form={FORM_ID} icon={FiSave} isLoading={mutation.isPending} disabled={!isDirty}>
              Save Settings
            </Button>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
          <Card title={cardTitle(FiSettings, 'General')}>
            <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
              Basic company information used across reports, PDFs, and notifications.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Company Name"
                containerClassName="sm:col-span-2"
                error={errors.companyName?.message}
                {...register('companyName')}
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

          <Card title={cardTitle(FiClock, 'Working Schedule')}>
            <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
              Defines the standard work week and office hours used for attendance and reports.
            </p>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const active = workingDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'flex h-10 w-16 items-center justify-center rounded-lg border text-sm font-semibold transition-colors',
                        active
                          ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-700'
                      )}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              {errors.workingDays && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.workingDays.message}</p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Office Hours Start"
                type="time"
                error={errors.officeHoursStart?.message}
                {...register('officeHoursStart')}
              />
              <span className="pb-2.5 text-sm font-medium text-slate-400 dark:text-slate-500">to</span>
              <Input
                label="Office Hours End"
                type="time"
                error={errors.officeHoursEnd?.message}
                {...register('officeHoursEnd')}
              />
            </div>
          </Card>
        </form>
      )}
    </Modal>
  );
}
