<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Swal from 'sweetalert2'
import {
  FileSpreadsheet,
  Loader2,
  Download,
  AlertCircle,
  GraduationCap,
  ClipboardCheck,
  History,
  Users,
  Search,
  RotateCcw,
  Calendar,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye
} from '@lucide/vue'
import api from '../services/api.js'
import { useAuthStore } from '../stores/authStore.js'
import { useToast } from '../composables/useToast.js'
import { useGsapAnimations } from '../composables/useGsapAnimations.js'

import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'

const toast = useToast()
const authStore = useAuthStore()
const { animarVista } = useGsapAnimations()
const vistaRef = ref(null)

// ── Permiso del usuario en sesión ────────────────────────────────────────────
const isAdmin = computed(() => Number(authStore.user?.permiso) >= 2)
const userDistrito = computed(() => Number(authStore.user?.idsede || authStore.user?.id_distrito || 1))

// ── Tipos Principales de Reporte ─────────────────────────────────────────────
const TIPOS_REPORTES = [
  {
    id: 'acciones_educativas',
    titulo: 'Acciones Educativas y Afirmativas',
    subtitulo: 'Módulo 2027',
    badge: 'Oficial 2027',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    descripcion: 'Reporte integral con matriz de población beneficiada (5 géneros × 6 edades), horarios y expediente digital.',
    icon: GraduationCap,
    colorClass: 'border-purple-500/80 bg-purple-50/50 dark:bg-purple-950/20 text-[#6B2D8B] dark:text-purple-300',
    activeClass: 'border-[#6B2D8B] bg-purple-50 dark:bg-purple-950/40 ring-2 ring-[#6B2D8B]'
  },
  {
    id: 'encuestas',
    titulo: 'Encuestas de Satisfacción',
    subtitulo: 'Vinculadas a Acciones',
    badge: 'Módulo 2027',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    descripcion: 'Reporte de encuestas ligadas a cada acción afirmativa, con evaluación detallada de preguntas P3 a P8 y satisfacción.',
    icon: ClipboardCheck,
    colorClass: 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    activeClass: 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-600'
  },
  {
    id: 'historico',
    titulo: 'Histórico de Talleres e Intervenciones',
    subtitulo: 'Base Oficial 2024',
    badge: 'sisecycc2024',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    descripcion: 'Estructura oficial de la base histórica con desglose de población femenina y masculina en 8 rangos de edad.',
    icon: History,
    colorClass: 'border-slate-500/80 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300',
    activeClass: 'border-slate-700 dark:border-slate-400 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-600'
  }
]

// ── Estado del Formulario de Filtros ──────────────────────────────────────────
const tipoSeleccionado = ref('acciones_educativas')
const filtroDistrito = ref(isAdmin.value ? 0 : userDistrito.value)
const fechaInic = ref('')
const fechaFin = ref('')

// Distritos 1 a 33
const distritosList = Array.from({ length: 33 }, (_, i) => ({
  id: i + 1,
  label: `Dirección Distrital ${String(i + 1).padStart(2, '0')}`
}))

// ── Estado de Datos y UI ─────────────────────────────────────────────────────
const consultando = ref(false)
const descargando = ref(false)
const reporteData = ref(null)
const paginaActual = ref(1)
const porPagina = ref(15)

// ── KPIs / Resumen del Reporte ────────────────────────────────────────────────
const resumen = computed(() => reporteData.value?.resumen || {})
const registrosTotales = computed(() => reporteData.value?.registros || [])

const registrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * porPagina.value
  return registrosTotales.value.slice(inicio, inicio + porPagina.value)
})

const totalPaginas = computed(() => {
  return Math.ceil(registrosTotales.value.length / porPagina.value) || 1
})

// ── Consultar / Previsualizar Reporte ─────────────────────────────────────────
const consultarReporte = async () => {
  consultando.value = true
  reporteData.value = null
  paginaActual.value = 1

  try {
    const payload = {
      tipo: tipoSeleccionado.value,
      distrito: isAdmin.value ? Number(filtroDistrito.value) : userDistrito.value,
      fechaInic: fechaInic.value || null,
      fechaFin: fechaFin.value || null
    }

    const { data } = await api.post('/reportes/preview', payload)
    if (data.success) {
      reporteData.value = data.data
      if (!data.data.registros || data.data.registros.length === 0) {
        toast.info('No se encontraron registros con los filtros seleccionados.')
      } else {
        toast.success(`Se encontraron ${data.data.registros.length} registros.`)
      }
    }
  } catch (error) {
    console.error('Error al consultar reporte:', error)
    toast.error(error?.response?.data?.message || 'Error al obtener la previsualización del reporte.')
  } finally {
    consultando.value = false
  }
}

// ── Descargar Excel (.xlsx) ──────────────────────────────────────────────────
const descargarExcel = async () => {
  descargando.value = true
  try {
    const payload = {
      tipo: tipoSeleccionado.value,
      distrito: isAdmin.value ? Number(filtroDistrito.value) : userDistrito.value,
      fechaInic: fechaInic.value || null,
      fechaFin: fechaFin.value || null
    }

    const response = await api.post('/reportes/generar', payload, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url

    const hoy = new Date().toISOString().split('T')[0]
    let nombreReporte = 'Reporte'
    if (tipoSeleccionado.value === 'acciones_educativas') nombreReporte = 'Acciones_Educativas_2027'
    if (tipoSeleccionado.value === 'encuestas') nombreReporte = 'Encuestas_Satisfaccion_2027'
    if (tipoSeleccionado.value === 'historico') nombreReporte = 'Historico_Talleres_Intervenciones'

    a.download = `SISEC_${nombreReporte}_${hoy}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Archivo Excel generado y descargado exitosamente.')
  } catch (error) {
    console.error('Error al generar Excel:', error)
    toast.error('No se pudo generar el archivo Excel. Verifica los filtros e intenta de nuevo.')
  } finally {
    descargando.value = false
  }
}

const limpiarFiltros = () => {
  filtroDistrito.value = isAdmin.value ? 0 : userDistrito.value
  fechaInic.value = ''
  fechaFin.value = ''
  reporteData.value = null
  paginaActual.value = 1
}

watch(tipoSeleccionado, () => {
  reporteData.value = null
  paginaActual.value = 1
})

onMounted(() => {
  animarVista(vistaRef.value)
  // Consulta automática inicial
  consultarReporte()
})
</script>

<template>
  <div ref="vistaRef" class="space-y-6">
    <!-- Header Institucional -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60">
            <FileSpreadsheet class="w-3.5 h-3.5" />
            Módulo de Reportería Institucional
          </span>
        </div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Reportes y Estadísticas Oficiales
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Consulta y descarga los reportes integrales de Acciones Educativas 2027, Encuestas de Satisfacción y Base Histórica.
        </p>
      </div>
    </div>

    <!-- 1. SELECTOR DE TIPO DE REPORTE (3 CARDS) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="rep in TIPOS_REPORTES"
        :key="rep.id"
        @click="tipoSeleccionado = rep.id"
        class="relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between group"
        :class="tipoSeleccionado === rep.id ? rep.activeClass : 'bg-white dark:bg-iecm-dark-header border-slate-200 dark:border-white/10 hover:border-slate-300'"
      >
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border" :class="rep.badgeClass">
              {{ rep.badge }}
            </span>
            <div
              class="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              :class="rep.colorClass"
            >
              <component :is="rep.icon" class="w-4 h-4" />
            </div>
          </div>
          <h3 class="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            {{ rep.titulo }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
            {{ rep.descripcion }}
          </p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold">
          <span :class="tipoSeleccionado === rep.id ? 'text-[#6B2D8B] dark:text-purple-300' : 'text-slate-400'">
            {{ tipoSeleccionado === rep.id ? '● Reporte Activo' : 'Seleccionar reporte' }}
          </span>
          <CheckCircle2
            v-if="tipoSeleccionado === rep.id"
            class="w-4 h-4 text-[#6B2D8B] dark:text-purple-300"
          />
        </div>
      </div>
    </div>

    <!-- 2. BARRA DE FILTROS Y ACCIONES -->
    <AppCard class="border-slate-200/80 dark:border-white/10 shadow-xs">
      <div class="p-4 space-y-4">
        <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter class="w-4 h-4 text-purple-600" />
            Filtros de Búsqueda
          </span>
          <button
            type="button"
            @click="limpiarFiltros"
            class="text-xs font-semibold text-slate-500 hover:text-purple-600 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Filtro Distrito -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Dirección Distrital
            </label>
            <select
              v-model="filtroDistrito"
              :disabled="!isAdmin"
              class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-iecm-morado focus:ring-2 focus:ring-iecm-morado/20 disabled:opacity-70 transition-all font-medium cursor-pointer"
            >
              <option :value="0" v-if="isAdmin">Todos los Distritos (1 al 33)</option>
              <option v-for="d in distritosList" :key="d.id" :value="d.id">
                {{ d.label }}
              </option>
            </select>
            <span v-if="!isAdmin" class="text-[10px] text-slate-400 mt-1 block">
              Bloqueado a tu distrito asignado
            </span>
          </div>

          <!-- Filtro Fecha Inicio -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Fecha Inicio (ej. 2026-11-23)
            </label>
            <input
              v-model="fechaInic"
              type="date"
              placeholder="AAAA-MM-DD"
              class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-iecm-morado focus:ring-2 focus:ring-iecm-morado/20 transition-all font-medium"
            />
          </div>

          <!-- Filtro Fecha Fin -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Fecha Fin (ej. 2026-11-23)
            </label>
            <input
              v-model="fechaFin"
              type="date"
              placeholder="AAAA-MM-DD"
              class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-iecm-morado focus:ring-2 focus:ring-iecm-morado/20 transition-all font-medium"
            />
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-end gap-2">
            <AppButton
              variant="primary"
              size="md"
              :loading="consultando"
              class="flex-1 bg-[#6B2D8B] hover:bg-[#582472] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              @click="consultarReporte"
            >
              <template #icon v-if="!consultando"><Search class="w-4 h-4" /></template>
              Consultar
            </AppButton>

            <AppButton
              variant="success"
              size="md"
              :loading="descargando"
              class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              @click="descargarExcel"
            >
              <template #icon v-if="!descargando"><Download class="w-4 h-4" /></template>
              Excel (.xlsx)
            </AppButton>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- 3. RESUMEN / KPIS SEGÚN EL REPORTE -->
    <div v-if="reporteData" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- KPIs para Acciones Educativas -->
      <template v-if="tipoSeleccionado === 'acciones_educativas'">
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-purple-200 dark:border-purple-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Acciones</span>
          <span class="text-xl font-black text-[#6B2D8B] dark:text-purple-300">{{ resumen.totalAcciones || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-emerald-200 dark:border-emerald-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Total Beneficiados</span>
          <span class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ resumen.totalGeneral || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-pink-200 dark:border-pink-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Mujeres</span>
          <span class="text-xl font-black text-pink-600 dark:text-pink-400">{{ resumen.totalMujeres || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-blue-200 dark:border-blue-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Hombres</span>
          <span class="text-xl font-black text-blue-600 dark:text-blue-400">{{ resumen.totalHombres || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-violet-200 dark:border-violet-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Otras Identidades</span>
          <span class="text-xl font-black text-violet-600 dark:text-violet-400">{{ resumen.totalOtras || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-purple-200 dark:border-purple-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Encuestas Sistema</span>
          <span class="text-xl font-black text-purple-700 dark:text-purple-300">{{ resumen.totalEncuestas || 0 }}</span>
        </div>
      </template>

      <!-- KPIs para Encuestas -->
      <template v-else-if="tipoSeleccionado === 'encuestas'">
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-emerald-200 dark:border-emerald-900/50 rounded-xl shadow-xs col-span-2">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Total Encuestas Aplicadas</span>
          <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ resumen.totalEncuestas || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-purple-200 dark:border-purple-900/50 rounded-xl shadow-xs col-span-2">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Promedio General Satisfacción</span>
          <div class="flex items-center gap-2">
            <span class="text-2xl font-black text-[#6B2D8B] dark:text-purple-300">{{ resumen.promedioGlobal || 0 }}</span>
            <span class="text-xs font-semibold text-slate-400">/ 5.0</span>
          </div>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-pink-200 dark:border-pink-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Mujeres Evaluadas</span>
          <span class="text-xl font-black text-pink-600">{{ resumen.distribucionGenero?.mujeres || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-blue-200 dark:border-blue-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Hombres Evaluados</span>
          <span class="text-xl font-black text-blue-600">{{ resumen.distribucionGenero?.hombres || 0 }}</span>
        </div>
      </template>

      <!-- KPIs para Histórico -->
      <template v-else-if="tipoSeleccionado === 'historico'">
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs col-span-2">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Actividades Registradas</span>
          <span class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ resumen.totalActividades || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-teal-200 dark:border-teal-900/50 rounded-xl shadow-xs col-span-2">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Población Total</span>
          <span class="text-2xl font-black text-teal-600 dark:text-teal-400">{{ resumen.totalGeneral || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-pink-200 dark:border-pink-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Mujeres</span>
          <span class="text-xl font-black text-pink-600">{{ resumen.totalMujeres || 0 }}</span>
        </div>
        <div class="p-3.5 bg-white dark:bg-iecm-dark-header border border-blue-200 dark:border-blue-900/50 rounded-xl shadow-xs">
          <span class="text-[11px] font-bold text-slate-500 uppercase block">Hombres</span>
          <span class="text-xl font-black text-blue-600">{{ resumen.totalHombres || 0 }}</span>
        </div>
      </template>
    </div>

    <!-- 4. TABLA DE PREVISUALIZACIÓN CON SECCIONES EN COLOR -->
    <AppCard class="border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="consultando" class="p-16 flex flex-col items-center justify-center text-center">
        <Loader2 class="w-10 h-10 text-[#6B2D8B] animate-spin mb-3" />
        <h4 class="text-base font-bold text-slate-800 dark:text-slate-100">Cargando datos del reporte...</h4>
        <p class="text-xs text-slate-400">Procesando registros de la base de datos.</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!reporteData || registrosTotales.length === 0" class="p-16 text-center">
        <AlertCircle class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h4 class="text-base font-bold text-slate-700 dark:text-slate-300">No hay registros disponibles</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
          Modifica los filtros de distrito o fechas y presiona "Consultar" para ver los datos.
        </p>
      </div>

      <!-- Tabla de Datos -->
      <div v-else class="overflow-x-auto">
        <!-- ── TABLA 1: ACCIONES EDUCATIVAS ─────────────────────────────── -->
        <table v-if="tipoSeleccionado === 'acciones_educativas'" class="w-full text-xs text-left border-collapse min-w-[1300px]">
          <thead>
            <!-- Fila Superior de Categorías con Colores Temáticos -->
            <tr class="text-[10px] uppercase font-black tracking-wider text-white">
              <th colspan="7" class="p-2.5 text-center bg-[#6B2D8B] border-r border-purple-800/60">
                1. Datos Generales de la Acción
              </th>
              <th colspan="7" class="p-2.5 text-center bg-pink-600 border-r border-pink-700/60">
                2. Población Beneficiada - Mujeres
              </th>
              <th colspan="7" class="p-2.5 text-center bg-blue-600 border-r border-blue-700/60">
                3. Población Beneficiada - Hombres
              </th>
              <th colspan="4" class="p-2.5 text-center bg-purple-700 border-r border-purple-800/60">
                4. Otras Identidades
              </th>
              <th class="p-2.5 text-center bg-emerald-600 border-r border-emerald-700/60">
                Total
              </th>
              <th colspan="3" class="p-2.5 text-center bg-slate-700">
                5. Expediente Digital
              </th>
            </tr>
            <!-- Fila Inferior de Columnas -->
            <tr class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border-b border-slate-200 dark:border-white/10">
              <th class="p-2.5 pl-3">#</th>
              <th class="p-2.5">Folio Oficial</th>
              <th class="p-2.5">Distrito</th>
              <th class="p-2.5 min-w-[200px]">Acción Educativa</th>
              <th class="p-2.5">Modalidad</th>
              <th class="p-2.5">Fecha / Horas</th>
              <th class="p-2.5">Estado</th>
              <!-- Mujeres -->
              <th class="p-2 text-center text-pink-700 dark:text-pink-300">0-12</th>
              <th class="p-2 text-center text-pink-700 dark:text-pink-300">13-17</th>
              <th class="p-2 text-center text-pink-700 dark:text-pink-300">18-29</th>
              <th class="p-2 text-center text-pink-700 dark:text-pink-300">30-44</th>
              <th class="p-2 text-center text-pink-700 dark:text-pink-300">45-59</th>
              <th class="p-2 text-center text-pink-700 dark:text-pink-300">60+</th>
              <th class="p-2 text-center font-black bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300">Tot M</th>
              <!-- Hombres -->
              <th class="p-2 text-center text-blue-700 dark:text-blue-300">0-12</th>
              <th class="p-2 text-center text-blue-700 dark:text-blue-300">13-17</th>
              <th class="p-2 text-center text-blue-700 dark:text-blue-300">18-29</th>
              <th class="p-2 text-center text-blue-700 dark:text-blue-300">30-44</th>
              <th class="p-2 text-center text-blue-700 dark:text-blue-300">45-59</th>
              <th class="p-2 text-center text-blue-700 dark:text-blue-300">60+</th>
              <th class="p-2 text-center font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">Tot H</th>
              <!-- Otras -->
              <th class="p-2 text-center">No Bin.</th>
              <th class="p-2 text-center">Otro</th>
              <th class="p-2 text-center">PND</th>
              <th class="p-2 text-center font-black bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">Tot O</th>
              <!-- Total -->
              <th class="p-2 text-center font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200">Total</th>
              <!-- Evidencias -->
              <th class="p-2 text-center">Reg.</th>
              <th class="p-2 text-center">Foto</th>
              <th class="p-2 text-center">Enc. Sist.</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr
              v-for="r in registrosPaginados"
              :key="r.id_acciones_educativas"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td class="p-2.5 pl-3 font-mono text-slate-400">{{ r.num }}</td>
              <td class="p-2.5 font-mono font-bold text-[#6B2D8B] dark:text-purple-300">{{ r.folio_accion_educativa }}</td>
              <td class="p-2.5 font-bold text-slate-700 dark:text-slate-300">DD{{ String(r.id_distrito).padStart(2, '0') }}</td>
              <td class="p-2.5 font-medium text-slate-800 dark:text-slate-200">{{ r.nombre_accion }}</td>
              <td class="p-2.5">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="r.modalidad === 1 ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                >
                  {{ r.modalidad_texto }}
                </span>
              </td>
              <td class="p-2.5 text-slate-500 font-mono text-[11px]">
                {{ r.fecha_realizacion }}<br>
                <small class="text-slate-400 font-sans">Prog: {{ r.hora_programada }} | Real: {{ r.duracion_real }}</small>
              </td>
              <td class="p-2.5">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="{
                    'bg-emerald-50 text-emerald-700 border border-emerald-200': r.id_estado === 3,
                    'bg-blue-50 text-blue-700 border border-blue-200': r.id_estado === 2,
                    'bg-amber-50 text-amber-700 border border-amber-200': r.id_estado === 1
                  }"
                >
                  {{ r.estado_texto }}
                </span>
              </td>
              <!-- Mujeres -->
              <td class="p-2 text-center text-pink-600 font-medium">{{ r.m_1 }}</td>
              <td class="p-2 text-center text-pink-600 font-medium">{{ r.m_2 }}</td>
              <td class="p-2 text-center text-pink-600 font-medium">{{ r.m_3 }}</td>
              <td class="p-2 text-center text-pink-600 font-medium">{{ r.m_4 }}</td>
              <td class="p-2 text-center text-pink-600 font-medium">{{ r.m_5 }}</td>
              <td class="p-2 text-center text-pink-600 font-medium">{{ r.m_6 }}</td>
              <td class="p-2 text-center font-bold bg-pink-50/70 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300">{{ r.total_mujeres }}</td>
              <!-- Hombres -->
              <td class="p-2 text-center text-blue-600 font-medium">{{ r.h_1 }}</td>
              <td class="p-2 text-center text-blue-600 font-medium">{{ r.h_2 }}</td>
              <td class="p-2 text-center text-blue-600 font-medium">{{ r.h_3 }}</td>
              <td class="p-2 text-center text-blue-600 font-medium">{{ r.h_4 }}</td>
              <td class="p-2 text-center text-blue-600 font-medium">{{ r.h_5 }}</td>
              <td class="p-2 text-center text-blue-600 font-medium">{{ r.h_6 }}</td>
              <td class="p-2 text-center font-bold bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">{{ r.total_hombres }}</td>
              <!-- Otras -->
              <td class="p-2 text-center text-purple-600">{{ r.total_no_binario }}</td>
              <td class="p-2 text-center text-purple-600">{{ r.total_otro }}</td>
              <td class="p-2 text-center text-purple-600">{{ r.total_pnd }}</td>
              <td class="p-2 text-center font-bold bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">{{ r.total_otras }}</td>
              <!-- Total -->
              <td class="p-2 text-center font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">{{ r.total_general }}</td>
              <!-- Evidencias -->
              <td class="p-2 text-center">
                <span :class="r.tiene_registro === 'SI' ? 'text-emerald-600 font-bold' : 'text-slate-300'">{{ r.tiene_registro }}</span>
              </td>
              <td class="p-2 text-center">
                <span :class="r.tiene_foto === 'SI' ? 'text-emerald-600 font-bold' : 'text-slate-300'">{{ r.tiene_foto }}</span>
              </td>
              <td class="p-2 text-center font-bold text-purple-700 dark:text-purple-300">
                {{ r.total_encuestas_sistema }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- ── TABLA 2: ENCUESTAS DE SATISFACCIÓN ────────────────────────── -->
        <table v-else-if="tipoSeleccionado === 'encuestas'" class="w-full text-xs text-left border-collapse min-w-[1100px]">
          <thead>
            <tr class="text-[10px] uppercase font-black tracking-wider text-white">
              <th colspan="4" class="p-2.5 text-center bg-[#6B2D8B] border-r border-purple-800/60">
                Acción Educativa Vinculada
              </th>
              <th colspan="5" class="p-2.5 text-center bg-blue-600 border-r border-blue-700/60">
                Datos de la Encuesta y Asistente
              </th>
              <th colspan="8" class="p-2.5 text-center bg-emerald-600">
                Calificación de Preguntas (1 a 5) y Nivel de Satisfacción
              </th>
            </tr>
            <tr class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border-b border-slate-200 dark:border-white/10">
              <th class="p-2.5 pl-3">Folio Acción</th>
              <th class="p-2.5">Distrito</th>
              <th class="p-2.5 min-w-[200px]">Acción Educativa</th>
              <th class="p-2.5">Fecha Acción</th>
              <th class="p-2.5">Folio Encuesta</th>
              <th class="p-2 text-center">#</th>
              <th class="p-2 text-center">Edad</th>
              <th class="p-2.5">Género</th>
              <th class="p-2.5">Fecha Registro</th>
              <th class="p-2 text-center text-emerald-700">P3</th>
              <th class="p-2 text-center text-emerald-700">P4</th>
              <th class="p-2 text-center text-emerald-700">P5</th>
              <th class="p-2 text-center text-emerald-700">P6</th>
              <th class="p-2 text-center text-emerald-700">P7</th>
              <th class="p-2 text-center text-emerald-700">P8</th>
              <th class="p-2.5 text-center font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200">Promedio</th>
              <th class="p-2.5 text-center">Nivel</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr
              v-for="r in registrosPaginados"
              :key="r.id_encuestas"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td class="p-2.5 pl-3 font-mono font-bold text-[#6B2D8B] dark:text-purple-300">{{ r.folio_accion_educativa }}</td>
              <td class="p-2.5 font-bold text-slate-700 dark:text-slate-300">DD{{ String(r.id_distrito).padStart(2, '0') }}</td>
              <td class="p-2.5 font-medium text-slate-800 dark:text-slate-200">{{ r.nombre_accion }}</td>
              <td class="p-2.5 text-slate-500 font-mono">{{ r.fecha_accion }}</td>
              <td class="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">{{ r.folio_encuesta }}</td>
              <td class="p-2 text-center font-mono text-slate-400">{{ r.consecutivo_encuesta }}</td>
              <td class="p-2 text-center font-medium">{{ r.edad }}</td>
              <td class="p-2.5 font-medium">{{ r.genero }}</td>
              <td class="p-2.5 text-slate-500 font-mono">{{ r.fecha_registro }}</td>
              <td class="p-2 text-center font-medium text-slate-700 dark:text-slate-300">{{ r.p3 }}</td>
              <td class="p-2 text-center font-medium text-slate-700 dark:text-slate-300">{{ r.p4 }}</td>
              <td class="p-2 text-center font-medium text-slate-700 dark:text-slate-300">{{ r.p5 }}</td>
              <td class="p-2 text-center font-medium text-slate-700 dark:text-slate-300">{{ r.p6 }}</td>
              <td class="p-2 text-center font-medium text-slate-700 dark:text-slate-300">{{ r.p7 }}</td>
              <td class="p-2 text-center font-medium text-slate-700 dark:text-slate-300">{{ r.p8 }}</td>
              <td class="p-2.5 text-center font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                {{ r.promedio_satisfaccion }}
              </td>
              <td class="p-2.5 text-center">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="r.nivel_satisfaccion === 'Excelente' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'"
                >
                  {{ r.nivel_satisfaccion }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- ── TABLA 3: HISTÓRICO DE TALLERES (FORMATO OFICIAL) ────────── -->
        <table v-else-if="tipoSeleccionado === 'historico'" class="w-full text-xs text-left border-collapse min-w-[1200px]">
          <thead>
            <tr class="bg-slate-700 text-white text-[11px] font-bold border-b border-slate-600">
              <th class="p-2 pl-3 text-center">#</th>
              <th class="p-2 text-center">DISTRI</th>
              <th class="p-2 text-center">ID</th>
              <th class="p-2 min-w-[220px]">TALLER O INTERVENCIÓN</th>
              <th class="p-2 text-center">PRESENC</th>
              <th class="p-2 text-center">VIRTU</th>
              <th class="p-2 min-w-[160px]">INSTITUCIÓN</th>
              <th class="p-2 text-center">GÉNERO</th>
              <!-- 8 Rangos de Edad -->
              <th class="p-2 text-center bg-slate-800">0-12</th>
              <th class="p-2 text-center bg-slate-800">13-16</th>
              <th class="p-2 text-center bg-slate-800">17-20</th>
              <th class="p-2 text-center bg-slate-800">21-30</th>
              <th class="p-2 text-center bg-slate-800">31-40</th>
              <th class="p-2 text-center bg-slate-800">41-50</th>
              <th class="p-2 text-center bg-slate-800">51-61</th>
              <th class="p-2 text-center bg-slate-800">>62</th>
              <th class="p-2 text-center bg-teal-800 font-black">TOT</th>
              <th class="p-2 text-center">DURACIÓN</th>
              <th class="p-2 text-center">FECHA</th>
              <th class="p-2">COMENTARIOS</th>
              <th class="p-2 text-center">CONVENIO</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-white/10 font-sans">
            <!-- 2 filas por actividad (Mujeres M y Hombres H) -->
            <template v-for="r in registrosPaginados" :key="r.idcurso">
              <!-- Fila Mujeres M -->
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors bg-white dark:bg-iecm-dark-header">
                <td rowspan="2" class="p-2 pl-3 text-center font-mono font-bold text-slate-400 border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.num }}
                </td>
                <td rowspan="2" class="p-2 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.id_distrito }}
                </td>
                <td rowspan="2" class="p-2 text-center font-mono font-bold text-[#6B2D8B] dark:text-purple-300 border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.idcurso }}
                </td>
                <td rowspan="2" class="p-2 font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.curso }}
                </td>
                <td rowspan="2" class="p-2 text-center font-bold text-slate-600 border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.presencial }}
                </td>
                <td rowspan="2" class="p-2 text-center font-bold text-slate-600 border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.virtual }}
                </td>
                <td rowspan="2" class="p-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.institucion }}
                </td>
                <!-- Género M -->
                <td class="p-2 text-center font-bold text-pink-600 bg-pink-50/60 dark:bg-pink-950/30 border-r border-slate-200 dark:border-white/10">
                  M
                </td>
                <!-- 8 Rangos M -->
                <td class="p-2 text-center text-pink-600">{{ r.m1 }}</td>
                <td class="p-2 text-center text-pink-600">{{ r.m2 }}</td>
                <td class="p-2 text-center text-pink-600">{{ r.m3 }}</td>
                <td class="p-2 text-center text-pink-600">{{ r.m4 }}</td>
                <td class="p-2 text-center text-pink-600">{{ r.m5 }}</td>
                <td class="p-2 text-center text-pink-600">{{ r.m6 }}</td>
                <td class="p-2 text-center text-pink-600">{{ r.m7 }}</td>
                <td class="p-2 text-center text-pink-600">{{ r.m8 }}</td>
                <td class="p-2 text-center font-black bg-pink-100/70 dark:bg-pink-950/60 text-pink-800 dark:text-pink-200 border-r border-slate-200 dark:border-white/10">
                  {{ r.total_m }}
                </td>
                <td rowspan="2" class="p-2 text-center font-mono font-medium border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.duracion_formato }}
                </td>
                <td rowspan="2" class="p-2 text-center font-mono border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.fecha }}
                </td>
                <td rowspan="2" class="p-2 text-slate-500 text-[11px] border-r border-slate-200 dark:border-white/10 align-middle">
                  {{ r.comentarios }}
                </td>
                <td rowspan="2" class="p-2 text-center font-bold align-middle" :class="r.convenio === 'SI' ? 'text-emerald-600' : 'text-slate-400'">
                  {{ r.convenio }}
                </td>
              </tr>
              <!-- Fila Hombres H -->
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors bg-white dark:bg-iecm-dark-header border-b-2 border-slate-200 dark:border-white/10">
                <!-- Género H -->
                <td class="p-2 text-center font-bold text-blue-600 bg-blue-50/60 dark:bg-blue-950/30 border-r border-slate-200 dark:border-white/10">
                  H
                </td>
                <!-- 8 Rangos H -->
                <td class="p-2 text-center text-blue-600">{{ r.h1 }}</td>
                <td class="p-2 text-center text-blue-600">{{ r.h2 }}</td>
                <td class="p-2 text-center text-blue-600">{{ r.h3 }}</td>
                <td class="p-2 text-center text-blue-600">{{ r.h4 }}</td>
                <td class="p-2 text-center text-blue-600">{{ r.h5 }}</td>
                <td class="p-2 text-center text-blue-600">{{ r.h6 }}</td>
                <td class="p-2 text-center text-blue-600">{{ r.h7 }}</td>
                <td class="p-2 text-center text-blue-600">{{ r.h8 }}</td>
                <td class="p-2 text-center font-black bg-blue-100/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-r border-slate-200 dark:border-white/10">
                  {{ r.total_h }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Footer Paginación -->
      <div v-if="reporteData && registrosTotales.length > 0" class="p-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
        <span class="text-xs text-slate-500 font-medium">
          Mostrando {{ registrosPaginados.length }} de {{ registrosTotales.length }} registros totales
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="paginaActual <= 1"
            @click="paginaActual--"
            class="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <ChevronLeft class="w-3.5 h-3.5" /> Anterior
          </button>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-200 px-2 font-mono">
            Pág. {{ paginaActual }} de {{ totalPaginas }}
          </span>
          <button
            type="button"
            :disabled="paginaActual >= totalPaginas"
            @click="paginaActual++"
            class="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            Siguiente <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </AppCard>
  </div>
</template>
