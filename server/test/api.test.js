import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createServer } from 'node:http'
import app from '../src/app.js'
import { dependentRecordFilter } from '../src/routes/records.js'
import { bootstrapAdminSchema, changePasswordSchema, createStaffSchema, loginSchema, validateRecord } from '../src/validation.js'

let server
let origin

before(async () => {
  process.env.CLIENT_ORIGIN = 'http://localhost:5173'
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

async function request(path, options = {}) {
  return fetch(`${origin}${path}`, {
    ...options,
    headers: {
      origin: 'http://localhost:5173',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })
}

describe('hospital record validation', () => {
  it('accepts patient, doctor, appointment, and invoice records', () => {
    assert.equal(validateRecord('patients', {
      name: 'Taylor Example', age: 30, gender: 'Prefer not to say', phone: '555-0100',
      condition: 'Checkup', status: 'Stable',
    }).success, true)
    assert.equal(validateRecord('doctors', {
      name: 'Dr. Taylor Example', specialty: 'Family medicine', email: 'doctor@example.test',
      phone: '555-0101', status: 'On duty',
    }).success, true)
    assert.equal(validateRecord('appointments', {
      patientId: 'PT-123', doctorId: 'DR-123', date: '2026-10-08T09:30:00.000Z',
      reason: 'Checkup', status: 'Confirmed',
    }).success, true)
    assert.equal(validateRecord('invoices', {
      patientId: 'PT-123', date: '2026-10-08', description: 'Checkup',
      amount: 50, status: 'Pending',
    }).success, true)
  })

  it('rejects unsafe or malformed record payloads', () => {
    assert.equal(validateRecord('patients', { name: '', age: -1, unexpected: true }).success, false)
    assert.equal(validateRecord('doctors', { name: 'Dr. Example', email: 'not-email' }).success, false)
    assert.equal(validateRecord('appointments', { patientId: 'PT-1', doctorId: 'DR-1', date: 'yesterday' }).success, false)
    assert.equal(validateRecord('invoices', { patientId: 'PT-1', date: '2026-10-08', description: 'Visit', amount: -1, status: 'Pending' }).success, false)
    assert.equal(validateRecord('users', {}), null)
  })
})

describe('record deletion integrity', () => {
  it('prevents deleting patients that are referenced by appointments or invoices', () => {
    assert.deepEqual(dependentRecordFilter('patients', 'PT-1'), {
      type: { $in: ['appointments', 'invoices'] },
      'data.patientId': 'PT-1',
    })
  })

  it('prevents deleting doctors that are assigned to patients or appointments', () => {
    assert.deepEqual(dependentRecordFilter('doctors', 'DR-1'), {
      $or: [
        { type: 'appointments', 'data.doctorId': 'DR-1' },
        { type: 'patients', 'data.doctorId': 'DR-1' },
      ],
    })
  })

  it('allows appointment and invoice removal without dependent records', () => {
    assert.equal(dependentRecordFilter('appointments', 'AP-1'), null)
    assert.equal(dependentRecordFilter('invoices', 'INV-1'), null)
  })
})

describe('account credential validation', () => {
  it('requires strong new account and password-change credentials', () => {
    const account = { name: 'Clinic Admin', email: 'admin@example.test', password: 'correct horse battery' }
    assert.equal(bootstrapAdminSchema.safeParse(account).success, true)
    assert.equal(createStaffSchema.safeParse(account).success, true)
    assert.equal(createStaffSchema.safeParse({ ...account, password: 'short' }).success, false)
    assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'correct horse battery' }).success, true)
    assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: '🌱'.repeat(24) }).success, false)
    assert.equal(loginSchema.safeParse({ email: 'admin@example.test', password: 'valid-password'.repeat(8) }).success, false)
  })
})

describe('API access controls', () => {
  it('requires a signed-in user before reading clinic records', async () => {
    const response = await request('/api/records/patients')
    assert.equal(response.status, 401)
    assert.equal((await response.json()).error, 'Sign in to continue.')
  })

  it('validates login input before querying the account database', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: '' }),
    })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'Enter a valid email and password.')
  })

  it('returns a client error for malformed JSON', async () => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: '{"email":',
    })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'Request body must contain valid JSON.')
  })

  it('returns a payload-too-large response instead of a server error', async () => {
    const payload = JSON.stringify({ email: 'a'.repeat(33 * 1024), password: 'valid-password' })
    const response = await request('/api/auth/login', { method: 'POST', body: payload })
    assert.equal(response.status, 413)
    assert.equal((await response.json()).error, 'Request body exceeds the 32 KB limit.')
  })

  it('requires a signed-in user before creating clinic records', async () => {
    const response = await request('/api/records/patients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Taylor', age: 30 }),
    })
    assert.equal(response.status, 401)
  })

  it('requires a signed-in user before updating clinic records', async () => {
    const response = await request('/api/records/patients/PT-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Taylor', age: 30 }),
    })
    assert.equal(response.status, 401)
  })

  it('requires a signed-in user before deleting clinic records', async () => {
    const response = await request('/api/records/patients/PT-1', { method: 'DELETE' })
    assert.equal(response.status, 401)
  })

  it('rejects browser mutations from a different origin', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'https://untrusted.example' },
      body: JSON.stringify({ email: 'admin@example.test', password: 'not-a-password' }),
    })
    assert.equal(response.status, 403)
    assert.equal((await response.json()).error, 'Request origin is not allowed.')
  })

  it('accepts the Vite loopback address used by the browser preview', async () => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: '' }),
    })
    assert.equal(response.status, 400)
  })

  it('rejects cookie-authenticated mutations without an Origin header', async () => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.test', password: 'not-a-password' }),
    })
    assert.equal(response.status, 403)
    assert.equal((await response.json()).error, 'Request origin is not allowed.')
  })

  it('uses only configured origins in production', async () => {
    const previousEnvironment = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const allowed = await request('/api/auth/login', {
        method: 'POST',
        headers: { origin: 'http://localhost:5173' },
        body: JSON.stringify({ email: 'invalid', password: '' }),
      })
      const blocked = await request('/api/auth/login', {
        method: 'POST',
        headers: { origin: 'http://127.0.0.1:5173' },
        body: JSON.stringify({ email: 'invalid', password: '' }),
      })
      assert.equal(allowed.status, 400)
      assert.equal(blocked.status, 403)
    } finally {
      if (previousEnvironment === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousEnvironment
    }
  })

  it('reports that the database must be ready before serving the application', async () => {
    const response = await request('/api/health')
    assert.equal(response.status, 503)
    assert.equal((await response.json()).status, 'unavailable')
  })
})
