import { z } from 'zod';

export const employeeSchema = (isEdit) =>
  z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: isEdit
      ? z.string().optional().or(z.literal(''))
      : z.string().min(8, 'Password must be at least 8 characters').regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a number'),
    phone: z.string().min(1, 'Phone is required'),
    department: z.string().min(1, 'Department is required'),
    designation: z.string().min(1, 'Designation is required'),
    manager: z.string().optional().or(z.literal('')),
    joiningDate: z.string().min(1, 'Joining date is required'),
    role: z.string().min(1, 'Role is required'),
  });

export const assignSchema = z.object({
  department: z.string().optional().or(z.literal('')),
  team: z.string().optional().or(z.literal('')),
  manager: z.string().optional().or(z.literal('')),
});

export const resetPasswordAdminSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a number'),
});
