import Dexie, { type EntityTable } from 'dexie'

export interface Patient {
  id: string
  full_name: string
  patient_type: 'PREGNANT' | 'INFANT'
  birth_date: string
  purok: string
  barangay: string
  contact_number?: string
  created_by?: string
  updated_at: string
  synced?: number // 0 = pending sync, 1 = synced
}

export interface PrenatalVisit {
  id: string
  patient_id: string
  visit_date: string
  age?: number
  systolic_bp?: number
  diastolic_bp?: number
  blood_glucose?: number
  body_temp?: number
  heart_rate?: number
  gestational_weeks?: number
  ai_risk_level?: 'Low' | 'Mid' | 'High'
  notes?: string
  updated_at: string
  synced?: number
}

export interface Immunization {
  id: string
  patient_id: string
  vaccine_name: string
  dose_number: number
  date_administered: string
  next_due_date?: string
  updated_at: string
  synced?: number
}

export interface SyncQueueItem {
  queue_id?: number
  table_name: 'patients' | 'prenatal_visits' | 'immunizations'
  operation: 'UPSERT' | 'DELETE'
  record_id: string
  payload: Record<string, any>
  created_at: string
}

const db = new Dexie('MaternalHealthDB') as Dexie & {
  patients: EntityTable<Patient, 'id'>
  prenatal_visits: EntityTable<PrenatalVisit, 'id'>
  immunizations: EntityTable<Immunization, 'id'>
  sync_queue: EntityTable<SyncQueueItem, 'queue_id'>
}

db.version(1).stores({
  patients: 'id, full_name, patient_type, barangay, purok, synced, updated_at',
  prenatal_visits: 'id, patient_id, visit_date, ai_risk_level, synced',
  immunizations: 'id, patient_id, vaccine_name, next_due_date, synced',
  sync_queue: '++queue_id, table_name, record_id, created_at'
})

export { db }       