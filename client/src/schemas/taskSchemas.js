import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  project: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  taskType: z.enum([
    'development',
    'bugfix',
    'meeting',
    'testing',
    'research',
    'design',
    'support',
    'deployment',
    'documentation',
    'training',
    'other',
  ]),
  startTime: z.string().optional().or(z.literal('')),
  endTime: z.string().optional().or(z.literal('')),
  taskDate: z.string().min(1, 'Task date is required'),
  status: z.enum(['pending', 'in-progress', 'completed', 'hold', 'cancelled']),
  assignedTo: z.string().optional().or(z.literal('')),
});
