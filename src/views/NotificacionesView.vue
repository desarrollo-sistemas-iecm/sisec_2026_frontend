<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  Bell, CheckCircle2, AlertCircle, FileEdit, CalendarRange,
  UploadCloud, Trash2, Send, MessageSquarePlus, ShieldCheck,
  Clock, Sparkles, Building, Check, X, RefreshCw
} from '@lucide/vue'
import api from '../services/api.js'
import Swal from 'sweetalert2'
import { useAuthStore } from '../stores/authStore.js'
import { useToast } from '../composables/useToast.js'
import { getSocket } from '../services/socket.js'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/AppModal.vue'
import AppSelect from '../components/ui/AppSelect.vue'

const authStore = useAuthStore()
const toast = useToast()

const userPermiso = computed(() => Number(authStore.user?.permiso || authStore.user?.idpermiso || 1))
const isDistrital = computed(() => userPermiso.value === 1)
const isAdmin = computed(() => userPermiso.value === 2)
const isSuperAdmin = computed(() => userPermiso.value === 3)

const notificaciones = ref([])
const loading = ref(true)

// Modal Nuevo Mensaje Institucional (Con Mensajes Predeterminados + 100 caracteres)
const modalNuevoMensajeOpen = ref(false)
const loadingCatalog = ref(false)
const catalogMensajes = ref([])
const idMensajeSeleccionado = ref('')
const comentarioAdicional = ref('')
const idAccionLigada = ref('')
const sendingMensaje = ref(false)

const mensajeObj = computed(() => {
  return catalogMensajes.value.find(m => String(m.id_mensaje_predeterminado) === String(idMensajeSeleccionado.value))
})

const fetchNotificaciones = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/notificaciones-2027/bandeja')
    notificaciones.value = data?.data ?? []
  } catch (error) {
    // Fallback hacia endpoint histórico si no existe la tabla
    try {
      const { data } = await api.get('/notificaciones')
      notificaciones.value = (data?.data ?? []).map(n => ({
        id_mensaje: n.id,
        titulo: n.titulo,
        mensaje_base: n.mensaje,
        comentario_adicional: '',
        estado_solicitud: 'ATENDIDA',
        leido: n.leida,
        fecha_envio: n.fecha_creacion,
        usuario_origen: 'Sistema',
        id_distrito_origen: n.idsede_origen
      }))
    } catch (e) {
      console.error('Error fetching notifications:', e)
    }
  } finally {
    loading.value = false
  }
}

const cargarCatalogoMensajes = async () => {
  loadingCatalog.value = true
  try {
    const flujo = isDistrital.value ? 'DISTRITO_A_ADMIN' : 'ADMIN_A_SUPERADMIN'
    const { data } = await api.get('/notificaciones-2027/mensajes-predeterminados', {
      params: { tipo_flujo: flujo }
    })
    catalogMensajes.value = data?.data ?? []
    if (catalogMensajes.value.length > 0) {
      idMensajeSeleccionado.value = catalogMensajes.value[0].id_mensaje_predeterminado
    }
  } catch (error) {
    toast.error('No se pudo cargar el catálogo de mensajes predeterminados.')
  } finally {
    loadingCatalog.value = false
  }
}

const abrirModalNuevoMensaje = () => {
  comentarioAdicional.value = ''
  idAccionLigada.value = ''
  cargarCatalogoMensajes()
  modalNuevoMensajeOpen.value = true
}

const enviarMensaje = async () => {
  if (!idMensajeSeleccionado.value) {
    toast.warning('Selecciona un mensaje predeterminado.')
    return
  }

  const selected = mensajeObj.value
  if (!selected) return

  sendingMensaje.value = true
  try {
    const payload = {
      id_mensaje_predeterminado: selected.id_mensaje_predeterminado,
      id_acciones_educativas: idAccionLigada.value ? Number(idAccionLigada.value) : null,
      id_tipousuario_destino: isDistrital.value ? 2 : 3,
      titulo: selected.titulo,
      mensaje_base: selected.cuerpo_mensaje,
      comentario_adicional: comentarioAdicional.value.trim().slice(0, 100)
    }

    const { data } = await api.post('/notificaciones-2027/enviar', payload)
    if (data.success) {
      toast.success('Mensaje institucional enviado correctamente.')
      modalNuevoMensajeOpen.value = false
      fetchNotificaciones()
    }
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error al enviar el mensaje institucional.')
  } finally {
    sendingMensaje.value = false
  }
}

// Acción de Administrador: Atender solicitud
const atenderSolicitud = async (notif, resolucion) => {
  const { value: respuesta } = await Swal.fire({
    title: resolucion === 'ATENDIDA' ? 'Aprobar Solicitud' : 'Rechazar Solicitud',
    text: `Indica una nota de respuesta para el Distrito ${notif.id_distrito_origen || ''}:`,
    input: 'text',
    inputPlaceholder: 'Ej. Se autoriza captura extemporánea por 48 hrs.',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: resolucion === 'ATENDIDA' ? '#10b981' : '#ef4444'
  })

  if (respuesta !== undefined) {
    try {
      await api.put(`/notificaciones-2027/${notif.id_mensaje}/atender`, {
        estado_solicitud: resolucion,
        respuesta_admin: respuesta
      })
      toast.success(`Solicitud marcada como ${resolucion}.`)
      fetchNotificaciones()
    } catch (error) {
      toast.error('No se pudo actualizar la solicitud.')
    }
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    const s = String(dateString).trim()
    const clean = s.endsWith('Z') ? s.slice(0, -1) : s
    const date = new Date(clean.replace(' ', 'T'))
    if (isNaN(date.getTime())) return s
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  } catch (e) {
    return String(dateString)
  }
}

// Sockets
let socket = null
onMounted(() => {
  fetchNotificaciones()
  try {
    socket = getSocket()
    socket.on('notificacion:nueva', (data) => {
      toast.info(`Nueva notificación: ${data.titulo}`)
      fetchNotificaciones()
    })
    socket.on('notificacion:atendida', () => {
      fetchNotificaciones()
    })
  } catch (err) {
    console.warn('[SOCKET] No se pudo inicializar escucha en notificaciones:', err)
  }
})

onUnmounted(() => {
  if (socket) {
    socket.off('notificacion:nueva')
    socket.off('notificacion:atendida')
  }
})
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <header class="flex flex-wrap items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#403166] to-[#6B2D8B] text-white rounded-2xl shadow-sm">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-white/15 rounded-xl border border-white/20">
          <Bell class="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Bandeja de Comunicaciones y Notificaciones 2027</h1>
          <p class="text-purple-200 text-sm mt-1 max-w-xl">
            Centro de mensajería institucional estructurada entre Cuentas Distritales y la Administración Central.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <AppButton
          variant="primary"
          class="bg-white text-purple-950 hover:bg-purple-50 font-bold"
          @click="abrirModalNuevoMensaje"
        >
          <template #icon><MessageSquarePlus class="w-4 h-4 text-purple-700" /></template>
          Nuevo Mensaje
        </AppButton>
      </div>
    </header>

    <!-- Lista de Notificaciones -->
    <AppCard>
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado"></div>
      </div>

      <div v-else-if="notificaciones.length === 0" class="flex flex-col justify-center items-center py-20 text-slate-400">
        <Bell class="w-16 h-16 mb-3 opacity-20" />
        <p class="text-base font-semibold">Bandeja sin notificaciones pendientes</p>
        <p class="text-xs text-slate-500 mt-1">Todos los avisos institucionales y solicitudes se encuentran al día.</p>
      </div>

      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div
          v-for="notif in notificaciones"
          :key="notif.id_mensaje"
          class="p-5 flex flex-col sm:flex-row gap-4 transition-colors"
          :class="notif.leido ? 'bg-white dark:bg-slate-800/40' : 'bg-purple-50/30 dark:bg-purple-950/20'"
        >
          <!-- Ícono de estado -->
          <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <MessageSquarePlus class="w-5 h-5" />
          </div>

          <!-- Contenido del Mensaje -->
          <div class="flex-1 space-y-1.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {{ notif.titulo }}
                </h3>
                <span
                  v-if="notif.id_distrito_origen"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                >
                  Distrito {{ notif.id_distrito_origen }}
                </span>
                <span
                  v-if="notif.folio_accion_educativa"
                  class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-300"
                >
                  {{ notif.folio_accion_educativa }}
                </span>
              </div>
              <span class="text-xs text-slate-400">{{ formatDate(notif.fecha_envio) }}</span>
            </div>

            <!-- Cuerpo institucional predeterminado -->
            <p class="text-xs text-slate-700 dark:text-slate-300">
              {{ notif.mensaje_base }}
            </p>

            <!-- Comentario adicional específico (hasta 100 caracteres) -->
            <div v-if="notif.comentario_adicional" class="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <span class="font-bold text-purple-900 dark:text-purple-300">Nota del usuario:</span>
              <p class="text-slate-600 dark:text-slate-400 italic mt-0.5">"{{ notif.comentario_adicional }}"</p>
            </div>

            <!-- Respuesta de Administrador si ya fue atendida -->
            <div v-if="notif.respuesta_admin" class="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
              <strong>Resolución Administrativa:</strong> {{ notif.respuesta_admin }}
            </div>

            <!-- Botones de Acción para Administrador si está pendiente -->
            <div v-if="isAdmin && notif.estado_solicitud === 'PENDIENTE'" class="flex items-center gap-2 pt-2">
              <AppButton
                variant="primary"
                size="sm"
                class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                @click="atenderSolicitud(notif, 'ATENDIDA')"
              >
                <template #icon><Check class="w-3.5 h-3.5" /></template>
                Autorizar / Atender
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                class="text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs"
                @click="atenderSolicitud(notif, 'RECHAZADA')"
              >
                <template #icon><X class="w-3.5 h-3.5" /></template>
                Rechazar
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Modal Nuevo Mensaje Institucional -->
    <AppModal
      :open="modalNuevoMensajeOpen"
      title="Redactar Mensaje Institucional"
      maxWidth="max-w-lg"
      @close="modalNuevoMensajeOpen = false"
    >
      <div class="space-y-4 text-slate-700 dark:text-slate-300">
        <!-- Selector de Mensajes Predeterminados -->
        <div>
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
            Plantilla de Mensaje Predeterminado
          </label>
          <div v-if="loadingCatalog" class="text-xs text-purple-600 py-2">
            Cargando catálogo oficial...
          </div>
          <select
            v-else
            v-model="idMensajeSeleccionado"
            class="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800"
          >
            <option v-for="m in catalogMensajes" :key="m.id_mensaje_predeterminado" :value="m.id_mensaje_predeterminado">
              [{{ m.categoria }}] {{ m.titulo }}
            </option>
          </select>
        </div>

        <!-- Vista previa del mensaje predeterminado seleccionado -->
        <div v-if="mensajeObj" class="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 text-xs">
          <p class="font-bold text-purple-950 dark:text-purple-200 mb-1">{{ mensajeObj.titulo }}</p>
          <p class="text-purple-800 dark:text-purple-300">{{ mensajeObj.cuerpo_mensaje }}</p>
        </div>

        <!-- Input para ID / Folio de Acción si aplica -->
        <div v-if="mensajeObj?.requiere_id_accion">
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
            ID de la Acción Educativa Involucrada
          </label>
          <input
            v-model="idAccionLigada"
            type="number"
            placeholder="Ej. 101"
            class="w-full border rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800"
          />
        </div>

        <!-- Input de hasta 100 caracteres adicionales -->
        <div v-if="mensajeObj?.permite_comentario_adicional">
          <div class="flex justify-between items-center mb-1">
            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              Observación Específica (Tope 100 caracteres)
            </label>
            <span class="text-[11px] font-mono" :class="comentarioAdicional.length > 90 ? 'text-amber-600 font-bold' : 'text-slate-400'">
              {{ comentarioAdicional.length }}/100
            </span>
          </div>
          <input
            v-model="comentarioAdicional"
            type="text"
            maxlength="100"
            placeholder="Detalla brevemente la situación institucional..."
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <AppButton variant="secondary" @click="modalNuevoMensajeOpen = false">
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            class="bg-[#6B2D8B] text-white hover:bg-[#582472]"
            :loading="sendingMensaje"
            @click="enviarMensaje"
          >
            <template #icon><Send class="w-4 h-4" /></template>
            Enviar Mensaje
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
