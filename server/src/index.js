import 'dotenv/config'
import app from './app.js'
import { connectDatabase } from './config.js'

const port = Number(process.env.PORT || 4000)

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters. Configure it in server/.env.')
}
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN must be set to the deployed HTTPS client origin in production.')
}

await connectDatabase()
const server = app.listen(port, () => console.info(`Carepoint API listening on port ${port}.`))

function shutdown(signal) {
  console.info(`${signal} received; closing the server.`)
  server.close(async (error) => {
    if (error) {
      console.error('Failed to close the HTTP server cleanly:', error)
      process.exitCode = 1
    }
    await import('mongoose').then(({ default: mongoose }) => mongoose.disconnect())
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
