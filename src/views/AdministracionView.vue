<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Users, CalendarRange, FolderOpen, FileText, Palette, MessageSquare, Send } from '@lucide/vue'
import { useAuthStore } from '../stores/authStore.js'

const route = useRoute()
const authStore = useAuthStore()

const userPermiso = computed(() => Number(authStore.user?.id_tipousuario || authStore.user?.permiso || 1))
const isSuperAdmin = computed(() => userPermiso.value === 3)

const allTabs = [
  { name: 'Gestión de Usuarios', path: '/administracion/usuarios', icon: Users, superAdminOnly: true },
  { name: 'Restricciones de Fechas', path: '/administracion/restricciones', icon: CalendarRange, superAdminOnly: false },
  { name: 'Explorador de Archivos', path: '/administracion/archivos', icon: FolderOpen, superAdminOnly: false },
  { name: 'Formatos Oficiales', path: '/administracion/formatos', icon: FileText, superAdminOnly: true },
  { name: 'Catálogo de Acciones Educativas', path: '/administracion/cursos', icon: Palette, superAdminOnly: false },
  { name: 'Mensajes Predeterminados', path: '/administracion/mensajes', icon: MessageSquare, superAdminOnly: true },
  { name: 'Bot Telegram', path: '/administracion/telegram', icon: Send, superAdminOnly: true }
]

const visibleTabs = computed(() => {
  return allTabs.filter(tab => !tab.superAdminOnly || isSuperAdmin.value)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex border-b border-slate-200 dark:border-white/10 gap-6 overflow-x-auto pb-1">
      <router-link 
        v-for="tab in visibleTabs" 
        :key="tab.path" 
        :to="tab.path"
        class="flex items-center gap-2 pb-3 border-b-2 transition-colors whitespace-nowrap text-sm font-medium"
        :class="route.path === tab.path ? 'border-iecm-morado text-iecm-morado dark:text-purple-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.name }}
      </router-link>
    </div>
    <router-view></router-view>
  </div>
</template>
