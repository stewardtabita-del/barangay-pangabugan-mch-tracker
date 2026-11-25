<template>
  <v-container class="fill-height d-flex align-center justify-center pa-4">
    <v-card class="pa-7" width="100%" max-width="430" elevation="3">
      <div class="text-center mb-6">
        <div class="d-inline-flex align-center justify-center mb-3">
          <img
            src="/favicon.svg"
            alt="Barangay Pangabugan MCH Logo"
            width="56"
            height="56"
            style="display: block;"
          />
        </div>
        <div class="text-h5 font-weight-bold text-primary">
          Barangay Pangabugan
        </div>
        <div class="text-subtitle-1 font-weight-medium text-high-emphasis">
          Maternal & Child Health Tracker
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          Barangay Health Station &amp; Midwife Portal
        </div>
      </div>

      <v-alert
        v-if="errorMsg"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ errorMsg }}
      </v-alert>

      <v-form @submit.prevent="handleLogin">
        <v-text-field
          v-model="email"
          label="Email Address"
          type="email"
          prepend-inner-icon="mdi-email-outline"
          required
        />

        <v-text-field
          v-model="password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword"
          required
        />

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :loading="loading"
          class="mt-2 font-weight-bold text-none"
        >
          Sign In
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    await auth.signIn(email.value.trim(), password.value)
    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.message || 'Invalid login credentials.'
  } finally {
    loading.value = false
  }
}
</script>