import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

export async function requireAuth(request, response, next) {
  const token = request.cookies?.carepoint_session
  if (!token) {
    response.status(401).json({ error: 'Sign in to continue.' })
    return
  }

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'carepoint',
      audience: 'carepoint-web',
    })
    const user = await User.findById(claims.sub).select('name email role +tokenVersion')
    if (!user || claims.version !== user.tokenVersion) {
      response.status(401).json({ error: 'Your session is no longer valid. Sign in again.' })
      return
    }
    request.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      response.status(401).json({ error: 'Your session has expired. Sign in again.' })
      return
    }
    next(error)
  }
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') {
    response.status(403).json({ error: 'Administrator access is required.' })
    return
  }
  next()
}
