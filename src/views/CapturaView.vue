<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import Swal from 'sweetalert2'
import {
  CalendarRange, Search, ChevronUp, ChevronDown, CheckCircle,
  XCircle, CalendarClock, Lock, AlertCircle, CalendarDays,
  FileText, ClipboardList, ShieldCheck, Eye, BellRing, Send,
  Sparkles, Filter, RefreshCw
} from '@lucide/vue'
import api from '../services/api.js'
import { useAuthStore } from '../stores/authStore.js'
import { useToast } from '../composables/useToast.js'
import { useGsapAnimations } from '../composables/useGsapAnimations.js'
import { getSocket } from '../services/socket.js'

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

// Paginación y Ordenamiento
const sortKey = ref('fecha_programada')
const sortDir = ref('desc')
const page = ref(1)
const pageSize = ref(10)

// Modales
const capturaModalOpen = ref(false)
const capturaReadOnly = ref(false)
const encuestaModalOpen = ref(false)
const liberacionModalOpen = ref(false)
const activeRow = ref(null)

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

// Acciones de Distrital
const openCaptura = (row, readOnly = false) => {
  activeRow.value = row
  capturaReadOnly.value = readOnly
  capturaModalOpen.value = true
}

const openEncuesta = (row) => {
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
  const { isConfirmed } = await Swal.fire({
    title: 'Enviar Recordatorio de Captura',
    html: `
      <div class="text-left text-sm space-y-2">
        <p>Se enviará un recordatorio urgente al <b>Distrito ${row.id_distrito || row.distrito || ''}</b> para la acción:</p>
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
      toast.success(`Recordatorio emitido al Distrito ${row.id_distrito || row.distrito || ''}.`)
    } catch (error) {
      toast.error('No se pudo enviar el recordatorio.')
    }
  }
}

// Sockets en tiempo real
let socket = null
onMounted(() => {
  loadAcciones()
  if (vistaRef.value) animarVista(vistaRef.value)

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
    <!-- Header banner -->
    <div class="rounded-2xl bg-[#403166] dark:bg-[#231A38] px-6 py-6 text-white shadow-iecm-sm flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
      <div class="absolute right-0 top-0 w-72 h-72 bg-white/5 opacity-20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>

      <div class="flex items-start gap-4 relative z-10">
        <div class="p-3 bg-white/15 rounded-xl border border-white/20 shadow-sm">
          <CalendarRange class="w-8 h-8 text-white" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold tracking-tight text-white">Captura y Seguimiento de Acciones Educativas 2027</h2>
            <span v-if="isAdmin" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/30">
              Modo Administrador (Solo Lectura)
            </span>
          </div>
          <p class="text-purple-200 text-sm mt-1 max-w-xl">
            {{ isDistrital ? 'Captura la información sociodemográfica, adjunta los 4 formatos oficiales y gestiona las encuestas de satisfacción.' : 'Monitorea en tiempo real el avance de captura de todos los distritos, visualiza expedientes y emite avisos institucionales.' }}
          </p>
        </div>
      </div>

      <!-- Métricas rápidas de los 4 estados -->
      <div class="flex items-center gap-2.5 flex-wrap relative z-10">
        <div class="bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/15 text-center">
          <span class="block text-xs uppercase tracking-wider text-purple-200 font-semibold">Total</span>
          <span class="text-lg font-extrabold text-white">{{ stats.total }}</span>
        </div>
        <div class="bg-amber-500/20 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-amber-400/30 text-center">
          <span class="block text-xs uppercase tracking-wider text-amber-200 font-semibold">Sin Capturar</span>
          <span class="text-lg font-extrabold text-amber-300">{{ stats.sinCapturar }}</span>
        </div>
        <div class="bg-blue-500/20 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-blue-400/30 text-center">
          <span class="block text-xs uppercase tracking-wider text-blue-200 font-semibold">Capturadas</span>
          <span class="text-lg font-extrabold text-blue-300">{{ stats.capturadas }}</span>
        </div>
        <div class="bg-emerald-500/20 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-emerald-400/30 text-center">
          <span class="block text-xs uppercase tracking-wider text-emerald-200 font-semibold">Finalizadas</span>
          <span class="text-lg font-extrabold text-emerald-300">{{ stats.finalizadas }}</span>
        </div>
        <div class="bg-rose-500/20 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-rose-400/30 text-center">
          <span class="block text-xs uppercase tracking-wider text-rose-200 font-semibold">Canceladas</span>
          <span class="text-lg font-extrabold text-rose-300">{{ stats.canceladas }}</span>
        </div>
      </div>
    </div>

    <!-- Contenedor Principal con AppCard -->
    <AppCard>
      <!-- Filtros -->
      <template #header>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5 items-end">
          <div :class="isAdmin || isSuperAdmin ? 'lg:col-span-1' : 'lg:col-span-2'">
            <AppInput
              v-model="search"
              placeholder="Folio, institución, clave..."
              label="Buscar Acción"
            >
              <template #icon><Search class="w-4 h-4" /></template>
            </AppInput>
          </div>

          <!-- Selector de Distrito exclusivo para Administrador -->
          <div v-if="isAdmin || isSuperAdmin">
            <AppSelect v-model="selectedDistrito" label="Distrito">
              <option value="">Todos los distritos</option>
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
          <th class="px-5 py-3 text-center">Estado</th>
          <th class="px-5 py-3 text-center">Acciones</th>
        </template>

        <template #body>
          <tr
            v-for="(row, index) in pagedRows"
            :key="row.id_acciones_educativas"
            class="tr-row transition-all duration-200 border-b border-slate-100 dark:border-slate-800 hover:bg-purple-50/40 dark:hover:bg-purple-950/20"
          >
            <!-- Línea de color distintivo del catálogo -->
            <td class="w-2 p-0" :style="{ backgroundColor: row.color || '#6B2D8B' }" title="Color distintivo de la acción"></td>

            <!-- Consecutivo -->
            <td class="px-5 py-4 text-center font-bold text-slate-500 dark:text-slate-400 text-sm">
              {{ (page - 1) * pageSize + index + 1 }}
            </td>

            <!-- Folio e Identificación de Acción -->
            <td class="px-5 py-4">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold text-iecm-morado-900 dark:text-iecm-morado-300">
                    {{ row.folio_accion_educativa || `ID-${row.id_acciones_educativas}` }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-xs"
                    :style="{ backgroundColor: row.color || '#6B2D8B' }"
                  >
                    {{ row.clave_accion }}
                  </span>
                  <span v-if="row.con_convenio" class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Convenio
                  </span>
                </div>
                <span class="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1" :title="row.nombre_accion">
                  {{ row.nombre_accion }}
                </span>
                <span class="text-[11px] text-slate-400">
                  Vertiente: <strong class="text-slate-600 dark:text-slate-400">{{ row.vertiente }}</strong>
                </span>
              </div>
            </td>

            <!-- Institución y Ubicación -->
            <td class="px-5 py-4">
              <div class="flex flex-col">
                <span class="font-semibold text-slate-900 dark:text-slate-100 text-sm line-clamp-1" :title="row.nombre_institucion">
                  {{ row.nombre_institucion }}
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {{ row.calle_numero }}, {{ row.demarcacion }}
                </span>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                    {{ row.tipo_institucion || 'Espacio visitado' }}
                  </span>
                  <span v-if="isAdmin && (row.id_distrito || row.distrito)" class="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
                    Distrito {{ row.id_distrito || row.distrito }}
                  </span>
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

                <!-- Contador de encuestas respondidas para capturadas y finalizadas -->
                <span v-if="Number(row.id_estado) >= 2" class="text-[10px] text-slate-500 font-medium">
                  {{ row.total_encuestas || 0 }} encuesta(s)
                </span>
              </div>
            </td>

            <!-- Columna de Acciones -->
            <td class="px-5 py-4 text-center">
              <!-- VISTA EXCLUSIVA PARA ADMINISTRADOR (Solo Lectura + Recordatorios) -->
              <div v-if="isAdmin" class="flex items-center justify-center gap-2">
                <AppButton
                  v-if="Number(row.id_estado) >= 2"
                  variant="secondary"
                  size="sm"
                  title="Ver expediente y evidencias adjuntas (Solo Lectura)"
                  @click="openCaptura(row, true)"
                >
                  <template #icon><Eye class="w-4 h-4 text-purple-700" /></template>
                  Ver Detalle
                </AppButton>

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

              <!-- VISTA PARA DISTRITAL / SUPERADMIN (Operativa Completa) -->
              <div v-else class="flex items-center justify-center gap-1.5 flex-wrap">
                <!-- ESTADO 1: SIN CAPTURAR -->
                <template v-if="Number(row.id_estado) === 1">
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

                  <AppButton
                    variant="ghost"
                    size="sm"
                    class="text-blue-600 hover:bg-blue-50"
                    title="Solicitar liberación extemporánea al Administrador"
                    @click="openLiberacion(row)"
                  >
                    <template #icon><Send class="w-4 h-4" /></template>
                  </AppButton>
                </template>

                <!-- ESTADO 2: CAPTURADA (Permite encuestas y finalizar) -->
                <template v-else-if="Number(row.id_estado) === 2">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    title="Editar información capturada y expedientes 1-3"
                    @click="openCaptura(row, false)"
                  >
                    Editar
                  </AppButton>

                  <AppButton
                    variant="secondary"
                    size="sm"
                    class="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                    title="Responder encuesta individual y generar PDF imprimible"
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

                <!-- ESTADO 3: FINALIZADA (Bloqueo Total / Expediente Cerrado) -->
                <template v-else-if="Number(row.id_estado) === 3">
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

                <!-- ESTADO 4: CANCELADA -->
                <template v-else-if="Number(row.id_estado) === 4">
                  <span
                    class="text-xs text-rose-600 italic cursor-help inline-flex items-center gap-1"
                    :title="row.motivo_cancelacion ? `Motivo: ${row.motivo_cancelacion}` : 'Actividad cancelada'"
                  >
                    <AlertCircle class="w-3.5 h-3.5" />
                    {{ row.motivo_cancelacion ? 'Ver motivo' : 'Cancelada' }}
                  </span>
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
  </div>
</template>
