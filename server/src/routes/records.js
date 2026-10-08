import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { HospitalRecord } from '../models/HospitalRecord.js'
import { requireAuth } from '../middleware/auth.js'
import { validateRecord } from '../validation.js'

export const recordsRouter = Router()
const allowedTypes = new Set(['patients', 'doctors', 'appointments', 'invoices'])

async function missingReference(type, data) {
  const references = type === 'patients'
    ? (data.doctorId ? [{ type: 'doctors', id: data.doctorId }] : [])
    : type === 'appointments'
      ? [{ type: 'patients', id: data.patientId }, { type: 'doctors', id: data.doctorId }]
      : type === 'invoices'
        ? [{ type: 'patients', id: data.patientId }]
        : []
  const existing = await Promise.all(references.map(({ type: refType, id }) => HospitalRecord.exists({ type: refType, id })))
  return references.find((_, index) => !existing[index])
}

recordsRouter.use(requireAuth)

recordsRouter.get('/:type', async (request, response, next) => {
  try {
    if (!allowedTypes.has(request.params.type)) {
      response.status(404).json({ error: 'Record collection not found.' })
      return
    }
    const records = await HospitalRecord.find({ type: request.params.type }).sort({ createdAt: -1 }).lean()
    response.json({ records: records.map(({ id, data }) => ({ id, ...data })) })
  } catch (error) {
    next(error)
  }
})

recordsRouter.post('/:type', async (request, response, next) => {
  try {
    const { type } = request.params
    if (!allowedTypes.has(type)) {
      response.status(404).json({ error: 'Record collection not found.' })
      return
    }
    const parsed = validateRecord(type, request.body)
    if (!parsed?.success) {
      response.status(400).json({ error: 'The record contains invalid or unsupported fields.', details: parsed?.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) })
      return
    }
    const missing = await missingReference(type, parsed.data)
    if (missing) {
      response.status(400).json({ error: `The referenced ${missing.type.slice(0, -1)} does not exist.` })
      return
    }

    const prefix = { patients: 'PT', doctors: 'DR', appointments: 'AP', invoices: 'INV' }[type]
    const id = `${prefix}-${randomBytes(8).toString('hex').toUpperCase()}`
    const record = await HospitalRecord.create({ type, id, data: parsed.data })
    response.status(201).json({ record: { id: record.id, ...record.data } })
  } catch (error) {
    next(error)
  }
})

recordsRouter.put('/:type/:id', async (request, response, next) => {
  try {
    const { type, id } = request.params
    if (!allowedTypes.has(type)) {
      response.status(404).json({ error: 'Record collection not found.' })
      return
    }
    const parsed = validateRecord(type, request.body)
    if (!parsed?.success) {
      response.status(400).json({ error: 'The record contains invalid or unsupported fields.', details: parsed?.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) })
      return
    }
    const missing = await missingReference(type, parsed.data)
    if (missing) {
      response.status(400).json({ error: `The referenced ${missing.type.slice(0, -1)} does not exist.` })
      return
    }
    const record = await HospitalRecord.findOneAndUpdate({ type, id }, { $set: { data: parsed.data } }, { new: true, runValidators: true }).lean()
    if (!record) {
      response.status(404).json({ error: 'Record not found.' })
      return
    }
    response.json({ record: { id: record.id, ...record.data } })
  } catch (error) {
    next(error)
  }
})

recordsRouter.delete('/:type/:id', async (request, response, next) => {
  try {
    if (!allowedTypes.has(request.params.type)) {
      response.status(404).json({ error: 'Record collection not found.' })
      return
    }
    const record = await HospitalRecord.findOneAndDelete({ type: request.params.type, id: request.params.id })
    if (!record) {
      response.status(404).json({ error: 'Record not found.' })
      return
    }
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})
