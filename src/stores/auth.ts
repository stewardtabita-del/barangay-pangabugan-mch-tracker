import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { db } from '@/db/dexie'

export interface UserProfile {
  id: string
  full_name: string
  role: 'BHW' | 'RHU_ADMIN'
  barangay: string
}

const PROFILE_STORAGE_KEY = 'butuan_mch_cached_profile'

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserProfile | null>(loadCachedProfile())
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!profile.value)
  const isAdmin = computed(() => profile.value?.role === 'RHU_ADMIN')
  const isBhw = computed(() => profile.value?.role === 'BHW')

  function loadCachedProfile(): UserProfile | null {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as UserProfile) : null
    } catch {
      return null
    }
  }

  function saveCachedProfile(data: UserProfile | null) {
    profile.value = data
    if (data) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(PROFILE_STORAGE_KEY)
    }
  }

  async function initAuth() {
    if (initialized.value) return

    if (!navigator.onLine) {
      initialized.value = true
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        saveCachedProfile(profileData as UserProfile)
      }
    } else {
      saveCachedProfile(null)
    }

    initialized.value = true
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('Authentication failed.')

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profileData) {
      await supabase.auth.signOut()
      throw new Error('User profile not found in public.profiles.')
    }

    await db.patients.clear()
    await db.prenatal_visits.clear()
    await db.immunizations.clear()
    await db.sync_queue.clear()

    saveCachedProfile(profileData as UserProfile)
    initialized.value = true
  }

  async function signOut() {
    if (navigator.onLine) {
      await supabase.auth.signOut()
    }
    await db.patients.clear()
    await db.prenatal_visits.clear()
    await db.immunizations.clear()
    await db.sync_queue.clear()
    saveCachedProfile(null)
  }

  return {
    profile,
    initialized,
    isAuthenticated,
    isAdmin,
    isBhw,
    initAuth,
    signIn,
    signOut,
  }
})