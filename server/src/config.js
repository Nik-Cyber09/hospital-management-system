import mongoose from 'mongoose'

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure it locally.')
  }

  await mongoose.connect(uri, { appName: 'carepoint-hospital' })
  console.info('Connected to MongoDB.')
}
