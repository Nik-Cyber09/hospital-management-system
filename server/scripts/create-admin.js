import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../src/models/User.js'
import { bootstrapAdminSchema } from '../src/validation.js'

const parsed = bootstrapAdminSchema.safeParse({
  name: process.env.ADMIN_NAME,
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
})

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required. Configure server/.env before creating an administrator.')
}
if (!parsed.success) {
  throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters in server/.env.')
}

try {
  await mongoose.connect(process.env.MONGODB_URI, { appName: 'carepoint-admin-setup' })
  const existingAdmin = await User.exists({ role: 'admin' })
  if (existingAdmin) {
    throw new Error('An administrator account already exists. Use the signed-in administrator to create staff accounts.')
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: 'admin',
  })
  console.info(`Administrator account created for ${parsed.data.email}. Remove ADMIN_PASSWORD from server/.env when done.`)
} finally {
  await mongoose.disconnect()
}
