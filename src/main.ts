import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import { initAutoSync } from '@/services/syncService'
import App from './App.vue'
import 'unfonts.css'

const app = createApp(App)

registerPlugins(app)
initAutoSync()

app.mount('#app')   