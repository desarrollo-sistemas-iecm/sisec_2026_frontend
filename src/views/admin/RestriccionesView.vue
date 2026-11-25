<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  CalendarDays, Save, CheckCircle, XCircle, Plus, Trash2, ShieldCheck,
  AlertCircle, Building, CalendarRange, Clock, Sparkles, Filter, BellRing,
  CheckCircle2, RefreshCw
} from '@lucide/vue'
import api from '../../services/api'
import { getSocket } from '../../services/socket.js'
import AppCard from '../../components/ui/AppCard.vue'
import ModalHabilitarFechas from '../../components/modals/ModalHabilitarFechas.vue'
import Swal from 'sweetalert2'
import { useAuthStore } from '../../stores/authStore.js'

const authStore = useAuthStore()

const restricciones = ref([])
const solicitudes = ref([])
const loading = ref(true)

const modalHabilitarOpen = ref(false)
const modalHabilitarSede = ref(0)
const modalHabilitarTitulo = ref('')
const modalAllowGlobal = ref(true)

const fetchRestricciones = async () => {
  try {
    const { data } = await api.get('/admin/restricciones')
    if (data.success) {
      restricciones.value = data.data
    }
  } catch (error) {
    console.error('Error fetching restricciones:', error)
  }
}

const fetchSolicitudes = async () => {
  try {
    const { data } = await api.get('/notificaciones/solicitudes-pendientes')
    if (data.success) {
      solicitudes.value = data.data
    }
  } catch (error) {
    console.error('Error fetching solicitudes:', error)
  }
}

const saveRestriccion = async (form) => {
  try {
    const { data } = await api.post('/admin/restricciones', form)
    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Configuración Actualizada',
        text: 'El periodo de fechas global ha sido guardado correctamente.',
        confirmButtonColor: '#6B2D8B',
        timer: 2000,
        showConfirmButton: false
      })
      await fetchRestricciones()
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Ocurrió un error al guardar la configuración.',
      confirmButtonColor: '#6B2D8B'
    })
  }
}

// Filtrar las excepciones específicas por distrito (idsede > 0)
const excepcionesDistritales = computed(() => {
  return restricciones.value.filter(r => Number(r.idsede) > 0)
})

const distritosConExcepcionCount = computed(() => {
  const set = new Set(excepcionesDistritales.value.map(r => Number(r.idsede)))
  return set.size
})

const porcentajeExcepcion = computed(() => {
  return Math.round((distritosConExcepcionCount.value / 33) * 100)
})

// Eliminar / revocar una excepción de distrito
const deleteRestriccion = async (item) => {
  const result = await Swal.fire({
    title: '¿Revocar habilitación especial?',
    text: `Se eliminará el periodo autorizado para el Distrito ${item.idsede} (${item.modulo === 'programacion' ? 'Programación' : 'Captura'}).`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, revocar permiso',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    try {
      await api.delete(`/admin/restricciones/${item.id}`)
      await fetchRestricciones()
      Swal.fire({
        icon: 'success',
        title: 'Habilitación Revocada',
        text: 'La excepción del distrito ha sido eliminada con éxito.',
        confirmButtonColor: '#6B2D8B',
        timer: 1800,
        showConfirmButton: false
      })
    } catch (error) {
      Swal.fire('Error', 'No se pudo eliminar la excepción.', 'error')
    }
  }
}

// Modal interactivo para dar de alta una nueva excepción a un distrito o global
const abrirModalNuevaExcepcion = (sede = 0, isGlobal = true) => {
  modalHabilitarSede.value = sede
  modalAllowGlobal.value = isGlobal
  modalHabilitarTitulo.value = isGlobal && sede === 0 
    ? 'Habilitar Fechas (Mes Completo o Días Específicos)' 
    : `Habilitar Fechas para Distrito ${sede}`
  modalHabilitarOpen.value = true
}

const handleAprobarSolicitud = async (solicitud) => {
  modalHabilitarSede.value = Number(solicitud.idsede_origen || 1)
  modalAllowGlobal.value = false
  modalHabilitarTitulo.value = `Aprobar Habilitación - Distrito ${solicitud.idsede_origen}`
  modalHabilitarOpen.value = true
  try {
    await api.patch(`/notificaciones/${solicitud.id}/leer`)
    await fetchSolicitudes()
  } catch (e) {}
}

const handleRechazarSolicitud = async (solicitud) => {
  try {
    await api.patch(`/notificaciones/${solicitud.id}/leer`)
    await fetchSolicitudes()
    Swal.fire({
      icon: 'info',
      title: 'Solicitud Descartada',
      text: 'La petición de fecha ha sido atendida.',
      confirmButtonColor: '#6B2D8B',
      timer: 1800,
      showConfirmButton: false
    })
  } catch (error) {
    Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error')
  }
}

let socketInstance = null

onMounted(async () => {
  await fetchRestricciones()
  await fetchSolicitudes()
  if (authStore.isSuperAdmin) {
    await fetchManualStatus()
    await fetchAlertaLoginStatus()
    await fetchUltimaActStatus()
  }
  
  if (restricciones.value.length === 0) {
    restricciones.value = [
      { modulo: 'programacion', fecha_inicio: '', fecha_fin: '', habilitado: false },
      { modulo: 'captura', fecha_inicio: '', fecha_fin: '', habilitado: false }
    ]
  }
  loading.value = false

  try {
    socketInstance = getSocket()
    if (socketInstance) {
      socketInstance.on('config:manual', (data) => {
        manualHabilitado.value = Boolean(data?.habilitado)
      })
      socketInstance.on('config:alerta_login', (data) => {
        alertaLoginHabilitada.value = Boolean(data?.habilitado)
      })
      socketInstance.on('config:ultima_actualizacion', (data) => {
        ultimaActHabilitada.value = Boolean(data?.habilitado)
        if (data?.fecha) ultimaActFecha.value = data.fecha
      })
    }
  } catch (err) {
    console.warn('[SOCKET] Error escuchando en restricciones:', err)
  }
})

onUnmounted(() => {
  if (socketInstance) {
    socketInstance.off('config:manual')
    socketInstance.off('config:alerta_login')
    socketInstance.off('config:ultima_actualizacion')
  }
})

const manualHabilitado = ref(true)
const manualLoading = ref(false)
const alertaLoginHabilitada = ref(false)
const ultimaActHabilitada = ref(false)
const ultimaActFecha = ref('')

const fetchUltimaActStatus = async () => {
  try {
    const { data } = await api.get('/admin/ultima-actualizacion-config')
    if (data.success) {
      ultimaActHabilitada.value = data.habilitado
      ultimaActFecha.value = data.fecha
    }
  } catch (error) {
    console.error('Error fetching last update config:', error)
  }
}

const saveUltimaActStatus = async () => {
  try {
    const { data } = await api.post('/admin/ultima-actualizacion-config', { 
      habilitado: ultimaActHabilitada.value,
      fecha: ultimaActFecha.value
    })
    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'La etiqueta de última modificación ha sido actualizada.',
        confirmButtonColor: '#6B2D8B',
        timer: 1800,
        showConfirmButton: false
      })
    }
  } catch (error) {
    Swal.fire('Error', 'No se pudo guardar la fecha de actualización.', 'error')
  }
}

const fetchAlertaLoginStatus = async () => {
  try {
    const { data } = await api.get('/admin/alerta-login-config')
    if (data.success) {
      alertaLoginHabilitada.value = data.habilitado
    }
  } catch (error) {
    console.error('Error fetching alerta login status:', error)
  }
}

const saveAlertaLoginStatus = async () => {
  try {
    const { data } = await api.post('/admin/alerta-login-config', { habilitado: alertaLoginHabilitada.value })
    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'La visibilidad de la alerta de bienvenida ha sido actualizada.',
        confirmButtonColor: '#6B2D8B',
        timer: 1800,
        showConfirmButton: false
      })
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Ocurrió un error al guardar la configuración de la alerta.',
      confirmButtonColor: '#6B2D8B'
    })
  }
}

const fetchManualStatus = async () => {
  try {
    const { data } = await api.get('/admin/manual-config')
    if (data.success) {
      manualHabilitado.value = data.habilitado
    }
  } catch (error) {
    console.error('Error fetching manual status:', error)
  } finally {
    manualLoading.value = false
  }
}

const saveManualStatus = async () => {
  try {
    const { data } = await api.post('/admin/manual-config', { habilitado: manualHabilitado.value })
    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'La visibilidad del manual de usuario ha sido actualizada.',
        confirmButtonColor: '#6B2D8B',
        timer: 1800,
        showConfirmButton: false
      })
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Ocurrió un error al guardar la configuración del manual.',
      confirmButtonColor: '#6B2D8B'
    })
  }
}

const generalConfig = ref({
  fecha_inicio: '',
  fecha_fin: '',
  habilitado: true
})

const setConfigFromData = () => {
  const record = restricciones.value.find(r => r.modulo === 'programacion') || restricciones.value[0]
  if (record) {
    generalConfig.value.fecha_inicio = record.fecha_inicio
    generalConfig.value.fecha_fin = record.fecha_fin
    generalConfig.value.habilitado = Boolean(record.habilitado)
  }
}

watch(restricciones, () => {
  if (restricciones.value.length > 0) {
    setConfigFromData()
  }
}, { deep: true })
</script>

<template>
  <div class="space-y-6">
    <!-- Header Principal -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 rounded-xl shadow-xs">
          <CalendarDays class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Restricciones y Periodos de Fechas 2027
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Control de calendarios, habilitaciones extemporáneas, excepciones por distrito y solicitudes en tiempo real.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="abrirModalNuevaExcepcion(0, true)"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#6B2D8B] to-purple-700 hover:from-purple-800 hover:to-[#5B2577] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <CalendarRange class="w-4 h-4" />
          <span>Habilitar Mes o Días Especiales</span>
        </button>
      </div>
    </header>

    <!-- Grid de Métricas Ejecutivas con Radials -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <!-- 1. Radial de Distritos con Excepción -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg class="w-12 h-12 -rotate-90 transform" viewBox="0 0 36 36">
            <path class="text-slate-100 dark:text-slate-800 stroke-current" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="text-[#6B2D8B] dark:text-purple-400 stroke-current transition-all duration-700 ease-out" :stroke-dasharray="`${porcentajeExcepcion}, 100`" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span class="absolute text-[11px] font-black text-slate-800 dark:text-slate-100">{{ porcentajeExcepcion }}%</span>
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Habilitación Distrital</span>
          <span class="text-sm font-black text-slate-900 dark:text-white">{{ distritosConExcepcionCount }} de 33 distritos</span>
          <span class="block text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">Con periodo especial</span>
        </div>
      </div>

      <!-- 2. Estado Global del Sistema -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          :class="generalConfig.habilitado ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'"
        >
          <CheckCircle2 v-if="generalConfig.habilitado" class="w-6 h-6 animate-pulse" />
          <XCircle v-else class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operatividad Global</span>
          <span class="text-sm font-black" :class="generalConfig.habilitado ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
            {{ generalConfig.habilitado ? 'Sistema Abierto' : 'Sistema Cerrado' }}
          </span>
          <span class="block text-[11px] text-slate-400 font-medium mt-0.5">
            {{ generalConfig.habilitado ? 'Mes en curso disponible' : 'Bloqueo general activo' }}
          </span>
        </div>
      </div>

      <!-- 3. Solicitudes Pendientes -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <BellRing class="w-6 h-6" :class="solicitudes.length > 0 ? 'animate-bounce' : ''" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solicitudes Distritales</span>
          <span class="text-sm font-black text-slate-900 dark:text-white">{{ solicitudes.length }} pendientes</span>
          <span class="block text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
            {{ solicitudes.length > 0 ? 'Requieren tu atención' : 'Bandeja al día' }}
          </span>
        </div>
      </div>

      <!-- 4. Cobertura Institucional -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center shrink-0">
          <ShieldCheck class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Control Operativo</span>
          <span class="text-sm font-black text-slate-900 dark:text-white">Auditoría 2027</span>
          <span class="block text-[11px] text-slate-400 font-medium mt-0.5">IECM Ciudad de México</span>
        </div>
      </div>
    </div>

    <!-- Contenido en Dos Columnas -->
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="space-y-6">
        <!-- Configuración Global -->
        <AppCard>
          <template #header>
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Configuración Global (Todos los Distritos)</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Periodo general aplicable para las 33 Direcciones Distritales</p>
              </div>
            </div>
          </template>

          <div v-if="loading" class="py-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado mx-auto"></div></div>

          <form v-else @submit.prevent="saveRestriccion(generalConfig)" class="space-y-5">
            <div class="p-3.5 bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p class="font-bold text-[#6B2D8B] dark:text-purple-300 flex items-center gap-1.5 text-xs">
                <AlertCircle class="w-4 h-4 shrink-0" />
                Regla Automática del Mes Vigente:
              </p>
              <p class="leading-relaxed">
                El sistema mantiene habilitado automáticamente el <strong>mes actual en curso</strong>. Si requieres autorizar un mes anterior o un rango extraordinario para <strong>todos los distritos</strong>, configura este periodo general.
              </p>
            </div>

            <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800">
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-white">Estado del Sistema</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Habilitar o inhabilitar globalmente las fechas</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="generalConfig.habilitado" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Fecha Inicio</label>
                <input type="date" v-model="generalConfig.fecha_inicio" required :disabled="!generalConfig.habilitado" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-iecm-morado focus:ring-iecm-morado disabled:opacity-50 text-slate-800 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Fecha Fin</label>
                <input type="date" v-model="generalConfig.fecha_fin" required :disabled="!generalConfig.habilitado" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-iecm-morado focus:ring-iecm-morado disabled:opacity-50 text-slate-800 dark:text-white" />
              </div>
            </div>

            <button type="submit" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#6B2D8B] to-purple-700 hover:from-purple-800 hover:to-[#5B2577] text-white rounded-xl transition-all font-bold text-xs shadow-sm cursor-pointer">
              <Save class="w-4 h-4" />
              <span>Guardar Configuración Global</span>
            </button>
          </form>
        </AppCard>

        <!-- Manual de Usuario Config (Solo Super Administrador) -->
        <AppCard v-if="authStore.isSuperAdmin">
          <template #header>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Manual de Usuario y Avisos en Login</h2>
          </template>
          <div v-if="manualLoading" class="py-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado mx-auto"></div></div>
          <div v-else class="space-y-4">
            <!-- Visibilidad del Manual -->
            <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800">
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-white">Visibilidad del Manual</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Permitir a los usuarios descargar el manual operativo</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="manualHabilitado" @change="saveManualStatus" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <!-- Alerta en Login -->
            <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800">
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-white">Aviso informativo en inicio de sesión</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Mostrar modal recordatorio al ingresar al sistema</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="alertaLoginHabilitada" @change="saveAlertaLoginStatus" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <!-- Última Actualización de Código -->
            <div class="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-bold text-sm text-slate-900 dark:text-white">Etiqueta de Última Modificación</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Mostrar fecha de actualización del código en el menú lateral</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="ultimaActHabilitada" @change="saveUltimaActStatus" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div v-if="ultimaActHabilitada" class="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div class="flex gap-2">
                  <input type="date" v-model="ultimaActFecha" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs focus:border-iecm-morado focus:ring-iecm-morado flex-1 text-slate-800 dark:text-white" />
                  <button type="button" @click="saveUltimaActStatus" class="px-3.5 py-1.5 bg-[#6B2D8B] hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Columna 2: Habilitaciones por Distrito y Solicitudes -->
      <div class="space-y-6">
        <!-- Habilitaciones por Distrito (Excepciones) -->
        <AppCard>
          <template #header>
            <div class="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Habilitaciones por Distrito</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Permisos especiales y ventanas extraordinarias</p>
              </div>
              <button 
                type="button" 
                @click="abrirModalNuevaExcepcion(0, false)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#6B2D8B] dark:bg-purple-950/60 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Habilitar Distrito</span>
              </button>
            </div>
          </template>

          <div v-if="loading" class="py-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado mx-auto"></div></div>
          
          <div v-else-if="excepcionesDistritales.length === 0" class="text-center py-12 text-slate-400 dark:text-slate-500">
            <Building class="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p class="text-xs font-bold">No hay excepciones distritales configuradas</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Todos los distritos operan bajo el periodo general.</p>
          </div>

          <div v-else class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            <div 
              v-for="exc in excepcionesDistritales" 
              :key="exc.id" 
              class="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-purple-300 dark:hover:border-purple-700 transition-colors shadow-2xs"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 font-black text-xs border border-purple-200 dark:border-purple-800">
                  D{{ exc.idsede }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-slate-900 dark:text-white">Distrito {{ exc.idsede }}</span>
                    <span
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border"
                      :class="exc.modulo === 'programacion' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'"
                    >
                      {{ exc.modulo === 'programacion' ? 'Programación' : 'Captura' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Periodo autorizado: <strong class="text-slate-800 dark:text-slate-200">{{ exc.fecha_inicio }}</strong> al <strong class="text-slate-800 dark:text-slate-200">{{ exc.fecha_fin }}</strong>
                  </p>
                  <p v-if="exc.fecha_limite" class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    <span>Ventana disponible hasta: <strong>{{ exc.fecha_limite }}</strong></span>
                  </p>
                </div>
              </div>

              <button 
                type="button"
                @click="deleteRestriccion(exc)"
                class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Revocar excepción para este distrito"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </AppCard>

        <!-- Solicitudes de Excepción de Distritos -->
        <AppCard>
          <template #header>
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Solicitudes de Distritos</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Peticiones de operadores para habilitar fechas extemporáneas</p>
              </div>
              <span v-if="solicitudes.length > 0" class="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {{ solicitudes.length }} pendientes
              </span>
            </div>
          </template>

          <div class="space-y-4">
            <div v-if="loading" class="py-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado mx-auto"></div></div>
            <div v-else-if="solicitudes.length === 0" class="text-center py-10 text-slate-400 dark:text-slate-500">
              <CheckCircle class="w-10 h-10 mx-auto opacity-20 mb-2" />
              <p class="text-xs font-bold">No hay solicitudes pendientes de distritos</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Todas las peticiones han sido atendidas.</p>
            </div>
            <div v-else class="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              <div v-for="sol in solicitudes" :key="sol.id" class="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 relative shadow-2xs">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h3 class="font-bold text-amber-900 dark:text-amber-300 text-xs">{{ sol.titulo }}</h3>
                    <p class="text-xs text-amber-700 dark:text-amber-400 mt-1">{{ sol.mensaje }}</p>
                  </div>
                </div>
                <div class="flex gap-2 mt-3">
                  <button @click="handleAprobarSolicitud(sol)" class="flex-1 flex justify-center items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer shadow-xs">
                    <CheckCircle class="w-3.5 h-3.5" />
                    <span>Aprobar y Habilitar</span>
                  </button>
                  <button @click="handleRechazarSolicitud(sol)" class="flex-1 flex justify-center items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer">
                    <XCircle class="w-3.5 h-3.5" />
                    <span>Descartar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Modal Interactivo para Habilitar Mes Completo o Días Especiales -->
    <ModalHabilitarFechas
      :open="modalHabilitarOpen"
      :initial-sede="modalHabilitarSede"
      :allow-global="modalAllowGlobal"
      :title="modalHabilitarTitulo"
      @close="modalHabilitarOpen = false"
      @saved="() => { modalHabilitarOpen = false; fetchRestricciones(); fetchSolicitudes(); }"
    />
  </div>
</template>
