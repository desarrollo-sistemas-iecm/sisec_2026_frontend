<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Bell, CheckCircle2, AlertCircle, FileEdit, X, Trash2 } from '@lucide/vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const notificaciones = ref([])
const showDropdown = ref(false)
const unreadCount = ref(0)
const dismissedIds = ref([])
const containerRef = ref(null)
let pollingInterval = null

const fetchNotificaciones = async () => {
  try {
    const { data } = await api.get('/notificaciones')
    if (data.success) {
      dismissedIds.value = JSON.parse(localStorage.getItem('sisec_dismissed_notifs') || '[]')
      const filtered = (data.data || []).filter(n => !dismissedIds.value.includes(n.id))
      notificaciones.value = filtered
      unreadCount.value = filtered.filter(n => !n.leida).length
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
  }
}

const markAsRead = async (id) => {
  try {
    await api.patch(`/notificaciones/${id}/leer`)
    const index = notificaciones.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notificaciones.value[index].leida = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  } catch (error) {
    console.error('Error marking as read:', error)
  }
}

const limpiarTodas = async () => {
  if (notificaciones.value.length === 0) return
  try {
    await api.patch('/notificaciones/leer-todas')
  } catch (error) {
    console.error('Error al marcar leídas:', error)
  }
  const allIds = notificaciones.value.map(n => n.id)
  dismissedIds.value = [...new Set([...dismissedIds.value, ...allIds])]
  localStorage.setItem('sisec_dismissed_notifs', JSON.stringify(dismissedIds.value))
  notificaciones.value = []
  unreadCount.value = 0
}

const dismissSingle = async (id) => {
  try {
    await api.patch(`/notificaciones/${id}/leer`)
  } catch (error) {
    console.error('Error al descartar:', error)
  }
  dismissedIds.value = [...new Set([...dismissedIds.value, id])]
  localStorage.setItem('sisec_dismissed_notifs', JSON.stringify(dismissedIds.value))
  notificaciones.value = notificaciones.value.filter(n => n.id !== id)
  unreadCount.value = notificaciones.value.filter(n => !n.leida).length
}

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    fetchNotificaciones()
  }
}

const closeDropdown = () => {
  showDropdown.value = false
}

const goToAll = () => {
  closeDropdown()
  router.push('/notificaciones')
}

// Cierre al hacer clic fuera o presionar Escape
const handleOutsideClick = (e) => {
  if (showDropdown.value && containerRef.value && !containerRef.value.contains(e.target)) {
    closeDropdown()
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Escape' && showDropdown.value) {
    closeDropdown()
  }
}

onMounted(() => {
  fetchNotificaciones()
  pollingInterval = setInterval(fetchNotificaciones, 30000)
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleKeydown)
})

const getIcon = (tipo) => {
  switch (tipo) {
    case 'solicitud_fecha': return AlertCircle
    case 'fecha_habilitada': return CheckCircle2
    case 'archivo_actualizado': return FileEdit
    default: return Bell
  }
}

const getColor = (tipo) => {
  switch (tipo) {
    case 'solicitud_fecha': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20'
    case 'fecha_habilitada': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
    case 'archivo_actualizado': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20'
    default: return 'text-iecm-morado dark:text-iecm-morado-400 bg-iecm-morado-50 dark:bg-iecm-morado-950/10'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    const s = String(dateString).trim()
    // Eliminar 'Z' al final para preservar la hora real de Ciudad de México si viene de SQL
    const clean = s.endsWith('Z') ? s.slice(0, -1) : s
    const date = new Date(clean.replace(' ', 'T'))
    if (isNaN(date.getTime())) return s
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  } catch (e) {
    return String(dateString)
  }
}
</script>

<template>
  <div class="relative inline-block" ref="containerRef">
    <!-- Botón de campana -->
    <button 
      @click.stop="toggleDropdown"
      class="relative p-2 text-slate-500 dark:text-slate-400 hover:text-iecm-morado transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none cursor-pointer"
      title="Notificaciones del sistema"
    >
      <Bell class="w-5 h-5" />
      <span 
        v-if="unreadCount > 0" 
        class="absolute top-0 right-0 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Overlay transparente de respaldo para clic exterior -->
    <div 
      v-if="showDropdown" 
      class="fixed inset-0 z-40 bg-black/10 dark:bg-black/30 backdrop-blur-[1px]" 
      @click.stop="closeDropdown"
    ></div>

    <!-- Dropdown con posición fija garantizada debajo de la barra superior (top: 70px) -->
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-95"
    >
      <div 
        v-if="showDropdown" 
        style="position: fixed !important; top: 70px; right: 20px; z-index: 9999;"
        class="w-80 sm:w-96 max-w-[calc(100vw-2.5rem)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-90px)] border border-purple-200/70 dark:border-purple-900/70 bg-white/95 dark:bg-[#140c24]/95 backdrop-blur-xl"
        @click.stop
      >
        <!-- Header del dropdown con botón X de cierre -->
        <div class="px-4 py-3 flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/70">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">Notificaciones</h3>
            <span class="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
              {{ unreadCount }} nuevas
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <button 
              v-if="notificaciones.length > 0"
              @click="limpiarTodas"
              type="button"
              class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Limpiar todas las notificaciones"
            >
              <Trash2 class="w-3 h-3" />
              <span>Limpiar</span>
            </button>

            <!-- Botón de Cierre X -->
            <button
              @click="closeDropdown"
              type="button"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar notificaciones"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Lista de Notificaciones -->
        <div class="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
          <div v-if="notificaciones.length === 0" class="text-center py-8 text-slate-400">
            <Bell class="w-8 h-8 mx-auto opacity-20 mb-2" />
            <p class="text-xs font-medium">No tienes notificaciones pendientes</p>
          </div>
          
          <div 
            v-for="notif in notificaciones.slice(0, 10)" 
            :key="notif.id"
            :class="['flex gap-3 p-3 rounded-xl transition-colors group cursor-pointer relative items-start', notif.leida ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-50 dark:hover:bg-purple-950/50']"
            @click="markAsRead(notif.id)"
          >
            <div :class="['w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-current/20', getColor(notif.tipo)]">
              <component :is="getIcon(notif.tipo)" class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0 pr-1">
              <p :class="['text-xs truncate', notif.leida ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-900 dark:text-white font-bold']">
                {{ notif.titulo }}
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                {{ notif.mensaje }}
              </p>
              <p class="text-[10px] text-purple-600/80 dark:text-purple-300/80 mt-1 font-semibold flex items-center gap-1">
                <span>{{ formatDate(notif.fecha_creacion || notif.fecha_envio || notif.fecha) }}</span>
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0 self-center">
              <span v-if="!notif.leida" class="w-2 h-2 rounded-full bg-[#6B2D8B]"></span>
              <button 
                @click.stop="dismissSingle(notif.id)"
                class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-all cursor-pointer"
                title="Descartar notificación"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center">
          <button 
            @click="goToAll"
            class="w-full text-center py-1.5 text-xs text-[#6B2D8B] dark:text-purple-300 hover:text-purple-900 dark:hover:text-white font-bold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            Ver todas las notificaciones
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
