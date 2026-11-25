<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import Swal from 'sweetalert2'
import {
  CalendarRange, Search, ChevronUp, ChevronDown, CheckCircle,
  XCircle, CalendarClock, Lock, AlertCircle, CalendarDays,
  FileText, ClipboardList, ShieldCheck, Eye, BellRing, Send,
  Sparkles, Filter, RefreshCw, MapPin, Layers, Clock, RotateCcw,
  ChevronRight
} from '@lucide/vue'
import api from '../services/api.js'
import { useAuthStore } from '../stores/authStore.js'
import { useToast } from '../composables/useToast.js'
import { useGsapAnimations } from '../composables/useGsapAnimations.js'
import { useDateRestrictions } from '../composables/useDateRestrictions.js'
import { getSocket } from '../services/socket.js'

import AppModal from '../components/AppModal.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppTable from '../components/ui/AppTable.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import AppButton from '../components/ui/AppButton.vue'

import ModalCaptura2027 from '../components/modals/ModalCaptura2027.vue'
import ModalEncuesta2027 from '../components/modals/ModalEncuesta2027.vue'
import ModalSolicitarLiberacion from '../components/modals/ModalSolicitarLiberacion.vue'

const authStore = useAuthStore()
const toast = useToast()
const { animarVista, animarFilasTabla } = useGsapAnimations()
const { loadRestrictions, getCoveringException } = useDateRestrictions()

const isDistrital = computed(() => Number(authStore.user?.id_tipousuario || authStore.user?.permiso) === 1)
const isAdmin = computed(() => Number(authStore.user?.id_tipousuario || authStore.user?.permiso) === 2)
const isSuperAdmin = computed(() => Number(authStore.user?.id_tipousuario || authStore.user?.permiso) === 3)

// Estado de filas
const rows = ref([])
const loading = ref(false)
const vistaRef = ref(null)

// Filtros
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const statusFilter = ref('')
const selectedDistrito = ref('')

// Paginación y Ordenamiento (Por defecto: Sin capturar primero, después capturadas)
const getEstadoPriority = (id_estado) => {
  const est = Number(id_estado)
  if (est === 1) return 1 // Sin capturar
  if (est === 2) return 2 // Capturada
  if (est === 3) return 3 // Finalizada
  if (est === 4) return 4 // Cancelada
  return 99
}

const sortKey = ref('estado_prioridad')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

// Modales
const capturaModalOpen = ref(false)
const capturaReadOnly = ref(false)
const encuestaModalOpen = ref(false)
const liberacionModalOpen = ref(false)
const motivoModalOpen = ref(false)
const activeRow = ref(null)
const selectedMotivoRow = ref(null)

const openVerMotivo = (row) => {
  selectedMotivoRow.value = row
  motivoModalOpen.value = true
}

// Cargar acciones desde API 2027
const loadAcciones = async () => {
  loading.value = true
  try {
    let endpoint = '/programacion-2027/distrito'
    let params = {}

    // Si es Administrador o Superadministrador, consulta todas las acciones
    if (isAdmin.value || isSuperAdmin.value) {
      endpoint = '/programacion-2027/admin/acciones'
      if (selectedDistrito.value) {
        params.id_distrito = selectedDistrito.value
      }
    }

    const { data } = await api.get(endpoint, { params })
    rows.value = data?.data ?? []

    nextTick(() => {
      animarFilasTabla('.tr-row')
    })
  } catch (error) {
    toast.error('No se pudieron cargar las acciones educativas. Intenta nuevamente.')
  } finally {
    loading.value = false
  }
}

// Estadísticas rápidas para los badges del encabezado
const stats = computed(() => {
  const total = rows.value.length
  const sinCapturar = rows.value.filter(r => Number(r.id_estado) === 1).length
  const capturadas = rows.value.filter(r => Number(r.id_estado) === 2).length
  const finalizadas = rows.value.filter(r => Number(r.id_estado) === 3).length
  const canceladas = rows.value.filter(r => Number(r.id_estado) === 4).length
  return { total, sinCapturar, capturadas, finalizadas, canceladas }
})

const tasaAvance = computed(() => {
  const tot = stats.value.total
  if (!tot) return 0
  return Math.round(((stats.value.capturadas + stats.value.finalizadas) / tot) * 100)
})

const getStatusPercent = (count) => {
  if (!stats.value.total) return 0
  return Math.round((count / stats.value.total) * 100)
}

const filterByStatus = (status) => {
  if (statusFilter.value === String(status)) {
    statusFilter.value = ''
  } else {
    statusFilter.value = String(status)
  }
}

const hasActiveFilters = computed(() => {
  return !!(search.value || dateFrom.value || dateTo.value || statusFilter.value || selectedDistrito.value)
})

const clearFilters = () => {
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  statusFilter.value = ''
  selectedDistrito.value = ''
  page.value = 1
}

// Filtros reactivos
const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  const from = dateFrom.value
  const to = dateTo.value
  const status = statusFilter.value

  return rows.value.filter((row) => {
    const fecha = String(row.fecha_programada || '').split('T')[0]
    if (from && fecha < from) return false
    if (to && fecha > to) return false

    if (status && String(row.id_estado) !== String(status)) return false

    if (!term) return true
    const haystack = `${row.folio_accion_educativa || ''} ${row.clave_accion || ''} ${row.nombre_accion || ''} ${row.nombre_institucion || ''} ${row.calle_numero || ''} ${row.demarcacion || ''} ${row.nombre_contacto || ''}`.toLowerCase()
    return haystack.includes(term)
  })
})

const sortedRows = computed(() => {
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1

  return [...filteredRows.value].sort((a, b) => {
    if (key === 'estado_prioridad') {
      const pA = getEstadoPriority(a.id_estado)
      const pB = getEstadoPriority(b.id_estado)
      if (pA !== pB) {
        return (pA - pB) * dir
      }
      // Dentro del mismo estado, ordenar por fecha más reciente primero
      const fechaA = String(a.fecha_programada || '')
      const fechaB = String(b.fecha_programada || '')
      return fechaB.localeCompare(fechaA)
    }

    const valA = a[key] ?? ''
    const valB = b[key] ?? ''
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * dir
    }
    const left = String(valA).toLowerCase()
    const right = String(valB).toLowerCase()
    if (left !== right) {
      return (left < right ? -1 : 1) * dir
    }
    return 0
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedRows.value.slice(start, start + pageSize.value)
})

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  nextTick(() => animarFilasTabla('.tr-row'))
}

// Helpers de visualización de Estados
const getEstadoBadgeClass = (id_estado) => {
  switch (Number(id_estado)) {
    case 1:
      return 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
    case 2:
      return 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700'
    case 3:
      return 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
    case 4:
      return 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300'
  }
}

// Helpers de Folio y Tiempo de Captura
const hasFolio = (row) => {
  if (!row?.folio_accion_educativa) return false
  const f = String(row.folio_accion_educativa).trim()
  return f.length > 0 && !f.toLowerCase().includes('sin folio')
}

const isTiempoVencido = (row) => {
  if (!row) return false
  if (row.tiempo_vencido !== undefined && row.tiempo_vencido !== null) {
    return Boolean(row.tiempo_vencido)
  }
  const dateStr = String(row.fecha_programada || '').split('T')[0]
  if (!dateStr) return false

  // 1. Si cuenta con excepción activa concedida por el Administrador para esta fecha y sede, está habilitado
  if (getCoveringException) {
    const excepcion = getCoveringException(dateStr, 'captura', row.id_distrito)
    if (excepcion) return false
  }

  // 2. Extraer año y mes de la actividad programada
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m) return false

  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1

  // 3. Si pertenece a un mes o año anterior al mes en curso: tiempo vencido (mes cerrado)
  if (y < curY || (y === curY && m < curM)) {
    return true
  }

  return false
}

// Acciones de Distrital
const openCaptura = (row, readOnly = false) => {
  if (!readOnly && (Number(row.id_estado) === 1 || Number(row.id_estado) === 2) && isTiempoVencido(row)) {
    toast.warning('El plazo de captura para esta actividad ha vencido (mes cerrado). Solicita la apertura del mes.')
    openLiberacion(row)
    return
  }
  activeRow.value = row
  capturaReadOnly.value = readOnly
  capturaModalOpen.value = true
}

const openEncuesta = (row) => {
  if (!hasFolio(row)) {
    toast.warning('No se puede responder encuesta para una acción sin folio institucional.')
    return
  }
  activeRow.value = row
  encuestaModalOpen.value = true
}

const openLiberacion = (row) => {
  activeRow.value = row
  liberacionModalOpen.value = true
}

const openReprogramar = async (row) => {
  const { value: formValues } = await Swal.fire({
    title: 'Reprogramar Acción Educativa',
    html: `
      <div class="text-left space-y-3">
        <p class="text-xs text-slate-500 mb-2"><b>Acción:</b> ${row.clave_accion} - ${row.nombre_accion}</p>
        <label class="block text-xs font-semibold text-slate-700">Nueva Fecha Programada:</label>
        <input id="swal-nueva-fecha" type="date" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500" value="${String(row.fecha_programada || '').split('T')[0]}">
        <label class="block text-xs font-semibold text-slate-700 mt-2">Nueva Hora Programada:</label>
        <input id="swal-nueva-hora" type="time" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500" value="${row.hora_programada || '10:00'}">
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Reprogramar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#6B2D8B',
    preConfirm: () => {
      const fecha = document.getElementById('swal-nueva-fecha').value
      const hora = document.getElementById('swal-nueva-hora').value
      if (!fecha || !hora) {
        Swal.showValidationMessage('Fecha y hora son obligatorias.')
        return false
      }
      return { fecha, hora }
    }
  })

  if (formValues) {
    try {
      await api.put(`/programacion-2027/${row.id_acciones_educativas}/reprogramar`, {
        fecha_programada: formValues.fecha,
        hora_programada: formValues.hora
      })
      toast.success('Acción reprogramada exitosamente.')
      loadAcciones()
    } catch (error) {
      toast.error('No se pudo reprogramar la acción.')
    }
  }
}

const openCancelar = async (row) => {
  const { value: motivo } = await Swal.fire({
    title: '¿Cancelar Acción Educativa?',
    text: 'Esta acción no se puede deshacer. Ingresa el motivo institucional de la cancelación:',
    input: 'textarea',
    inputPlaceholder: 'Escribe el motivo detallado...',
    inputValidator: (val) => {
      if (!val || val.trim().length < 5) {
        return 'Debes ingresar un motivo de al menos 5 caracteres.'
      }
    },
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar acción',
    cancelButtonText: 'Regresar',
    confirmButtonColor: '#DC2626'
  })

  if (motivo) {
    try {
      await api.put(`/programacion-2027/${row.id_acciones_educativas}/cancelar`, {
        motivo_cancelacion: motivo
      })
      toast.success('La actividad ha sido cancelada.')
      loadAcciones()
    } catch (error) {
      toast.error('No se pudo cancelar la actividad.')
    }
  }
}

// Acción de Administrador: Enviar recordatorio a distrito en tiempo real
const enviarRecordatorioCaptura = async (row) => {
  const distritoEtiqueta = (row.id_distrito === 0 || row.distrito === 0 || row.distrito === 'Central' || row.es_central) 
    ? 'Oficinas Centrales' 
    : `Distrito ${row.id_distrito || row.distrito || ''}`

  const { isConfirmed } = await Swal.fire({
    title: 'Enviar Recordatorio de Captura',
    html: `
      <div class="text-left text-sm space-y-2">
        <p>Se enviará un recordatorio urgente al <b>${distritoEtiqueta}</b> para la acción:</p>
        <div class="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p class="font-bold text-purple-900">${row.clave_accion} - ${row.nombre_accion}</p>
          <p class="text-xs text-purple-700">Institución: ${row.nombre_institucion}</p>
          <p class="text-xs text-purple-700">Fecha: ${String(row.fecha_programada || '').split('T')[0]} a las ${row.hora_programada}</p>
        </div>
      </div>
    `,
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: 'Enviar Notificación',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#6B2D8B'
  })

  if (isConfirmed) {
    try {
      await api.post('/notificaciones-2027/enviar', {
        id_mensaje_predeterminado: 3,
        id_acciones_educativas: row.id_acciones_educativas,
        id_tipousuario_destino: 1, // Distrital
        titulo: 'Aviso urgente de captura de actividad',
        mensaje_base: `Le recordamos que la acción ${row.clave_accion} en ${row.nombre_institucion} se encuentra en estado Sin Capturar y el plazo está por vencer.`,
        comentario_adicional: 'Favor de realizar la captura y subir los formatos a la brevedad.'
      })
      toast.success(`Recordatorio emitido a ${distritoEtiqueta}.`)
    } catch (error) {
      toast.error('No se pudo enviar el recordatorio.')
    }
  }
}

// Sockets en tiempo real
let socket = null
onMounted(() => {
  loadAcciones()
  loadRestrictions()

  try {
    socket = getSocket()
    socket.on('accion:creada', (data) => {
      toast.info(`Nueva acción educativa programada: ${data.nombre_institucion}`)
      loadAcciones()
    })
    socket.on('accion:capturada', (data) => {
      toast.info(`Acción capturada con Folio: ${data.folio_accion_educativa}`)
      loadAcciones()
    })
    socket.on('accion:finalizada', (data) => {
      toast.success(`Acción educativa finalizada exitosamente.`)
      loadAcciones()
    })
    socket.on('accion:reprogramada', () => {
      loadAcciones()
    })
    socket.on('accion:cancelada', () => {
      loadAcciones()
    })
    socket.on('encuesta:registrada', (data) => {
      const target = rows.value.find(r => r.id_acciones_educativas === Number(data.id_acciones_educativas))
      if (target) {
        target.total_encuestas = (target.total_encuestas || 0) + 1
      }
    })
  } catch (err) {
    console.warn('[SOCKET] No se pudo inicializar escucha:', err)
  }
})

onUnmounted(() => {
  if (socket) {
    socket.off('accion:creada')
    socket.off('accion:capturada')
    socket.off('accion:finalizada')
    socket.off('accion:reprogramada')
    socket.off('accion:cancelada')
    socket.off('encuesta:registrada')
  }
})

watch([search, dateFrom, dateTo, statusFilter, selectedDistrito, pageSize], () => {
  page.value = 1
  if (selectedDistrito) {
    loadAcciones()
  }
  nextTick(() => animarFilasTabla('.tr-row'))
})

watch(page, () => {
  nextTick(() => animarFilasTabla('.tr-row'))
})
</script>

<template>
  <div ref="vistaRef" class="space-y-6">
    <!-- Encabezado Minimalista y Profesional (Tipografía limpia, breadcrumb y widget de avance) -->
    <header class="space-y-4 pb-4 border-b border-slate-200/90 dark:border-slate-800">
      <!-- Breadcrumb sutil -->
      <nav class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>Educación Cívica</span>
        <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
        <span>SISEC Institucional</span>
        <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
        <span class="font-semibold text-slate-800 dark:text-slate-200">Captura y Seguimiento 2027</span>
      </nav>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <!-- Título y descripción institucional -->
        <div class="space-y-1.5 max-w-3xl">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <div class="p-2 bg-purple-100 dark:bg-purple-950/70 text-[#6B2D8B] dark:text-purple-300 rounded-xl border border-purple-200/60 dark:border-purple-800/50 shadow-2xs">
                <CalendarRange class="w-6 h-6" />
              </div>
              <span>Captura y Seguimiento de Acciones Educativas 2027</span>
            </h1>
            <span v-if="isAdmin" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
              Modo Administrador
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {{ isDistrital ? 'Captura la información sociodemográfica, adjunta los 4 formatos oficiales y gestiona las encuestas de satisfacción institucional.' : 'Monitorea en tiempo real el avance de captura distrital, visualiza expedientes oficiales y emite avisos institucionales.' }}
          </p>
        </div>

        <!-- Widget Radial de Avance Global (Card Blanca / Minimalista) -->
        <div class="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm shrink-0 self-start lg:self-auto">
          <div class="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg class="w-12 h-12 -rotate-90 transform" viewBox="0 0 36 36">
              <!-- Anillo base -->
              <path
                class="text-slate-100 dark:text-slate-800 stroke-current"
                stroke-width="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <!-- Anillo dinámico de avance -->
              <path
                class="text-emerald-500 stroke-current transition-all duration-700 ease-out"
                :stroke-dasharray="`${tasaAvance}, 100`"
                stroke-width="3.5"
                stroke-linecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span class="absolute text-[11px] font-black text-slate-800 dark:text-slate-100">{{ tasaAvance }}%</span>
          </div>
          <div class="space-y-0.5">
            <span class="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avance Global</span>
            <span class="block text-xs text-slate-800 dark:text-slate-200 font-bold">
              {{ stats.capturadas + stats.finalizadas }} de {{ stats.total }} atendidas
            </span>
            <button
              type="button"
              @click="loadAcciones"
              :disabled="loading"
              class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6B2D8B] hover:text-purple-900 dark:text-purple-300 dark:hover:text-white transition-colors cursor-pointer pt-0.5"
              title="Actualizar datos"
            >
              <RefreshCw class="w-3 h-3" :class="loading ? 'animate-spin' : ''" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Grid de Métricas / Contadores Ejecutivos Interactivos -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      <!-- 1. Total -->
      <button
        type="button"
        @click="filterByStatus('')"
        class="text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer group shadow-xs hover:shadow-md"
        :class="statusFilter === '' 
          ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 ring-2 ring-purple-600/30' 
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800'"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers class="w-5 h-5" />
          </div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full">
            Total
          </span>
        </div>
        <div class="space-y-0.5">
          <span class="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
            {{ stats.total }}
          </span>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block">
            Acciones programadas
          </span>
        </div>
      </button>

      <!-- 2. Sin Capturar (Prioridad operativa) -->
      <button
        type="button"
        @click="filterByStatus('1')"
        class="text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer group shadow-xs hover:shadow-md relative overflow-hidden"
        :class="statusFilter === '1' 
          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/40' 
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800'"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Clock class="w-5 h-5" />
          </div>
          <span class="relative flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/70 px-2.5 py-0.5 rounded-full">
            <span v-if="stats.sinCapturar > 0" class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Pendiente
          </span>
        </div>
        <div class="space-y-0.5">
          <span class="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight block">
            {{ stats.sinCapturar }}
          </span>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate" :title="`${getStatusPercent(stats.sinCapturar)}% del total pendiente`">
            {{ getStatusPercent(stats.sinCapturar) }}% por capturar
          </span>
        </div>
      </button>

      <!-- 3. Capturadas -->
      <button
        type="button"
        @click="filterByStatus('2')"
        class="text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer group shadow-xs hover:shadow-md"
        :class="statusFilter === '2' 
          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/40' 
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText class="w-5 h-5" />
          </div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/70 px-2.5 py-0.5 rounded-full">
            En Proceso
          </span>
        </div>
        <div class="space-y-0.5">
          <span class="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight block">
            {{ stats.capturadas }}
          </span>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">
            Formatos 1-3 listos
          </span>
        </div>
      </button>

      <!-- 4. Finalizadas -->
      <button
        type="button"
        @click="filterByStatus('3')"
        class="text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer group shadow-xs hover:shadow-md"
        :class="statusFilter === '3' 
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/40' 
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800'"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full">
            Cerradas
          </span>
        </div>
        <div class="space-y-0.5">
          <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight block">
            {{ stats.finalizadas }}
          </span>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">
            Expediente 100%
          </span>
        </div>
      </button>

      <!-- 5. Canceladas -->
      <button
        type="button"
        @click="filterByStatus('4')"
        class="text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer group shadow-xs hover:shadow-md col-span-2 sm:col-span-1"
        :class="statusFilter === '4' 
          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/40' 
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800'"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <XCircle class="w-5 h-5" />
          </div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/70 px-2.5 py-0.5 rounded-full">
            Canceladas
          </span>
        </div>
        <div class="space-y-0.5">
          <span class="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight block">
            {{ stats.canceladas }}
          </span>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">
            Con motivo oficial
          </span>
        </div>
      </button>
    </div>

    <!-- Contenedor Principal con AppCard -->
    <AppCard>
      <!-- Filtros -->
      <template #header>
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <Filter class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
              <span class="text-sm font-bold text-slate-800 dark:text-slate-200">Filtros y Búsqueda</span>
            </div>
            <button
              v-if="hasActiveFilters"
              type="button"
              @click="clearFilters"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          </div>

          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5 items-end">
            <div :class="isAdmin || isSuperAdmin ? 'lg:col-span-1' : 'lg:col-span-2'">
              <AppInput
                v-model="search"
                placeholder="Folio, institución, acción..."
                label="Buscar Acción"
              >
                <template #icon><Search class="w-4 h-4" /></template>
              </AppInput>
            </div>

            <!-- Selector de Distrito exclusivo para Administrador -->
            <div v-if="isAdmin || isSuperAdmin">
              <AppSelect v-model="selectedDistrito" label="Distrito / Sede">
                <option value="">Todos los distritos</option>
                <option value="0">Sede Central / Admin</option>
                <option v-for="d in 33" :key="d" :value="d">Distrito {{ d }}</option>
              </AppSelect>
            </div>

            <div>
              <AppSelect v-model="statusFilter" label="Estado">
                <option value="">Todos los estados</option>
                <option value="1">Sin capturar</option>
                <option value="2">Capturada</option>
                <option value="3">Finalizada</option>
                <option value="4">Cancelada</option>
              </AppSelect>
            </div>

            <div>
              <AppInput v-model="dateFrom" type="date" label="Desde fecha" />
            </div>

            <div>
              <AppInput v-model="dateTo" type="date" label="Hasta fecha" />
            </div>
          </div>
        </div>
      </template>

      <!-- Tabla de Datos Principal -->
      <AppTable
        :loading="loading"
        :is-empty="!loading && pagedRows.length === 0"
        empty-message="No se encontraron acciones educativas registradas con los filtros aplicados."
      >
        <template #head>
          <th class="w-2 p-0 bg-transparent"></th>
          <th class="px-5 py-3 text-center w-14">#</th>
          <th class="px-5 py-3 cursor-pointer hover:bg-iecm-morado/15 transition-colors" @click="toggleSort('id_acciones_educativas')">
            <div class="flex items-center gap-2">
              Folio / Acción
              <ChevronUp v-if="sortKey === 'id_acciones_educativas' && sortDir === 'asc'" class="w-3 h-3" />
              <ChevronDown v-else-if="sortKey === 'id_acciones_educativas' && sortDir === 'desc'" class="w-3 h-3" />
            </div>
          </th>
          <th class="px-5 py-3 cursor-pointer hover:bg-iecm-morado/15 transition-colors" @click="toggleSort('nombre_institucion')">
            <div class="flex items-center gap-2">
              Institución / Espacio
              <ChevronUp v-if="sortKey === 'nombre_institucion' && sortDir === 'asc'" class="w-3 h-3" />
              <ChevronDown v-else-if="sortKey === 'nombre_institucion' && sortDir === 'desc'" class="w-3 h-3" />
            </div>
          </th>
          <th class="px-5 py-3 cursor-pointer hover:bg-iecm-morado/15 transition-colors" @click="toggleSort('fecha_programada')">
            <div class="flex items-center gap-2">
              Fecha Programada
              <ChevronUp v-if="sortKey === 'fecha_programada' && sortDir === 'asc'" class="w-3 h-3" />
              <ChevronDown v-else-if="sortKey === 'fecha_programada' && sortDir === 'desc'" class="w-3 h-3" />
            </div>
          </th>
          <th class="px-5 py-3 text-center cursor-pointer hover:bg-iecm-morado/15 transition-colors select-none" @click="toggleSort('estado_prioridad')">
            <div class="flex items-center justify-center gap-1.5">
              <span>Estado</span>
              <ChevronUp v-if="sortKey === 'estado_prioridad' && sortDir === 'asc'" class="w-3 h-3" />
              <ChevronDown v-else-if="sortKey === 'estado_prioridad' && sortDir === 'desc'" class="w-3 h-3" />
            </div>
          </th>
          <th class="px-5 py-3 text-center">Acciones</th>
        </template>

        <template #body>
          <tr
            v-for="(row, index) in pagedRows"
            :key="row.id_acciones_educativas"
            class="tr-row transition-all duration-200 border-b border-slate-100 dark:border-slate-800 hover:bg-purple-50/40 dark:hover:bg-purple-950/20"
          >
            <!-- Línea de color distintivo del catálogo -->
            <td class="w-2 p-0" :style="{ backgroundColor: row.color || row.color_vertiente || '#6B2D8B' }" title="Color distintivo de la acción"></td>

            <!-- Consecutivo -->
            <td class="px-5 py-4 text-center font-bold text-slate-500 dark:text-slate-400 text-sm">
              {{ (page - 1) * pageSize + index + 1 }}
            </td>

            <!-- Folio e Identificación de Acción -->
            <td class="px-5 py-4">
              <div class="flex flex-col gap-1">
                <div>
                  <span
                    v-if="row.folio_accion_educativa"
                    class="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight"
                  >
                    {{ row.folio_accion_educativa }}
                  </span>
                  <span
                    v-else
                    class="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-2xs italic"
                  >
                    Sin folio
                  </span>
                </div>
                <span class="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-1" :title="row.nombre_accion">
                  {{ row.nombre_accion }}
                </span>
              </div>
            </td>

            <!-- Institución y Ubicación -->
            <td class="px-5 py-4">
              <div class="flex flex-col gap-1">
                <span class="font-semibold text-slate-900 dark:text-slate-100 text-sm line-clamp-1" :title="row.nombre_institucion">
                  {{ row.nombre_institucion }}
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                    {{ row.tipo_institucion || 'Espacio visitado' }}
                  </span>
                  <template v-if="isAdmin">
                    <span
                      v-if="row.id_distrito === 0 || row.distrito === 0 || String(row.id_distrito) === '0' || row.distrito === 'Central' || row.distrito === 'Admin' || row.es_central"
                      class="text-[11px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-md border border-purple-300 dark:border-purple-700 shadow-2xs"
                    >
                      Central
                    </span>
                    <span
                      v-else-if="row.id_distrito || row.distrito"
                      class="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700/60 font-semibold"
                    >
                      Distrito {{ row.id_distrito || row.distrito }}
                    </span>
                  </template>
                </div>
              </div>
            </td>

            <!-- Fecha y Hora Programada -->
            <td class="px-5 py-4">
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CalendarDays class="w-4 h-4 text-purple-600 shrink-0" />
                  {{ String(row.fecha_programada || '').split('T')[0] }}
                </div>
                <div class="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {{ row.hora_programada }} hrs
                </div>
              </div>
            </td>

            <!-- Estado Visual Badge (4 Estados) -->
            <td class="px-5 py-4 text-center">
              <div class="inline-flex flex-col items-center gap-1">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                  :class="getEstadoBadgeClass(row.id_estado)"
                >
                  <span class="w-2 h-2 rounded-full" :class="{
                    'bg-amber-500 animate-pulse': Number(row.id_estado) === 1,
                    'bg-blue-500': Number(row.id_estado) === 2,
                    'bg-emerald-500': Number(row.id_estado) === 3,
                    'bg-rose-500': Number(row.id_estado) === 4
                  }"></span>
                  {{ row.estado_accion || (Number(row.id_estado) === 1 ? 'Sin capturar' : Number(row.id_estado) === 2 ? 'Capturada' : Number(row.id_estado) === 3 ? 'Finalizada' : 'Cancelada') }}
                </span>

                <!-- Indicador de Mes Cerrado / Tiempo Vencido -->
                <span 
                  v-if="(Number(row.id_estado) === 1 || Number(row.id_estado) === 2) && isTiempoVencido(row)"
                  class="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 shadow-xs"
                >
                  Mes cerrado
                </span>

                <!-- Contador de encuestas respondidas ÚNICAMENTE para capturadas y finalizadas con folio (nunca en canceladas) -->
                <span v-if="(Number(row.id_estado) === 2 || Number(row.id_estado) === 3) && hasFolio(row)" class="text-[10px] text-slate-500 font-medium">
                  {{ row.total_encuestas || 0 }} encuesta(s)
                </span>
              </div>
            </td>

            <!-- Columna de Acciones -->
            <td class="px-5 py-4 text-center">
              <!-- CASO 1: ACCIÓN CANCELADA (id_estado === 4) -> Para CUALQUIER tipo de usuario SOLO ver motivo -->
              <div v-if="Number(row.id_estado) === 4" class="flex items-center justify-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Ver motivo institucional de cancelación"
                  @click="openVerMotivo(row)"
                >
                  <AlertCircle class="w-4 h-4 text-rose-500" />
                  <span>Ver motivo</span>
                </button>
              </div>

              <!-- CASO 2: VISTA EXCLUSIVA PARA ADMINISTRADOR (Solo Lectura + Recordatorios) -->
              <div v-else-if="isAdmin" class="flex items-center justify-center gap-2">
                <!-- Encuesta: solo para estados 2 y 3 SI tiene folio institucional -->
                <AppButton
                  v-if="(Number(row.id_estado) === 2 || Number(row.id_estado) === 3) && hasFolio(row)"
                  variant="secondary"
                  size="sm"
                  class="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                  title="Responder o registrar encuestas de satisfacción"
                  @click="openEncuesta(row)"
                >
                  <template #icon><ClipboardList class="w-4 h-4 text-emerald-700" /></template>
                  Encuesta
                </AppButton>

                <!-- Ver Detalle: solo para estados 2 y 3 (capturada y finalizada) -->
                <AppButton
                  v-if="Number(row.id_estado) === 2 || Number(row.id_estado) === 3"
                  variant="secondary"
                  size="sm"
                  title="Ver expediente y evidencias adjuntas (Solo Lectura)"
                  @click="openCaptura(row, true)"
                >
                  <template #icon><Eye class="w-4 h-4 text-purple-700" /></template>
                  Ver Detalle
                </AppButton>

                <!-- Recordatorio: solo para estado 1 (Sin capturar) -->
                <AppButton
                  v-if="Number(row.id_estado) === 1"
                  variant="ghost"
                  size="sm"
                  class="text-amber-700 hover:bg-amber-50 border border-amber-200"
                  title="Enviar recordatorio de captura urgente al distrito"
                  @click="enviarRecordatorioCaptura(row)"
                >
                  <template #icon><BellRing class="w-4 h-4 text-amber-600" /></template>
                  Recordatorio
                </AppButton>
              </div>

              <!-- CASO 3: VISTA PARA DISTRITAL / SUPERADMIN (Operativa Completa) -->
              <div v-else class="flex items-center justify-center gap-1.5 flex-wrap">
                <!-- SUB-CASO A: TIEMPO DE CAPTURA VENCIDO (ESTADO 1 O 2 CON MES CERRADO / PLAZO VENCIDO) -->
                <!-- Botones operativos deshabilitados y ÚNICAMENTE se muestra el botón Send para solicitar apertura -->
                <template v-if="(Number(row.id_estado) === 1 || Number(row.id_estado) === 2) && isTiempoVencido(row)">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    class="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700 font-semibold shadow-xs"
                    title="El plazo de captura ha vencido (mes cerrado). Clic para solicitar la apertura del mes al Administrador"
                    @click="openLiberacion(row)"
                  >
                    <template #icon><Send class="w-4 h-4 text-amber-600 dark:text-amber-400" /></template>
                    Solicitar apertura
                  </AppButton>
                </template>

                <!-- SUB-CASO B: ESTADO 1: SIN CAPTURAR (DENTRO DEL PERIODO VIGENTE) -->
                <template v-else-if="Number(row.id_estado) === 1">
                  <AppButton
                    variant="primary"
                    size="sm"
                    class="bg-[#6B2D8B] hover:bg-[#582472] text-white"
                    title="Capturar información y adjuntar formatos 1 a 3"
                    @click="openCaptura(row, false)"
                  >
                    <template #icon><CheckCircle class="w-4 h-4" /></template>
                    Capturar
                  </AppButton>

                  <AppButton
                    variant="ghost"
                    size="sm"
                    class="text-amber-700 hover:bg-amber-50"
                    title="Reprogramar fecha u hora"
                    @click="openReprogramar(row)"
                  >
                    <template #icon><CalendarClock class="w-4 h-4" /></template>
                  </AppButton>

                  <AppButton
                    variant="ghost"
                    size="sm"
                    class="text-rose-600 hover:bg-rose-50"
                    title="Cancelar acción con motivo"
                    @click="openCancelar(row)"
                  >
                    <template #icon><XCircle class="w-4 h-4" /></template>
                  </AppButton>
                </template>

                <!-- SUB-CASO C: ESTADO 2: CAPTURADA (DENTRO DEL PERIODO VIGENTE) -->
                <template v-else-if="Number(row.id_estado) === 2">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    title="Editar información capturada y expedientes 1-3"
                    @click="openCaptura(row, false)"
                  >
                    Editar
                  </AppButton>

                  <!-- Encuesta: solo si tiene folio oficial generado -->
                  <AppButton
                    v-if="hasFolio(row)"
                    variant="secondary"
                    size="sm"
                    class="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                    title="Responder encuesta de satisfacción"
                    @click="openEncuesta(row)"
                  >
                    <template #icon><ClipboardList class="w-4 h-4 text-emerald-700" /></template>
                    Encuesta
                  </AppButton>

                  <AppButton
                    variant="primary"
                    size="sm"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white"
                    title="Subir Archivo 4 (Encuestas Consolidadas) y Finalizar Acción"
                    @click="openCaptura(row, false)"
                  >
                    <template #icon><ShieldCheck class="w-4 h-4" /></template>
                    Finalizar
                  </AppButton>
                </template>

                <!-- SUB-CASO D: ESTADO 3: FINALIZADA -->
                <template v-else-if="Number(row.id_estado) === 3">
                  <!-- Encuesta: solo si tiene folio oficial generado -->
                  <AppButton
                    v-if="hasFolio(row)"
                    variant="secondary"
                    size="sm"
                    class="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                    title="Responder más encuestas de satisfacción"
                    @click="openEncuesta(row)"
                  >
                    <template #icon><ClipboardList class="w-4 h-4 text-emerald-700" /></template>
                    Encuesta
                  </AppButton>

                  <AppButton
                    variant="secondary"
                    size="sm"
                    class="text-slate-700 hover:bg-slate-100"
                    title="Expediente finalizado. Ver información en modo solo lectura"
                    @click="openCaptura(row, true)"
                  >
                    <template #icon><Eye class="w-4 h-4 text-emerald-600" /></template>
                    Ver Expediente
                  </AppButton>
                </template>
              </div>
            </td>
          </tr>
        </template>
      </AppTable>

      <!-- Footer de Paginación -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span class="text-sm text-slate-500 font-medium">
            Mostrando <span class="text-slate-900 dark:text-white font-bold">{{ pagedRows.length }}</span> de <span class="text-slate-900 dark:text-white font-bold">{{ sortedRows.length }}</span> acciones
          </span>
          <div class="flex items-center gap-2">
            <AppButton variant="secondary" size="sm" :disabled="page <= 1" @click="page = Math.max(1, page - 1)">
              Anterior
            </AppButton>
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">
              Página {{ page }} de {{ totalPages }}
            </span>
            <AppButton variant="secondary" size="sm" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">
              Siguiente
            </AppButton>
          </div>
        </div>
      </template>
    </AppCard>

    <!-- Modales Operativos 2027 -->
    <ModalCaptura2027
      :open="capturaModalOpen"
      :actividad="activeRow"
      :is-read-only="capturaReadOnly"
      @close="capturaModalOpen = false"
      @saved="() => { capturaModalOpen = false; loadAcciones(); }"
    />

    <ModalEncuesta2027
      :open="encuestaModalOpen"
      :actividad="activeRow"
      @close="encuestaModalOpen = false"
      @encuesta-guardada="() => { loadAcciones(); }"
    />

    <ModalSolicitarLiberacion
      :open="liberacionModalOpen"
      :actividad="activeRow"
      @close="liberacionModalOpen = false"
      @enviado="() => { liberacionModalOpen = false; loadAcciones(); }"
    />

    <!-- Modal Pequeño de Motivo de Cancelación -->
    <AppModal
      :open="motivoModalOpen"
      size="sm"
      @close="motivoModalOpen = false"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-xs">
            <XCircle class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Motivo de Cancelación
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Detalle institucional de la actividad cancelada
            </p>
          </div>
        </div>
      </template>

      <div v-if="selectedMotivoRow" class="space-y-3.5 py-1">
        <!-- Ficha Resumen de la Acción -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Acción Educativa
            </span>
            <span 
              v-if="selectedMotivoRow.folio_accion_educativa" 
              class="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
            >
              {{ selectedMotivoRow.folio_accion_educativa }}
            </span>
            <span 
              v-else 
              class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 italic"
            >
              Sin folio (ID: {{ selectedMotivoRow.id_acciones_educativas }})
            </span>
          </div>
          <p class="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
            {{ selectedMotivoRow.clave_accion ? `${selectedMotivoRow.clave_accion} - ` : '' }}{{ selectedMotivoRow.nombre_accion || 'Acción Educativa' }}
          </p>
          <p class="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
            <MapPin class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span class="truncate">{{ selectedMotivoRow.nombre_institucion || 'Sede sin especificar' }}</span>
          </p>
        </div>

        <!-- Caja del Motivo -->
        <div class="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200/90 dark:border-rose-900/50 space-y-1.5">
          <div class="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-500" />
            <span>Motivo Registrado</span>
          </div>
          <p class="text-sm text-slate-800 dark:text-rose-100 font-medium whitespace-pre-wrap leading-relaxed pl-5">
            {{ selectedMotivoRow.motivo_cancelacion || 'No se ingresó un motivo específico al cancelar esta actividad.' }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end w-full">
          <AppButton
            variant="secondary"
            size="sm"
            class="px-5 font-semibold text-slate-700 dark:text-slate-200"
            @click="motivoModalOpen = false"
          >
            Cerrar
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
