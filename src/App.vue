<template>
  <v-app>
    <v-app-bar v-if="auth.isAuthenticated" color="primary" density="comfortable" elevation="2">
      <template #prepend>
        <router-link to="/" class="d-flex align-center text-decoration-none ml-2">
          <div class="bg-white rounded-lg pa-1 d-flex align-center justify-center mr-3 elevation-1">
            <img
              src="/favicon.svg"
              alt="Barangay Pangabugan MCH Logo"
              width="28"
              height="28"
              style="display: block;"
            />
          </div>
        </router-link>
      </template>

      <v-app-bar-title class="font-weight-bold text-body-1">
        <router-link to="/" class="text-white text-decoration-none">
          Barangay Pangabugan MCH Tracker
        </router-link>
        <v-chip
          size="x-small"
          color="white"
          variant="tonal"
          class="ml-2 font-weight-medium d-none d-sm-inline-flex"
        >
          {{ auth.profile?.role || 'STAFF' }} • Pangabugan
        </v-chip>
      </v-app-bar-title>

      <template #append>
        <v-btn
          to="/"
          variant="text"
          size="small"
          prepend-icon="mdi-account-group-outline"
          class="mr-1 text-none"
        >
          Patients
        </v-btn>

        <v-btn
          v-if="auth.isAdmin"
          to="/triage"
          variant="text"
          size="small"
          prepend-icon="mdi-alert-circle-outline"
          class="mr-2 text-none"
        >
          High-Risk Triage
        </v-btn>

        <v-chip
          :color="isOnline ? 'success' : 'error'"
          variant="flat"
          size="small"
          class="mr-2 font-weight-bold"
        >
          <v-icon start size="14">
            {{ isOnline ? 'mdi-wifi' : 'mdi-wifi-off' }}
          </v-icon>
          {{ isOnline ? 'Online' : 'Offline' }}
        </v-chip>

        <v-btn
          size="small"
          variant="tonal"
          color="white"
          prepend-icon="mdi-cloud-sync-outline"
          class="mr-2 text-none"
          :loading="isSyncing"
          :disabled="!isOnline"
          @click="handleManualSync(true)"
        >
          Sync{{ pendingCount > 0 ? ` (${pendingCount})` : '' }}
        </v-btn>

        <v-btn
          size="small"
          variant="text"
          color="white"
          prepend-icon="mdi-logout"
          class="text-none"
          @click="handleLogout"
        >
          Logout
        </v-btn>
      </template>
    </v-app-bar>

    <v-main class="bg-background">
      <router-view />
    </v-main>

    <!-- Sync & Network Status Notification Toast -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      location="bottom right"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth'
import { processSyncQueue, pullFromCloud } from '@/services/syncService'

const router = useRouter()
const auth = useAuthStore()

const isOnline = ref(navigator.onLine)
const pendingCount = ref(0)
const isSyncing = ref(false)
let pollTimer: number | undefined

const snackbar = ref({
  show: false,
  text: '',
  color: 'success' as 'success' | 'error' | 'warning' | 'info'
})

function notify(text: string, color: 'success' | 'error' | 'warning' | 'info' = 'info') {
  snackbar.value = { show: true, text, color }
}

async function refreshPendingCount() {
  pendingCount.value = await db.sync_queue.count()
}

function updateNetworkStatus() {
  isOnline.value = navigator.onLine
  if (isOnline.value) {
    notify('Connection restored. Syncing records...', 'info')
    if (auth.isAuthenticated) {
      handleManualSync(false)
    }
  } else {
    notify('You are offline. Records will save locally.', 'warning')
  }
}

async function handleManualSync(isManualClick = false) {
  if (!navigator.onLine || isSyncing.value || !auth.isAuthenticated) return
  isSyncing.value = true
  try {
    const pushResult = await processSyncQueue()
    const pullResult = await pullFromCloud()

    if (pushResult.failedCount > 0) {
      notify(
        `Sync partial: ${pushResult.failedCount} failed (${pushResult.lastError})`,
        'error'
      )
    } else if (pullResult.error) {
      notify(`Cloud pull error: ${pullResult.error}`, 'error')
    } else if (pushResult.syncedCount > 0) {
      notify(`Synced ${pushResult.syncedCount} record(s) to cloud.`, 'success')
    } else if (isManualClick) {
      notify('All records are up to date.', 'success')
    }
  } finally {
    await refreshPendingCount()
    isSyncing.value = false
  }
}

async function handleLogout() {
  await auth.signOut()
  router.push('/login')
}

onMounted(async () => {
  window.addEventListener('online', updateNetworkStatus)
  window.addEventListener('offline', updateNetworkStatus)
  await refreshPendingCount()
  pollTimer = window.setInterval(refreshPendingCount, 2000)
})

onUnmounted(() => {
  window.removeEventListener('online', updateNetworkStatus)
  window.removeEventListener('offline', updateNetworkStatus)
  if (pollTimer) clearInterval(pollTimer)
})
</script>