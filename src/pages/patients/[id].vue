<template>
  <v-container class="pa-4" style="max-width: 760px">
    <v-btn to="/" variant="text" color="primary" prepend-icon="mdi-arrow-left" class="mb-3 px-1 text-none">
      Back to Patient Directory
    </v-btn>

    <v-alert v-if="!patient" type="warning" variant="tonal">
      Patient record not found locally.
    </v-alert>

    <template v-else>
      <!-- Patient Header Card -->
      <v-card class="pa-5 mb-5" elevation="2">
        <div class="d-flex justify-space-between align-start flex-wrap ga-2">
          <div>
            <div class="d-flex align-center ga-2">
              <v-icon color="primary" size="26">
                {{ patient.patient_type === 'PREGNANT' ? 'mdi-mother-heart' : 'mdi-baby-face-outline' }}
              </v-icon>
              <span class="text-h5 font-weight-bold">{{ patient.full_name }}</span>
            </div>
            <div class="text-body-2 text-medium-emphasis mt-2">
              <v-chip size="x-small" color="primary" variant="flat" class="mr-2 font-weight-bold">
                {{ patient.patient_type }}
              </v-chip>
              Birth Date: {{ patient.birth_date }} • {{ patient.purok }}, Brgy. Pangabugan
            </div>
            <div v-if="patient.contact_number" class="text-caption text-medium-emphasis mt-1">
              <v-icon size="14" class="mr-1">mdi-phone-outline</v-icon>
              {{ patient.contact_number }}
            </div>
          </div>

          <v-chip :color="patient.synced === 1 ? 'success' : 'warning'" size="small" variant="tonal" class="font-weight-medium">
            {{ patient.synced === 1 ? 'Synced to Cloud' : 'Pending Sync' }}
          </v-chip>
        </div>
      </v-card>

      <!-- PRENATAL HISTORY (For PREGNANT Patients) -->
      <template v-if="patient.patient_type === 'PREGNANT'">
        <div class="text-h6 font-weight-bold text-primary mb-3">
          Prenatal Checkup History ({{ prenatalVisits.length }})
        </div>

        <v-card v-if="prenatalVisits.length === 0" class="pa-5 text-center text-medium-emphasis" variant="outlined">
          No prenatal visits recorded yet.
        </v-card>

        <v-card
          v-for="visit in prenatalVisits"
          :key="visit.id"
          class="pa-4 mb-3"
          variant="outlined"
        >
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="font-weight-bold">
              Visit Date: {{ visit.visit_date }}
              <span v-if="visit.gestational_weeks" class="text-caption text-medium-emphasis ml-2">
                (Week {{ visit.gestational_weeks }})
              </span>
            </div>
            <v-chip :color="riskColor(visit.ai_risk_level)" size="small" class="font-weight-bold">
              {{ visit.ai_risk_level || 'Low' }} Risk
            </v-chip>
          </div>

          <v-row dense class="text-body-2">
            <v-col cols="6" sm="3">
              <strong>BP:</strong> {{ visit.systolic_bp || '-' }}/{{ visit.diastolic_bp || '-' }}
            </v-col>
            <v-col cols="6" sm="3">
              <strong>Glucose:</strong> {{ visit.blood_glucose ?? '-' }} mmol/L
            </v-col>
            <v-col cols="6" sm="3">
              <strong>Temp:</strong> {{ visit.body_temp ?? '-' }} °C
            </v-col>
            <v-col cols="6" sm="3">
              <strong>HR:</strong> {{ visit.heart_rate ?? '-' }} bpm
            </v-col>
          </v-row>

          <div v-if="visit.notes" class="text-caption text-medium-emphasis mt-2 pt-2 border-t">
            <strong>Notes:</strong> {{ visit.notes }}
          </div>
        </v-card>
      </template>

      <!-- DOH EPI IMMUNIZATION CHECKLIST (For INFANT Patients) -->
      <template v-if="patient.patient_type === 'INFANT'">
        <div class="text-h6 font-weight-bold text-primary mb-3">
          DOH EPI Immunization Record ({{ immunizations.length }})
        </div>

        <v-card class="mb-4" variant="outlined">
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Vaccine</th>
                <th>Dose</th>
                <th>Date Given</th>
                <th>Next Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="shot in immunizations" :key="shot.id">
                <td class="font-weight-medium">{{ shot.vaccine_name }}</td>
                <td>Dose {{ shot.dose_number }}</td>
                <td>{{ shot.date_administered }}</td>
                <td>{{ shot.next_due_date || '—' }}</td>
                <td>
                  <v-chip :color="shot.synced === 1 ? 'success' : 'warning'" size="x-small">
                    {{ shot.synced === 1 ? 'Synced' : 'Pending' }}
                  </v-chip>
                </td>
              </tr>
              <tr v-if="immunizations.length === 0">
                <td colspan="5" class="text-center text-medium-emphasis py-4">
                  No immunizations logged yet.
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </template>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { db, type Patient, type PrenatalVisit, type Immunization } from '@/db/dexie'

const route = useRoute()
const patientId = (route.params as { id: string }).id

const patient = ref<Patient | undefined>()
const prenatalVisits = ref<PrenatalVisit[]>([])
const immunizations = ref<Immunization[]>([])

function riskColor(level?: 'Low' | 'Mid' | 'High') {
  if (level === 'High') return 'error'
  if (level === 'Mid') return 'warning'
  return 'success'
}

onMounted(async () => {
  patient.value = await db.patients.get(patientId)
  if (!patient.value) return

  if (patient.value.patient_type === 'PREGNANT') {
    const allVisits = await db.prenatal_visits.toArray()
    prenatalVisits.value = allVisits
      .filter((v) => v.patient_id === patientId)
      .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
  } else {
    const allShots = await db.immunizations.toArray()
    immunizations.value = allShots
      .filter((s) => s.patient_id === patientId)
      .sort((a, b) => b.date_administered.localeCompare(a.date_administered))
  }
})
</script>