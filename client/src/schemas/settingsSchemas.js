import { z } from 'zod';

export const settingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  dateFormat: z.string().min(1, 'Date format is required'),
  workingDays: z.array(z.string()).min(1, 'Select at least one working day'),
  officeHoursStart: z.string().min(1, 'Start time is required'),
  officeHoursEnd: z.string().min(1, 'End time is required'),
});
