<template>
  <v-container class="pa-4" style="max-width: 900px">
    <div class="d-flex flex-wrap justify-space-between align-center mb-4 ga-2">
      <div>
        <h2 class="text-h5 font-weight-bold">Barangay Pangabugan Triage & Referral</h2>
        <div class="text-caption text-medium-emphasis">
          Barangay Health Station Maternal & Child Risk Monitoring
        </div>
      </div>

      <div class="d-flex ga-2 align-center">
        <v-select
          v-model="selectedPurok"
          :items="purokOptions"
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 170px"
        />
        <v-btn color="primary" variant="tonal" @click="exportCsv">
          Export CSV
        </v-btn>
      </div>
    </div>

    <!-- Summary Metric Cards -->
    <v-row dense class="mb-5">
      <v-col cols="6" sm="3">
        <v-card class="pa-3 text-center" variant="outlined">
          <div class="text-h5 font-weight-bold">{{ filteredPatients.length }}</div>
          <div class="text-caption text-medium-emphasis">Total Patients</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-3 text-center border-error" variant="outlined">
          <div class="text-h5 font-weight-bold text-error">{{ highRiskCases.length }}</div>
          <div class="text-caption text-medium-emphasis">High-Risk Pregnancies</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-3 text-center" variant="outlined">
          <div class="text-h5 font-weight-bold text-warning">{{ midRiskCount }}</div>
          <div class="text-caption text-medium-emphasis">Mid-Risk Pregnancies</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-3 text-center" variant="outlined">
          <div class="text-h5 font-weight-bold text-teal">{{ dueVaccines.length }}</div>
          <div class="text-caption text-medium-emphasis">Scheduled Vaccines</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- High-Risk Referral Priority List -->
    <h3 class="text-h6 font-weight-bold mb-2 text-error">
      Priority Maternal Referrals (High Risk)
    </h3>
    <v-card class="mb-6" variant="outlined">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Purok / Barangay</th>
            <th>Latest BP / Vitals</th>
            <th>Visit Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in highRiskCases" :key="item.patient.id">
            <td class="font-weight-bold">{{ item.patient.full_name }}</td>
            <td>{{ item.patient.purok }}, Brgy. {{ item.patient.barangay }}</td>
            <td>
              BP: {{ item.visit.systolic_bp || '-' }}/{{ item.visit.diastolic_bp || '-' }}
              • Temp: {{ item.visit.body_temp ?? '-' }}°C
            </td>
            <td>{{ item.visit.visit_date }}</td>
            <td>
              <v-btn :to="`/patients/${item.patient.id}`" size="x-small" color="error" variant="tonal">
                Inspect
              </v-btn>
            </td>
          </tr>
          <tr v-if="highRiskCases.length === 0">
            <td colspan="5" class="text-center text-medium-emphasis py-4">
              No high-risk pregnancies flagged in this filter.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Upcoming / Due Infant Immunizations -->
    <h3 class="text-h6 font-weight-bold mb-2">
      Infant Immunization Follow-Ups
    </h3>
    <v-card variant="outlined">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Infant Name</th>
            <th>Purok</th>
            <th>Last Vaccine</th>
            <th>Next Due Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in dueVaccines" :key="item.shot.id">
            <td class="font-weight-bold">{{ item.patient.full_name }}</td>
            <td>{{ item.patient.purok }}</td>
            <td>{{ item.shot.vaccine_name }} (Dose {{ item.shot.dose_number }})</td>
            <td>
              <v-chip :color="isOverdue(item.shot.next_due_date) ? 'error' : 'info'" size="x-small">
                {{ item.shot.next_due_date }}
              </v-chip>
            </td>
            <td>
              <v-btn :to="`/patients/${item.patient.id}`" size="x-small" variant="tonal">
                Record
              </v-btn>
            </td>
          </tr>
          <tr v-if="dueVaccines.length === 0">
            <td colspan="5" class="text-center text-medium-emphasis py-4">
              No scheduled follow-up due dates logged yet.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { db, type Patient, type PrenatalVisit, type Immunization } from '@/db/dexie'

const selectedPurok = ref('All Puroks')
const patients = ref<Patient[]>([])
const visits = ref<PrenatalVisit[]>([])
const shots = ref<Immunization[]>([])

const purokOptions = computed(() => {
  const uniquePuroks = new Set(
    patients.value.map((p) => p.purok.trim()).filter(Boolean)
  )
  return ['All Puroks', ...Array.from(uniquePuroks).sort()]
})

const filteredPatients = computed(() => {
  if (selectedPurok.value === 'All Puroks') return patients.value
  return patients.value.filter((p) => p.purok.trim() === selectedPurok.value)
})

const latestVisitByPatient = computed(() => {
  const sorted = [...visits.value].sort((a, b) => a.visit_date.localeCompare(b.visit_date))
  const map: Record<string, PrenatalVisit> = {}
  for (const v of sorted) {
    map[v.patient_id] = v
  }
  return map
})

const highRiskCases = computed(() => {
  return filteredPatients.value
    .filter((p) => p.patient_type === 'PREGNANT' && latestVisitByPatient.value[p.id]?.ai_risk_level === 'High')
    .map((p) => ({ patient: p, visit: latestVisitByPatient.value[p.id] }))
})

const midRiskCount = computed(() => {
  return filteredPatients.value.filter(
    (p) => p.patient_type === 'PREGNANT' && latestVisitByPatient.value[p.id]?.ai_risk_level === 'Mid'
  ).length
})

const dueVaccines = computed(() => {
  const patientMap = new Map(filteredPatients.value.map((p) => [p.id, p]))
  return shots.value
    .filter((s) => s.next_due_date && patientMap.has(s.patient_id))
    .map((s) => ({ patient: patientMap.get(s.patient_id)!, shot: s }))
    .sort((a, b) => (a.shot.next_due_date || '').localeCompare(b.shot.next_due_date || ''))
})

function isOverdue(dueDate?: string) {
  if (!dueDate) return false
  return dueDate < new Date().toISOString().split('T')[0]
}

function exportCsv() {
  const headers = ['ID', 'Full Name', 'Type', 'Birth Date', 'Purok', 'Barangay', 'Latest AI Risk']
  const rows = filteredPatients.value.map((p) => [
    p.id,
    `"${p.full_name}"`,
    p.patient_type,
    p.birth_date,
    `"${p.purok}"`,
    `"${p.barangay}"`,
    latestVisitByPatient.value[p.id]?.ai_risk_level || 'N/A'
  ])

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pangabugan-mch-report-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  patients.value = await db.patients.toArray()
  visits.value = await db.prenatal_visits.toArray()
  shots.value = await db.immunizations.toArray()
})
</script>