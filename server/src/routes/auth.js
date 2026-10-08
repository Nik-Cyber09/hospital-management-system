import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { changePasswordSchema, createStaffSchema, loginSchema } from '../validation.js'

export const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
})

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
}
const DUMMY_PASSWORD_HASH = '$2b$12$z3Xj4nKNqTsAk6LoprSEIeE8GuiRW309S9vd0Veo8ngzZmz/FyIyi'

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

authRouter.post('/login', loginLimiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Enter a valid email and password.' })
      return
    }

    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash +tokenVersion')
    const passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH)
    if (!user || !passwordMatches) {
      response.status(401).json({ error: 'Email or password is incorrect.' })
      return
    }

    const token = jwt.sign({}, process.env.JWT_SECRET, {
      subject: user.id,
      issuer: 'carepoint',
      audience: 'carepoint-web',
      expiresIn: '8h',
      jwtid: randomBytes(16).toString('hex'),
      version: user.tokenVersion ?? 0,
    })
    response.cookie('carepoint_session', token, sessionCookieOptions)
    response.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', (_request, response) => {
  response.clearCookie('carepoint_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
  response.status(204).end()
})

authRouter.get('/me', requireAuth, (request, response) => {
  response.json({ user: publicUser(request.user) })
})

authRouter.post('/password', requireAuth, async (request, response, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Your new password must contain at least 12 characters.' })
      return
    }
    const user = await User.findById(request.user.id).select('+passwordHash +tokenVersion')
    if (!user) {
      response.status(401).json({ error: 'Sign in again before changing your password.' })
      return
    }
    if (!await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) {
      response.status(400).json({ error: 'Your current password is incorrect.' })
      return
    }
    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    user.tokenVersion += 1
    await user.save()
    response.clearCookie('carepoint_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

authRouter.get('/users', requireAuth, requireAdmin, async (_request, response, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: 1 }).lean()
    response.json({ users: users.map((user) => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/users', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    const parsed = createStaffSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Provide a name, valid email, and password with at least 12 characters.' })
      return
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)
    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: 'staff',
    })
    response.status(201).json({ user: publicUser(user) })
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ error: 'An account with that email already exists.' })
      return
    }
    next(error)
  }
})
