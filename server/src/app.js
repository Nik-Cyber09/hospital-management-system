import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { authRouter } from './routes/auth.js'
import { recordsRouter } from './routes/records.js'

const app = express()
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')

function enforceTrustedOrigin(request, response, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    next()
    return
  }
  const origin = request.get('origin')
  const expectedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  if (origin && expectedOrigin && origin !== expectedOrigin) {
    response.status(403).json({ error: 'Request origin is not allowed.' })
    return
  }
  next()
}

app.disable('x-powered-by')
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    },
  },
}))
app.use('/api', enforceTrustedOrigin)
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())

app.get('/api/health', (_request, response) => {
  const ready = mongoose.connection.readyState === 1
  response.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' })
})
app.use('/api/auth', authRouter)
app.use('/api/records', recordsRouter)

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API route not found.' })
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist, { index: false }))
  app.get('*path', (_request, response, next) => {
    response.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next(error)
    })
  })
}

app.use((error, _request, response, _next) => {
  console.error('Request failed:', error)
  if (response.headersSent) return
  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Request body must contain valid JSON.' })
    return
  }
  response.status(500).json({ error: 'An unexpected server error occurred.' })
})

export default app
