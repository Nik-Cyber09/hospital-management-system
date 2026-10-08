import { z } from 'zod'

const requiredText = (max = 200) => z.string().trim().min(1).max(max)
const phone = z.string().trim().min(3).max(40)
const bcryptInput = z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be no more than 72 UTF-8 bytes.')
const password = bcryptInput.min(12)
const recordSchemas = {
  patients: z.object({
    name: requiredText(120),
    age: z.coerce.number().int().min(0).max(125),
    gender: z.enum(['Female', 'Male', 'Non-binary', 'Prefer not to say']),
    phone,
    condition: requiredText(240),
    doctorId: z.string().trim().max(80).default(''),
    status: z.enum(['Stable', 'Under care', 'Needs follow-up']),
  }).strict(),
  doctors: z.object({
    name: requiredText(120),
    specialty: requiredText(120),
    email: z.email().trim().max(254),
    phone,
    status: z.enum(['On duty', 'Off duty']),
    availability: z.string().trim().max(200).default(''),
  }).strict(),
  appointments: z.object({
    patientId: requiredText(80),
    doctorId: requiredText(80),
    date: z.iso.datetime(),
    reason: requiredText(240),
    status: z.enum(['Confirmed', 'Waiting', 'Completed', 'Cancelled']),
  }).strict(),
  invoices: z.object({
    patientId: requiredText(80),
    date: z.iso.date(),
    description: requiredText(240),
    amount: z.coerce.number().positive().max(1_000_000),
    status: z.enum(['Pending', 'Paid', 'Overdue']),
  }).strict(),
}

export function validateRecord(type, data) {
  const schema = recordSchemas[type]
  return schema ? schema.safeParse(data) : null
}

export const loginSchema = z.object({
  email: z.email().trim().max(254),
  password: bcryptInput,
}).strict()

export const createStaffSchema = z.object({
  name: requiredText(120),
  email: z.email().trim().max(254),
  password,
}).strict()

export const changePasswordSchema = z.object({
  currentPassword: bcryptInput,
  newPassword: password,
}).strict()

export const bootstrapAdminSchema = z.object({
  name: requiredText(120),
  email: z.email().trim().max(254),
  password,
}).strict()
