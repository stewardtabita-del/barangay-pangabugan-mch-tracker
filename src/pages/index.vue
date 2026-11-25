<template>
  <v-container class="py-6 px-4" style="max-width: 800px">
    <!-- Collapsible Patient Registration Card -->
    <v-card class="pa-6 mb-6" elevation="2">
      <div class="d-flex justify-space-between align-center">
        <div class="d-flex align-center ga-2">
          <v-icon color="primary" size="28">mdi-account-plus</v-icon>
          <span class="text-h6 font-weight-bold">Register New Patient</span>
        </div>
        <v-btn
          variant="text"
          color="primary"
          size="small"
          class="text-none font-weight-bold"
          @click="showRegForm = !showRegForm"
        >
          {{ showRegForm ? 'Hide Form' : 'Show Form' }}
        </v-btn>
      </div>

      <v-expand-transition>
        <v-form v-if="showRegForm" class="mt-4" @submit.prevent="registerPatient">
          <v-text-field
            v-model="form.full_name"
            label="Full Name"
            variant="outlined"
            density="comfortable"
            required
          />

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.patient_type"
                :items="['PREGNANT', 'INFANT']"
                label="Patient Type"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.birth_date"
                label="Birth Date"
                type="date"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="form.purok"
                label="Purok"
                placeholder="e.g. Purok 1"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12" sm="7">
              <v-text-field
                model-value="Pangabugan"
                label="Barangay"
                variant="outlined"
                density="comfortable"
                readonly
                disabled
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model="form.contact_number"
            label="Contact Number (Optional)"
            variant="outlined"
            density="comfortable"
          />

          <v-btn type="submit" color="primary" block size="large" class="mt-2 text-none font-weight-bold" elevation="1">
            Save Patient Record
          </v-btn>
        </v-form>
      </v-expand-transition>
    </v-card>

    <!-- Search & Filter Bar -->
    <div class="d-flex justify-space-between align-center mb-3">
      <h3 class="text-h6 font-weight-bold text-primary">
        Pangabugan Patient Directory ({{ filteredPatients.length }})
      </h3>
    </div>

    <v-row dense class="mb-4">
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="searchQuery"
          label="Search name or purok..."
          density="comfortable"
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="6" sm="3">
        <v-select
          v-model="typeFilter"
          :items="['ALL', 'PREGNANT', 'INFANT']"
          label="Type"
          density="comfortable"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="6" sm="3">
        <v-select
          v-model="riskFilter"
          :items="['ALL', 'High', 'Mid', 'Low']"
          label="Risk"
          density="comfortable"
          variant="outlined"
          hide-details
        />
      </v-col>
    </v-row>

    <!-- Filtered Patients List -->
    <v-card
      v-for="patient in filteredPatients"
      :key="patient.id"
      class="pa-4 mb-4"
      variant="outlined"
      elevation="1"
    >
      <div class="d-flex justify-space-between align-start flex-wrap ga-2">
        <div>
          <router-link
            :to="`/patients/${patient.id}`"
            class="font-weight-bold text-h6 text-primary text-decoration-none"
          >
            {{ patient.full_name }}
          </router-link>
          <div class="text-body-2 text-medium-emphasis mt-1">
            <v-chip size="x-small" color="primary" variant="flat" class="mr-1 font-weight-bold">
              {{ patient.patient_type }}
            </v-chip>
            {{ patient.purok }}, Brgy. {{ patient.barangay }}
          </div>
        </div>

        <div class="d-flex align-center ga-2">
          <v-btn
            :to="`/patients/${patient.id}`"
            size="small"
            variant="tonal"
            color="primary"
            class="text-none font-weight-medium"
            prepend-icon="mdi-clipboard-text-outline"
          >
            History
          </v-btn>
          <v-chip
            :color="patient.synced === 1 ? 'success' : 'warning'"
            size="small"
            variant="tonal"
            class="font-weight-medium"
          >
            {{ patient.synced === 1 ? 'Synced' : 'Pending' }}
          </v-chip>
        </div>
      </div>

      <!-- Prenatal Action & AI Risk Status for PREGNANT Patients -->
      <div
        v-if="patient.patient_type === 'PREGNANT'"
        class="mt-4 pt-3 border-t d-flex justify-space-between align-center flex-wrap ga-2"
      >
        <div class="d-flex align-center ga-2">
          <span class="text-body-2 text-medium-emphasis">AI Risk:</span>
          <v-chip
            v-if="latestRiskByPatient[patient.id]"
            :color="riskColor(latestRiskByPatient[patient.id])"
            size="small"
            class="font-weight-bold px-3"
          >
            {{ latestRiskByPatient[patient.id] }} Risk
          </v-chip>
          <span v-else class="text-body-2 text-disabled">No checkup yet</span>
        </div>

        <v-btn
          size="large"
          color="secondary"
          variant="tonal"
          class="text-none font-weight-bold px-4"
          prepend-icon="mdi-plus-circle-outline"
          @click="openCheckupDialog(patient)"
        >
          Prenatal Checkup
        </v-btn>
      </div>

      <!-- Immunization Action & Status for INFANT Patients -->
      <div
        v-if="patient.patient_type === 'INFANT'"
        class="mt-4 pt-3 border-t d-flex justify-space-between align-center flex-wrap ga-2"
      >
        <div class="d-flex align-center ga-2">
          <span class="text-body-2 text-medium-emphasis">Last Vaccine:</span>
          <v-chip
            v-if="immunizationSummaryByPatient[patient.id]"
            color="info"
            size="small"
            variant="tonal"
            class="font-weight-medium"
          >
            {{ immunizationSummaryByPatient[patient.id] }}
          </v-chip>
          <span v-else class="text-body-2 text-disabled">No doses logged</span>
        </div>

        <v-btn
          size="large"
          color="primary"
          variant="tonal"
          class="text-none font-weight-bold px-4"
          prepend-icon="mdi-needle"
          @click="openVaccineDialog(patient)"
        >
          Immunization
        </v-btn>
      </div>
    </v-card>

    <v-card v-if="filteredPatients.length === 0" class="pa-8 text-center text-medium-emphasis" variant="outlined">
      <div class="text-h6">No patient records found.</div>
    </v-card>

    <!-- Prenatal Checkup & AI Risk Assessment Dialog -->
    <v-dialog v-model="checkupDialog" max-width="560">
      <v-card v-if="selectedPatient" class="pa-6">
        <v-card-title class="px-0 text-h6 font-weight-bold mb-2">
          Prenatal Checkup: {{ selectedPatient.full_name }}
        </v-card-title>

        <v-form @submit.prevent="saveCheckup">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="vitalsForm.gestational_weeks"
                label="Gestational Weeks"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="vitalsForm.age"
                label="Age (yrs)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="vitalsForm.systolic_bp"
                label="Systolic BP (mmHg)"
                placeholder="120"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="vitalsForm.diastolic_bp"
                label="Diastolic BP (mmHg)"
                placeholder="80"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="vitalsForm.blood_glucose"
                label="Glucose (mmol/L)"
                placeholder="5.5"
                step="0.1"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="vitalsForm.body_temp"
                label="Temp (°C)"
                placeholder="36.8"
                step="0.1"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="vitalsForm.heart_rate"
                label="Heart Rate (bpm)"
                placeholder="82"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-alert
            :color="riskColor(liveRisk.level)"
            variant="tonal"
            class="my-3"
            density="comfortable"
          >
            <div class="font-weight-bold text-body-1">
              AI Assessment: {{ liveRisk.level }} Risk
            </div>
            <ul class="pl-4 mt-1 text-body-2">
              <li v-for="(reason, idx) in liveRisk.reasons" :key="idx">
                {{ reason }}
              </li>
            </ul>
          </v-alert>

          <v-textarea
            v-model="vitalsForm.notes"
            label="BHW Notes / Referral Remarks"
            rows="3"
            variant="outlined"
            density="comfortable"
          />

          <div class="d-flex justify-end ga-3 mt-4">
            <v-btn variant="text" size="large" @click="checkupDialog = false">Cancel</v-btn>
            <v-btn type="submit" color="primary" size="large" class="text-none font-weight-bold">Save Checkup</v-btn>
          </div>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Infant Immunization Dialog -->
    <v-dialog v-model="vaccineDialog" max-width="500">
      <v-card v-if="selectedPatient" class="pa-6">
        <v-card-title class="px-0 text-h6 font-weight-bold mb-2">
          Log Immunization: {{ selectedPatient.full_name }}
        </v-card-title>

        <v-form @submit.prevent="saveImmunization">
          <v-select
            v-model="vaccineForm.vaccine_name"
            :items="dohVaccines"
            label="DOH EPI Vaccine"
            variant="outlined"
            density="comfortable"
            required
          />

          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="vaccineForm.dose_number"
                label="Dose #"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="vaccineForm.date_administered"
                label="Date Given"
                type="date"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model="vaccineForm.next_due_date"
            label="Next Due Date (Optional)"
            type="date"
            variant="outlined"
            density="comfortable"
            class="mt-1"
          />

          <div class="d-flex justify-end ga-3 mt-4">
            <v-btn variant="text" size="large" @click="vaccineDialog = false">Cancel</v-btn>
            <v-btn type="submit" color="primary" size="large" class="text-none font-weight-bold">Save Vaccine</v-btn>
          </div>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { db, type Patient } from '@/db/dexie'
import { saveOfflineRecord, pullFromCloud } from '@/services/syncService'
import { assessMaternalRisk } from '@/services/riskAssessmentService'

const BARANGAY_NAME = 'Pangabugan'

const dohVaccines = [
  'BCG',
  'Hepatitis B',
  'Pentavalent (DPT-HepB-Hib)',
  'OPV (Oral Polio)',
  'IPV (Inactivated Polio)',
  'PCV (Pneumococcal)',
  'MMR (Measles-Mumps-Rubella)'
]

const showRegForm = ref(true)
const searchQuery = ref('')
const typeFilter = ref('ALL')
const riskFilter = ref('ALL')

const patients = ref<Patient[]>([])
const latestRiskByPatient = ref<Record<string, 'Low' | 'Mid' | 'High'>>({})
const immunizationSummaryByPatient = ref<Record<string, string>>({})

const filteredPatients = computed(() => {
  return patients.value.filter((p) => {
    const q = (searchQuery.value || '').toLowerCase()
    const matchesSearch =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.purok.toLowerCase().includes(q)

    const matchesType = typeFilter.value === 'ALL' || p.patient_type === typeFilter.value
    const matchesRisk =
      riskFilter.value === 'ALL' || latestRiskByPatient.value[p.id] === riskFilter.value

    return matchesSearch && matchesType && matchesRisk
  })
})

const form = ref({
  full_name: '',
  patient_type: 'PREGNANT' as 'PREGNANT' | 'INFANT',
  birth_date: '',
  purok: '',
  barangay: BARANGAY_NAME,
  contact_number: ''
})

// Checkup Modal State
const checkupDialog = ref(false)
const selectedPatient = ref<Patient | null>(null)
const vitalsForm = ref({
  age: undefined as number | undefined,
  gestational_weeks: undefined as number | undefined,
  systolic_bp: undefined as number | undefined,
  diastolic_bp: undefined as number | undefined,
  blood_glucose: undefined as number | undefined,
  body_temp: undefined as number | undefined,
  heart_rate: undefined as number | undefined,
  notes: ''
})

// Immunization Modal State
const vaccineDialog = ref(false)
const vaccineForm = ref({
  vaccine_name: 'BCG',
  dose_number: 1,
  date_administered: new Date().toISOString().split('T')[0],
  next_due_date: ''
})

const liveRisk = computed(() => assessMaternalRisk(vitalsForm.value))

function riskColor(level?: 'Low' | 'Mid' | 'High') {
  if (level === 'High') return 'error'
  if (level === 'Mid') return 'warning'
  return 'success'
}

function calculateAge(birthDate: string): number | undefined {
  if (!birthDate) return undefined
  const diff = Date.now() - new Date(birthDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function openCheckupDialog(patient: Patient) {
  selectedPatient.value = patient
  vitalsForm.value = {
    age: calculateAge(patient.birth_date),
    gestational_weeks: undefined,
    systolic_bp: undefined,
    diastolic_bp: undefined,
    blood_glucose: undefined,
    body_temp: undefined,
    heart_rate: undefined,
    notes: ''
  }
  checkupDialog.value = true
}

function openVaccineDialog(patient: Patient) {
  selectedPatient.value = patient
  vaccineForm.value = {
    vaccine_name: 'BCG',
    dose_number: 1,
    date_administered: new Date().toISOString().split('T')[0],
    next_due_date: ''
  }
  vaccineDialog.value = true
}

async function loadAllData() {
  patients.value = await db.patients.toArray()

  const visits = await db.prenatal_visits.orderBy('visit_date').toArray()
  const riskMap: Record<string, 'Low' | 'Mid' | 'High'> = {}
  for (const v of visits) {
    if (v.ai_risk_level) {
      riskMap[v.patient_id] = v.ai_risk_level
    }
  }
  latestRiskByPatient.value = riskMap

  const shots = await db.immunizations.toArray()
  const vaxMap: Record<string, string> = {}
  for (const s of shots) {
    vaxMap[s.patient_id] = `${s.vaccine_name} (Dose ${s.dose_number})`
  }
  immunizationSummaryByPatient.value = vaxMap
}

async function registerPatient() {
  if (!form.value.full_name || !form.value.birth_date) return

  await saveOfflineRecord('patients', {
    id: crypto.randomUUID(),
    full_name: form.value.full_name,
    patient_type: form.value.patient_type,
    birth_date: form.value.birth_date,
    purok: form.value.purok,
    barangay: BARANGAY_NAME,
    contact_number: form.value.contact_number || undefined,
    updated_at: new Date().toISOString()
  })

  form.value.full_name = ''
  form.value.birth_date = ''
  form.value.purok = ''
  form.value.contact_number = ''

  await loadAllData()
}

async function saveCheckup() {
  if (!selectedPatient.value) return

  await saveOfflineRecord('prenatal_visits', {
    id: crypto.randomUUID(),
    patient_id: selectedPatient.value.id,
    visit_date: new Date().toISOString().split('T')[0],
    age: vitalsForm.value.age,
    gestational_weeks: vitalsForm.value.gestational_weeks,
    systolic_bp: vitalsForm.value.systolic_bp,
    diastolic_bp: vitalsForm.value.diastolic_bp,
    blood_glucose: vitalsForm.value.blood_glucose,
    body_temp: vitalsForm.value.body_temp,
    heart_rate: vitalsForm.value.heart_rate,
    ai_risk_level: liveRisk.value.level,
    notes: vitalsForm.value.notes || undefined,
    updated_at: new Date().toISOString()
  })

  checkupDialog.value = false
  await loadAllData()
}

async function saveImmunization() {
  if (!selectedPatient.value) return

  await saveOfflineRecord('immunizations', {
    id: crypto.randomUUID(),
    patient_id: selectedPatient.value.id,
    vaccine_name: vaccineForm.value.vaccine_name,
    dose_number: vaccineForm.value.dose_number,
    date_administered: vaccineForm.value.date_administered,
    next_due_date: vaccineForm.value.next_due_date || undefined,
    updated_at: new Date().toISOString()
  })

  vaccineDialog.value = false
  await loadAllData()
}

onMounted(async () => {
  await loadAllData()
  await pullFromCloud()
  await loadAllData()
})
</script>