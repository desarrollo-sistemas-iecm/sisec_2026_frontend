<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  CalendarDays, Save, CheckCircle, XCircle, Plus, Trash2, ShieldCheck,
  AlertCircle, Building, CalendarRange, Clock, Sparkles, Filter, BellRing,
  CheckCircle2, RefreshCw, BookOpen, FileText, Bell, Info, Pencil, Globe
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

// Agrupar excepciones de captura y programación para no duplicar tarjetas
const excepcionesAgrupadas = computed(() => {
  const map = new Map()
  for (const item of restricciones.value) {
    if (!['captura', 'programacion', 'ambos'].includes(item.modulo)) continue
    
    const key = `${item.idsede}_${item.fecha_inicio}_${item.fecha_fin}_${item.fecha_limite}`
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        ids: [item.id],
        modulos: [item.modulo]
      })
    } else {
      const existing = map.get(key)
      existing.ids.push(item.id)
      if (!existing.modulos.includes(item.modulo)) {
        existing.modulos.push(item.modulo)
      }
    }
  }

  return Array.from(map.values()).map(exp => {
    let moduloLabel = 'Captura'
    if ((exp.modulos.includes('captura') && exp.modulos.includes('programacion')) || exp.modulos.includes('ambos')) {
      moduloLabel = 'Ambos (Captura y Prog.)'
    } else if (exp.modulos.includes('programacion')) {
      moduloLabel = 'Solo Programación'
    } else {
      moduloLabel = 'Solo Captura'
    }

    const isGlobal = Number(exp.idsede) === 0
    return {
      ...exp,
      moduloLabel,
      isGlobal,
      isAmbos: (exp.modulos.includes('captura') && exp.modulos.includes('programacion')) || exp.modulos.includes('ambos'),
      tituloSede: isGlobal ? 'Todos los Distritos (Habilitación General)' : `Distrito ${exp.idsede}`
    }
  }).sort((a, b) => {
    if (a.isGlobal && !b.isGlobal) return -1
    if (!a.isGlobal && b.isGlobal) return 1
    return Number(a.idsede) - Number(b.idsede)
  })
})

const distritosConExcepcionCount = computed(() => {
  const hasGlobal = excepcionesAgrupadas.value.some(e => e.isGlobal)
  if (hasGlobal) return 33
  const set = new Set(excepcionesAgrupadas.value.filter(e => !e.isGlobal).map(r => Number(r.idsede)))
  return set.size
})

const porcentajeExcepcion = computed(() => {
  return Math.round((distritosConExcepcionCount.value / 33) * 100)
})

// Abrir diálogo interactivo para editar o ampliar los días de la ventana de prórroga
const abrirEditarExcepcion = async (item) => {
  const hoyStr = new Date().toISOString().split('T')[0]
  const currentLim = item.fecha_limite || hoyStr

  const { value: formValues } = await Swal.fire({
    title: `Editar Ventana — ${item.tituloSede}`,
    html: `
      <div class="text-left text-xs space-y-3 font-sans">
        <div class="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl">
          <p class="font-bold text-[#6B2D8B] dark:text-purple-300">Periodo de actividades autorizado:</p>
          <p class="text-slate-700 dark:text-slate-300 font-semibold">${item.fecha_inicio} al ${item.fecha_fin}</p>
          <p class="text-[11px] text-slate-500 mt-1">Módulos permitidos: <strong>${item.moduloLabel}</strong></p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Fecha límite de captura (Fin de prórroga):
          </label>
          <input id="swal-fecha-limite" type="date" value="${currentLim}" min="${hoyStr}" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold" />
        </div>

        <div class="flex items-center gap-2 pt-1">
          <span class="text-[11px] text-slate-500 font-semibold">Ampliar:</span>
          <button type="button" onclick="(() => {
            const d = new Date(); d.setDate(d.getDate() + 3);
            document.getElementById('swal-fecha-limite').value = d.toISOString().split('T')[0];
          })()" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-purple-100 text-[#6B2D8B] border border-slate-200 cursor-pointer transition-colors">+3 días</button>
          <button type="button" onclick="(() => {
            const d = new Date(); d.setDate(d.getDate() + 5);
            document.getElementById('swal-fecha-limite').value = d.toISOString().split('T')[0];
          })()" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-purple-100 text-[#6B2D8B] border border-slate-200 cursor-pointer transition-colors">+5 días</button>
          <button type="button" onclick="(() => {
            const d = new Date(); d.setDate(d.getDate() + 10);
            document.getElementById('swal-fecha-limite').value = d.toISOString().split('T')[0];
          })()" class="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-purple-100 text-[#6B2D8B] border border-slate-200 cursor-pointer transition-colors">+10 días</button>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar Ampliación',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#6B2D8B',
    cancelButtonColor: '#64748b',
    customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg', cancelButton: 'rounded-lg' },
    preConfirm: () => {
      const fl = document.getElementById('swal-fecha-limite').value
      if (!fl) {
        Swal.showValidationMessage('Debes seleccionar una fecha límite válida.')
        return false
      }
      return { fecha_limite: fl }
    }
  })

  if (formValues?.fecha_limite) {
    try {
      const idsParam = item.ids.join(',')
      const { data } = await api.put(`/admin/restricciones/${idsParam}`, {
        fecha_limite: formValues.fecha_limite
      })
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Ventana Ampliada',
          text: `La habilitación para ${item.tituloSede} ahora estará disponible hasta el ${formValues.fecha_limite}.`,
          confirmButtonColor: '#6B2D8B',
          timer: 2000,
          showConfirmButton: false
        })
        await fetchRestricciones()
      }
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.message || 'No se pudo actualizar la fecha límite.', 'error')
    }
  }
}

// Eliminar / revocar una excepción (individual o agrupada)
const deleteRestriccion = async (item) => {
  const result = await Swal.fire({
    title: '¿Revocar habilitación especial?',
    text: `Se eliminará el periodo autorizado para ${item.tituloSede} (${item.moduloLabel}).`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, revocar permiso',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    try {
      const idsParam = item.ids.join(',')
      await api.delete(`/admin/restricciones/${idsParam}`)
      await fetchRestricciones()
      Swal.fire({
        icon: 'success',
        title: 'Habilitación Revocada',
        text: 'La excepción ha sido eliminada con éxito.',
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
    await fetchSistemaCierreConfig()
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

// Cierre y Apertura Programada del Sistema (Inicio de Sesión)
const sistemaCierreConfig = ref({
  activo: false,
  fecha_cierre: '',
  fecha_apertura: '',
  mensaje: 'El sistema se encuentra en periodo de cierre institucional programado conforme a la normativa. Reanudación de operaciones próximamente.'
})
const sistemaCierreLoading = ref(false)
const sistemaCierreSaving = ref(false)

const fetchSistemaCierreConfig = async () => {
  sistemaCierreLoading.value = true
  try {
    const { data } = await api.get('/admin/config-fechas/sistema-cierre')
    if (data?.success && data?.data) {
      sistemaCierreConfig.value = {
        activo: Boolean(data.data.activo),
        fecha_cierre: data.data.fecha_cierre || '',
        fecha_apertura: data.data.fecha_apertura || '',
        mensaje: data.data.mensaje || 'El sistema se encuentra en periodo de cierre institucional programado conforme a la normativa. Reanudación de operaciones próximamente.'
      }
    }
  } catch (error) {
    console.warn('Error al cargar configuración de cierre del sistema:', error)
  } finally {
    sistemaCierreLoading.value = false
  }
}

const saveSistemaCierreConfig = async () => {
  if (sistemaCierreConfig.value.activo) {
    if (!sistemaCierreConfig.value.fecha_cierre || !sistemaCierreConfig.value.fecha_apertura) {
      Swal.fire('Campos requeridos', 'Debes especificar la fecha y hora de cierre y de apertura del sistema.', 'warning')
      return
    }
    if (new Date(sistemaCierreConfig.value.fecha_cierre) <= new Date(sistemaCierreConfig.value.fecha_apertura)) {
      Swal.fire('Fechas inválidas', 'La fecha de apertura debe ser anterior a la fecha de cierre.', 'warning')
      return
    }
  }

  sistemaCierreSaving.value = true
  try {
    const { data } = await api.post('/admin/config-fechas/sistema-cierre', sistemaCierreConfig.value)
    if (data?.success) {
      Swal.fire({
        icon: 'success',
        title: 'Programación Guardada',
        text: 'La ventana de cierre y apertura programada del sistema ha sido guardada con éxito.',
        confirmButtonColor: '#6B2D8B',
        timer: 2000,
        showConfirmButton: false
      })
      await fetchSistemaCierreConfig()
    }
  } catch (error) {
    Swal.fire('Error', 'No se pudo guardar la configuración de cierre del sistema.', 'error')
  } finally {
    sistemaCierreSaving.value = false
  }
}

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
            Habilitación de Fechas 2027
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Control de calendarios, ventanas extraordinarias por distrito, habilitaciones extemporáneas y programación de cierre del sistema.
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
          <span>Habilitar Fechas por Meses Vencidos</span>
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
          :class="!sistemaCierreConfig.activo ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'"
        >
          <CheckCircle2 v-if="!sistemaCierreConfig.activo" class="w-6 h-6 animate-pulse" />
          <XCircle v-else class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operatividad del Sistema</span>
          <span class="text-sm font-black" :class="!sistemaCierreConfig.activo ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
            {{ !sistemaCierreConfig.activo ? 'Sistema Abierto' : 'Cierre Programado' }}
          </span>
          <span class="block text-[11px] text-slate-400 font-medium mt-0.5">
            {{ !sistemaCierreConfig.activo ? 'Mes en curso disponible' : 'Suspensión distrital activa' }}
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

    <!-- 1. Fila Superior: Habilitaciones por Meses Vencidos (Izquierda) y Solicitudes de Distritos (Derecha) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-6">
      <!-- 1.1 Habilitaciones por Meses Vencidos (Excepciones) -->
      <AppCard class="flex flex-col h-full" body-class="flex-1 flex flex-col justify-between">
        <template #header>
          <div class="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Habilitaciones de fechas para programación/captura por meses vencidos</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Permisos institucionales y ventanas de prórroga para registro de actividades fuera del mes corriente</p>
            </div>
            <span v-if="excepcionesAgrupadas.length > 0" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {{ distritosConExcepcionCount === 33 ? '33 distritos habilitados (General)' : `${distritosConExcepcionCount} ${distritosConExcepcionCount === 1 ? 'distrito habilitado' : 'distritos habilitados'}` }}
            </span>
          </div>
        </template>

        <div v-if="loading" class="py-10 text-center my-auto"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado mx-auto"></div></div>
        
        <div v-else-if="excepcionesAgrupadas.length === 0" class="text-center py-10 my-auto text-slate-400 dark:text-slate-500">
          <Building class="w-10 h-10 mx-auto opacity-20 mb-2" />
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300">No hay habilitaciones por meses vencidos activas</p>
          <p class="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
            Todos los distritos operan bajo el periodo del mes vigente. Para autorizar la captura o programación de meses anteriores o un periodo extraordinario, utiliza el botón superior <strong>"Habilitar Fechas por Meses Vencidos"</strong>.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
          <div 
            v-for="exc in excepcionesAgrupadas" 
            :key="exc.ids.join('_')" 
            class="flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-2xs group"
            :class="exc.isGlobal ? 'border-purple-300 dark:border-purple-700 bg-purple-50/40 dark:bg-purple-950/20 col-span-1 sm:col-span-2' : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-purple-300 dark:hover:border-purple-700'"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div 
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs border"
                :class="exc.isGlobal ? 'bg-purple-200 dark:bg-purple-900 text-[#6B2D8B] dark:text-purple-200 border-purple-300' : 'bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 border-purple-200 dark:border-purple-800'"
              >
                <Globe v-if="exc.isGlobal" class="w-5 h-5 text-[#6B2D8B] dark:text-purple-300" />
                <span v-else>D{{ exc.idsede }}</span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {{ exc.tituloSede }}
                  </span>
                  <span
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border shrink-0"
                    :class="{
                      'bg-purple-100 text-[#6B2D8B] border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700': exc.isAmbos,
                      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800': !exc.isAmbos && exc.modulos.includes('programacion'),
                      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800': !exc.isAmbos && exc.modulos.includes('captura')
                    }"
                  >
                    {{ exc.moduloLabel }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <strong class="text-slate-800 dark:text-slate-200">{{ exc.fecha_inicio }}</strong> al <strong class="text-slate-800 dark:text-slate-200">{{ exc.fecha_fin }}</strong>
                </p>
                <p v-if="exc.fecha_limite" class="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <Clock class="w-2.5 h-2.5 shrink-0" />
                  <span class="truncate">Abierto hasta: <strong>{{ exc.fecha_limite }}</strong></span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0 ml-1.5">
              <button 
                type="button"
                @click="abrirEditarExcepcion(exc)"
                class="p-1.5 text-slate-400 hover:text-[#6B2D8B] hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                title="Ampliar o editar días de la habilitación"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                @click="deleteRestriccion(exc)"
                class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Revocar habilitación"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- 1.2 Solicitudes de Distritos -->
      <AppCard class="flex flex-col h-full" body-class="flex-1 flex flex-col justify-between">
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

        <div class="flex-1 flex flex-col justify-between">
          <div v-if="loading" class="py-10 text-center my-auto"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado mx-auto"></div></div>
          <div v-else-if="solicitudes.length === 0" class="text-center py-10 my-auto text-slate-400 dark:text-slate-500">
            <CheckCircle class="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p class="text-xs font-bold text-slate-700 dark:text-slate-300">No hay solicitudes pendientes de distritos</p>
            <p class="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">Todas las peticiones han sido atendidas.</p>
          </div>
          <div v-else class="space-y-3 max-h-[460px] overflow-y-auto pr-1">
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

    <!-- 2. Fila Inferior (Solo Super Administrador): Apertura/Cierre y Manual/Avisos -->
    <div v-if="authStore.isSuperAdmin" class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      <!-- 2.1 Apertura y Cierre Programado del Sistema -->
      <AppCard class="flex flex-col h-full" body-class="flex-1 flex flex-col justify-between">
        <template #header>
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <ShieldCheck class="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Apertura y Cierre Programado del Sistema</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Suspensión temporal del inicio de sesión para cuentas distritales por periodo institucional o fin de ejercicio</p>
              </div>
            </div>
            <span 
              class="px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0"
              :class="sistemaCierreConfig.activo ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
            >
              {{ sistemaCierreConfig.activo ? 'Cierre Distrital Activo' : 'Inactivo' }}
            </span>
          </div>
        </template>

        <form @submit.prevent="saveSistemaCierreConfig" class="flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-3.5">
            <!-- Switch de Activación -->
            <div class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800">
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-white">Bloqueo de Inicio de Sesión Distrital</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Restringe el acceso únicamente a los usuarios distritales durante la ventana establecida</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input type="checkbox" v-model="sistemaCierreConfig.activo" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <!-- Fechas y Horas de Apertura y Cierre -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock class="w-3.5 h-3.5 text-emerald-500" />
                  <span>Fecha y Hora de Apertura</span>
                </label>
                <input 
                  type="datetime-local" 
                  v-model="sistemaCierreConfig.fecha_apertura" 
                  :disabled="!sistemaCierreConfig.activo"
                  required
                  class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50 text-slate-800 dark:text-white" 
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Momento en que se reanuda la operación del sistema</span>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock class="w-3.5 h-3.5 text-red-500" />
                  <span>Fecha y Hora de Cierre</span>
                </label>
                <input 
                  type="datetime-local" 
                  v-model="sistemaCierreConfig.fecha_cierre" 
                  :disabled="!sistemaCierreConfig.activo"
                  required
                  class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500 disabled:opacity-50 text-slate-800 dark:text-white" 
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Momento en que se bloquea el inicio de sesión</span>
              </div>
            </div>

            <!-- Mensaje Institucional a Mostrar en Pantalla de Login -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Mensaje Institucional al Intentar Iniciar Sesión
              </label>
              <textarea 
                v-model="sistemaCierreConfig.mensaje" 
                rows="2" 
                :disabled="!sistemaCierreConfig.activo"
                placeholder="Indica el motivo institucional del cierre y la fecha de reapertura..."
                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs focus:border-iecm-morado focus:ring-iecm-morado disabled:opacity-50 text-slate-800 dark:text-white resize-none"
              ></textarea>
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="sistemaCierreSaving"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl transition-all font-bold text-xs shadow-sm cursor-pointer disabled:opacity-60 mt-3"
          >
            <Save class="w-4 h-4" />
            <span>{{ sistemaCierreSaving ? 'Guardando...' : 'Guardar Programación de Cierre' }}</span>
          </button>
        </form>
      </AppCard>

      <!-- 2.2 Manual de Usuario y Avisos en Login -->
      <AppCard class="flex flex-col h-full" body-class="flex-1 flex flex-col justify-between">
        <template #header>
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <BookOpen class="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Manual de Usuario y Avisos en Login</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Configuración institucional de documentación, avisos emergentes y versión</p>
              </div>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-50 text-[#6B2D8B] border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 shrink-0">
              Super Admin
            </span>
          </div>
        </template>

        <div v-if="manualLoading" class="py-10 text-center my-auto"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-iecm-morado mx-auto"></div></div>
        
        <div v-else class="flex-1 flex flex-col justify-between space-y-3.5">
          <div class="space-y-3">
            <!-- 1. Visibilidad del Manual -->
            <div class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
              <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <FileText class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-bold text-sm text-slate-900 dark:text-white">Visibilidad del Manual de Usuario</p>
                    <span 
                      class="text-[10px] font-bold px-2 py-0.2 rounded-full border"
                      :class="manualHabilitado ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
                    >
                      {{ manualHabilitado ? 'Visible' : 'Oculto' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Permite a los operadores distritales descargar el manual operativo desde el menú lateral</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input type="checkbox" v-model="manualHabilitado" @change="saveManualStatus" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <!-- 2. Alerta en Login -->
            <div class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
              <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Bell class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-bold text-sm text-slate-900 dark:text-white">Aviso Informativo en Inicio de Sesión</p>
                    <span 
                      class="text-[10px] font-bold px-2 py-0.2 rounded-full border"
                      :class="alertaLoginHabilitada ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
                    >
                      {{ alertaLoginHabilitada ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Muestra un modal recordatorio a los usuarios para consultar el manual al ingresar</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input type="checkbox" v-model="alertaLoginHabilitada" @change="saveAlertaLoginStatus" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <!-- 3. Última Actualización de Código -->
            <div class="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-start gap-3">
                  <div class="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-[#6B2D8B] dark:text-purple-300 shrink-0 mt-0.5">
                    <CalendarDays class="w-4 h-4" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-bold text-sm text-slate-900 dark:text-white">Etiqueta de Última Modificación</p>
                      <span 
                        class="text-[10px] font-bold px-2 py-0.2 rounded-full border"
                        :class="ultimaActHabilitada ? 'bg-purple-50 text-[#6B2D8B] border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
                      >
                        {{ ultimaActHabilitada ? 'Visible' : 'Oculto' }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Muestra la fecha de última actualización del sistema en el menú lateral</p>
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input type="checkbox" v-model="ultimaActHabilitada" @change="saveUltimaActStatus" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <!-- Input de fecha cuando está activa -->
              <div v-if="ultimaActHabilitada" class="flex items-center gap-2 pt-2 border-t border-slate-200/90 dark:border-slate-800">
                <input 
                  type="date" 
                  v-model="ultimaActFecha" 
                  class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs focus:border-iecm-morado focus:ring-iecm-morado flex-1 text-slate-800 dark:text-white" 
                />
                <button 
                  type="button" 
                  @click="saveUltimaActStatus" 
                  class="px-3.5 py-1.5 bg-[#6B2D8B] hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Actualizar Fecha
                </button>
              </div>
            </div>
          </div>

          <!-- Pie Institucional Informativo que equilibra perfectamente la altura con la tarjeta izquierda -->
          <div class="mt-auto p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60 flex items-center gap-3">
            <div class="w-7 h-7 rounded-lg bg-[#6B2D8B]/10 dark:bg-[#6B2D8B]/25 flex items-center justify-center shrink-0">
              <Info class="w-4 h-4 text-[#6B2D8B] dark:text-purple-300" />
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-snug">
              <strong class="font-bold text-slate-800 dark:text-white">Ajustes Institucionales:</strong> Las modificaciones se sincronizan automáticamente en tiempo real para todos los usuarios.
            </p>
          </div>
        </div>
      </AppCard>
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
