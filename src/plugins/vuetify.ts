/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com
 */

// Composables
import { createVuetify } from 'vuetify'
// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
  theme: {
    defaultTheme: 'pangabuganLight',
    themes: {
      pangabuganLight: {
        dark: false,
        colors: {
          primary: '#0F766E',      // Clinical Teal (matches favicon.svg)
          secondary: '#0D9488',    // Brighter Teal accent
          accent: '#14B8A6',
          background: '#F4F7F6',   // Soft clinical off-white
          surface: '#FFFFFF',
          info: '#0284C7',
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
        },
      },
    },
  },
  defaults: {
    VCard: {
      rounded: 'lg',
      elevation: 1,
    },
    VBtn: {
      rounded: 'lg',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },
  },
})