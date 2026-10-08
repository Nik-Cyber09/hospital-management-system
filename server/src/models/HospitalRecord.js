import mongoose from 'mongoose'

const hospitalRecordSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['patients', 'doctors', 'appointments', 'invoices'], required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, versionKey: false })

hospitalRecordSchema.index({ type: 1, id: 1 }, { unique: true })

export const HospitalRecord = mongoose.model('HospitalRecord', hospitalRecordSchema)
