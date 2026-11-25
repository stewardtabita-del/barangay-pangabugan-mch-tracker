/**
 * router/index.ts
 *
 * Manual routes and Role-Based Access Control guards
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Index from '@/pages/index.vue'
import Login from '@/pages/login.vue'
import Triage from '@/pages/triage.vue'
import PatientProfile from '@/pages/patients/[id].vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      component: Login,
      meta: { public: true },
    },
    {
      path: '/',
      component: Index,
    },
    {
      path: '/triage',
      component: Triage,
      meta: { requiresAdmin: true },
    },
    {
      path: '/patients/:id',
      component: PatientProfile,
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initAuth()

  if (!to.meta.public && !auth.isAuthenticated) {
    return '/login'
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    return '/'
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return '/'
  }
})

export default router