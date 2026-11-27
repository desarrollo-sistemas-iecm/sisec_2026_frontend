<script setup>
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import {
  LayoutDashboard, Users, CalendarCheck, BarChart2, ClipboardList,
  FileText, FileDown, CheckCircle2, AlertCircle, Clock, Send,
  Download, ArrowUpRight, ShieldCheck, Sparkles, Filter, RefreshCw,
  FolderArchive, Building2, CheckCircle, Flame, Calendar, Target,
  TrendingUp
} from '@lucide/vue'
import gsap from 'gsap'
import { useGsapAnimations } from '../composables/useGsapAnimations.js'
import { useAuth } from '../composables/useAuth.js'
import { useToast } from '../composables/useToast.js'
import { getSocket } from '../services/socket.js'
import { useThemeStore } from '../stores/themeStore.js'
import api from '../services/api.js'

import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, BarElement,
  CategoryScale, LinearScale
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const { authStore } = useAuth()
const toast = useToast()
const themeStore = useThemeStore()

const isAdministrador = computed(() => authStore.isAdmin || authStore.isSuperAdmin)

// Estado reactivo de métricas
const stats = ref({
  total_acciones: 0,
  sin_capturar: 0,
  capturadas: 0,
  finalizadas: 0,
  total_capturadas: 0,
  total_encuestas: 0,
  actividades_realizadas: 0,
  actividades_pendientes: 0,
  grafica_distritos: []
})

const isLoading = ref(true)
const isLiveUpdating = ref(false)
const chartFilter = ref('todos') // 'todos' | 'top10' | 'pendientes'

// Filtros temporales para la gráfica
const filterAnio = ref('')
const filterMes = ref('')
const aniosDisponibles = ref([2027, 2026])

const mesesCatalogo = [
  { id: '1', nombre: 'Enero' },
  { id: '2', nombre: 'Febrero' },
  { id: '3', nombre: 'Marzo' },
  { id: '4', nombre: 'Abril' },
  { id: '5', nombre: 'Mayo' },
  { id: '6', nombre: 'Junio' },
  { id: '7', nombre: 'Julio' },
  { id: '8', nombre: 'Agosto' },
  { id: '9', nombre: 'Septiembre' },
  { id: '10', nombre: 'Octubre' },
  { id: '11', nombre: 'Noviembre' },
  { id: '12', nombre: 'Diciembre' }
]

let pollingInterval = null
let socket = null

// Carga de métricas desde el Backend
const fetchMetrics = async (showLoading = true) => {
  if (showLoading) isLoading.value = true
  try {
    const endpoint = isAdministrador.value ? '/actividades/admin/dashboard/metricas' : '/actividades/dashboard/metricas'
    const params = {}
    if (filterAnio.value) params.anio = filterAnio.value
    if (filterMes.value) params.mes = filterMes.value

    const { data } = await api.get(endpoint, { params })
    if (data?.success && data?.data) {
      if (Array.isArray(data.data.anios_disponibles) && data.data.anios_disponibles.length > 0) {
        aniosDisponibles.value = data.data.anios_disponibles
      }
      stats.value = {
        total_acciones: Number(data.data.total_acciones ?? (Number(data.data.actividades_realizadas || 0) + Number(data.data.actividades_pendientes || 0))),
        sin_capturar: Number(data.data.sin_capturar ?? data.data.actividades_pendientes ?? 0),
        capturadas: Number(data.data.capturadas ?? 0),
        finalizadas: Number(data.data.finalizadas ?? 0),
        total_capturadas: Number(data.data.total_capturadas ?? data.data.actividades_realizadas ?? 0),
        total_encuestas: Number(data.data.total_encuestas ?? 0),
        acciones_con_encuestas: Number(data.data.acciones_con_encuestas ?? 0),
        con_folio: Number(data.data.con_folio ?? data.data.total_capturadas ?? 0),
        actividades_realizadas: Number(data.data.actividades_realizadas ?? 0),
        actividades_pendientes: Number(data.data.actividades_pendientes ?? 0),
        grafica_distritos: data.data.grafica_distritos ?? []
      }
    }
  } catch (error) {
    console.error('[DASHBOARD] Error cargando métricas:', error)
  } finally {
    isLoading.value = false
  }
}

watch([filterAnio, filterMes], () => {
  fetchMetrics(true)
})

// 4 Tarjetas Radiales Tipo TailAdmin (Reflejando métricas en tiempo real)
const radialCards = computed(() => {
  const tot = Number(stats.value.total_acciones ?? 0)
  const cap = Number(stats.value.total_capturadas ?? 0)
  const sinCap = Number(stats.value.sin_capturar ?? (tot >= cap ? tot - cap : 0))
  const fin = Number(stats.value.finalizadas ?? 0)
  const enc = Number(stats.value.total_encuestas ?? 0)

  // Porcentaje de sin capturar respecto al total
  const pctSinCap = tot > 0 ? Math.round((sinCap / tot) * 100) : 0
  // Porcentaje de finalizadas
  const pctFin = tot > 0 ? Math.round((fin / tot) * 100) : 0
  
  // Distritos con actividad
  const distritosConActividad = (stats.value.grafica_distritos || []).filter(d => Number(d.total_acciones) > 0).length
  const pctCobertura = distritosConActividad > 0 ? Math.min(100, Math.round((distritosConActividad / 33) * 100)) : 0

  // Acciones con encuestas
  const accionesConEnc = Number(stats.value.acciones_con_encuestas ?? 0)
  const pctEncuestas = cap > 0 ? Math.min(100, Math.round((accionesConEnc / cap) * 100)) : 0

  return [
    {
      id: 'total',
      title: isAdministrador.value ? 'TOTALES' : 'ACCIONES ASIGNADAS',
      value: tot.toLocaleString('es-MX'),
      percent: pctCobertura,
      subtitle: isAdministrador.value ? `${distritosConActividad} de 33 distritos activos` : 'Cobertura en dirección distrital',
      icon: LayoutDashboard,
      iconBoxClass: 'bg-purple-100 text-[#6B2D8B] border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      strokeClass: 'stroke-[#6B2D8B] dark:stroke-purple-400',
      bottomBarClass: 'bg-[#6B2D8B]',
      badge: 'Cobertura',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    },
    {
      id: 'sin_capturar',
      title: 'SIN CAPTURAR',
      value: sinCap.toLocaleString('es-MX'),
      percent: pctSinCap,
      subtitle: `${pctSinCap}% pendiente de captura`,
      icon: Clock,
      iconBoxClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      strokeClass: 'stroke-amber-500 dark:stroke-amber-400',
      bottomBarClass: 'bg-amber-500',
      badge: 'Pendientes',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    },
    {
      id: 'finalizadas',
      title: 'FINALIZADAS',
      value: fin.toLocaleString('es-MX'),
      percent: pctFin,
      subtitle: 'Expediente 100%',
      icon: CheckCircle2,
      iconBoxClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      strokeClass: 'stroke-emerald-500 dark:stroke-emerald-400',
      bottomBarClass: 'bg-emerald-500',
      badge: 'CERRADAS',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    },
    {
      id: 'encuestas',
      title: 'ENCUESTAS RESPONDIDAS',
      value: enc.toLocaleString('es-MX'),
      percent: pctEncuestas,
      subtitle: `${accionesConEnc} de ${cap} con folio`,
      icon: ClipboardList,
      iconBoxClass: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      strokeClass: 'stroke-indigo-500 dark:stroke-indigo-400',
      bottomBarClass: 'bg-indigo-500',
      badge: 'Respondidas',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
    }
  ]
})

// Filtro de Distritos para la gráfica
const filteredDistritos = computed(() => {
  const list = [...(stats.value.grafica_distritos || [])]
  if (chartFilter.value === 'top10') {
    return list.sort((a, b) => Number(b.total_acciones) - Number(a.total_acciones)).slice(0, 10)
  }
  if (chartFilter.value === 'pendientes') {
    const conPendientes = list.filter(d => Number(d.sin_capturar) > 0)
    return conPendientes.length > 0 ? conPendientes : list.slice(0, 10)
  }
  return list.sort((a, b) => a.idsede - b.idsede)
})

// Métricas de apoyo en la cabecera de la gráfica
const statsDistritales = computed(() => {
  const list = stats.value.grafica_distritos || []
  const conAcciones = list.filter(d => Number(d.total_acciones) > 0)
  const top = [...list].sort((a, b) => Number(b.total_acciones) - Number(a.total_acciones))[0]
  const totalAccionesDistritos = list.reduce((acc, d) => acc + Number(d.total_acciones || 0), 0)
  const totalFinalizadasDistritos = list.reduce((acc, d) => acc + Number(d.finalizadas || 0), 0)
  const totalCapturadasDistritos = list.reduce((acc, d) => acc + Number(d.capturadas || 0), 0)
  const tasaCumplimiento = totalAccionesDistritos > 0 
    ? Math.round(((totalFinalizadasDistritos + totalCapturadasDistritos) / totalAccionesDistritos) * 100) 
    : 0

  return {
    distritosActivos: conAcciones.length,
    topDistrito: top ? (top.idsede === 0 ? 'Central' : `Dtto ${top.idsede}`) : 'N/A',
    topAcciones: top ? top.total_acciones : 0,
    totalAccionesDistritos,
    totalFinalizadasDistritos,
    totalCapturadasDistritos,
    tasaCumplimiento
  }
})

// Configuración Chart.js de Avance por Distrito
const chartData = computed(() => {
  const distritos = filteredDistritos.value
  const labels = distritos.map(d => d.idsede === 0 ? 'Central' : `D${d.idsede}`)

  return {
    labels,
    datasets: [
      {
        label: 'Finalizadas (Concluidas)',
        data: distritos.map(d => Number(d.finalizadas || 0)),
        backgroundColor: '#10B981',
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
        barPercentage: 0.72,
        categoryPercentage: 0.82
      },
      {
        label: 'Capturadas (En proceso)',
        data: distritos.map(d => Number(d.capturadas || 0)),
        backgroundColor: '#8B5CF6',
        borderRadius: 0,
        barPercentage: 0.72,
        categoryPercentage: 0.82
      },
      {
        label: 'Sin Capturar (Pendientes)',
        data: distritos.map(d => Number(d.sin_capturar || 0)),
        backgroundColor: '#F59E0B',
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        barPercentage: 0.72,
        categoryPercentage: 0.82
      }
    ]
  }
})

const chartOptions = computed(() => {
  const isDark = themeStore.isDark
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: textColor,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 10, 26, 0.96)' : 'rgba(255, 255, 255, 0.98)',
        titleColor: isDark ? '#ffffff' : '#0f172a',
        bodyColor: isDark ? '#e2e8f0' : '#334155',
        borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(107, 45, 139, 0.2)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: (items) => {
            if (!items?.length) return ''
            const idx = items[0].dataIndex
            const d = filteredDistritos.value[idx]
            return d ? (d.idsede === 0 ? 'Oficinas Centrales' : `Dirección Distrital ${d.idsede}`) : ''
          },
          afterBody: (items) => {
            if (!items?.length) return ''
            const idx = items[0].dataIndex
            const d = filteredDistritos.value[idx]
            if (!d) return ''
            const tot = Number(d.total_acciones || 0)
            const fin = Number(d.finalizadas || 0)
            const cap = Number(d.capturadas || 0)
            const sin = Number(d.sin_capturar || 0)
            const pct = tot > 0 ? Math.round(((fin + cap) / tot) * 100) : 0
            return `\nFinalizadas: ${fin}\nCapturadas: ${cap}\nSin Capturar: ${sin}\nTotal Acciones: ${tot}\nAvance Distrital: ${pct}%\nEncuestas Registradas: ${d.total_encuestas || 0}`
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: textColor, font: { size: 10, weight: 'bold' } }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { stepSize: 1, color: textColor, font: { size: 10 } },
        title: {
          display: true,
          text: 'Total de Acciones',
          color: textColor,
          font: { size: 11, weight: 'bold' }
        }
      }
    }
  }
})

// ==========================================
// GRÁFICA DE ENCUESTAS POR DISTRITO TERRITORIAL
// ==========================================
const chartFilterEncuestas = ref('todos') // 'todos' | 'top10' | 'con_encuestas'
const filterAnioEncuestas = ref('')
const filterMesEncuestas = ref('')
const isEncuestasLoading = ref(false)
const encuestasStats = ref({
  total_encuestas: 0,
  acciones_con_encuestas: 0,
  con_folio: 0,
  distritos: []
})

const fetchEncuestasDistritales = async (showLoading = true) => {
  if (showLoading) isEncuestasLoading.value = true
  try {
    const endpoint = isAdministrador.value ? '/actividades/admin/dashboard/metricas' : '/actividades/dashboard/metricas'
    const params = {}
    if (filterAnioEncuestas.value) params.anio = filterAnioEncuestas.value
    if (filterMesEncuestas.value) params.mes = filterMesEncuestas.value

    const { data } = await api.get(endpoint, { params })
    if (data?.success && data?.data) {
      encuestasStats.value = {
        total_encuestas: Number(data.data.total_encuestas || 0),
        acciones_con_encuestas: Number(data.data.acciones_con_encuestas || 0),
        con_folio: Number(data.data.con_folio || data.data.total_capturadas || 0),
        distritos: data.data.grafica_distritos || []
      }
    }
  } catch (err) {
    console.warn('[DASHBOARD] Error al cargar encuestas distritales:', err.message)
  } finally {
    isEncuestasLoading.value = false
  }
}

watch([filterAnioEncuestas, filterMesEncuestas], () => {
  fetchEncuestasDistritales(true)
})

const filteredDistritosEncuestas = computed(() => {
  const list = [...(encuestasStats.value.distritos?.length ? encuestasStats.value.distritos : (stats.value.grafica_distritos || []))]
  if (chartFilterEncuestas.value === 'top10') {
    return list.sort((a, b) => Number(b.acciones_con_encuestas || b.total_encuestas || 0) - Number(a.acciones_con_encuestas || a.total_encuestas || 0)).slice(0, 10)
  }
  if (chartFilterEncuestas.value === 'con_encuestas') {
    const conEnc = list.filter(d => Number(d.acciones_con_encuestas || d.total_encuestas || 0) > 0)
    return conEnc.length > 0 ? conEnc.sort((a, b) => Number(b.acciones_con_encuestas || 0) - Number(a.acciones_con_encuestas || 0)) : list.slice(0, 10)
  }
  return list.sort((a, b) => a.idsede - b.idsede)
})

const statsDistritalesEncuestas = computed(() => {
  const list = encuestasStats.value.distritos?.length ? encuestasStats.value.distritos : (stats.value.grafica_distritos || [])
  const conEncuestas = list.filter(d => Number(d.acciones_con_encuestas || d.total_encuestas || 0) > 0)
  const top = [...list].sort((a, b) => Number(b.acciones_con_encuestas || b.total_encuestas || 0) - Number(a.acciones_con_encuestas || a.total_encuestas || 0))[0]
  const totalAccionesEnc = Number(encuestasStats.value.acciones_con_encuestas ?? stats.value.acciones_con_encuestas ?? 0)
  const totalConFolio = Number(encuestasStats.value.con_folio ?? stats.value.total_capturadas ?? 0)
  const totalEnc = Number(encuestasStats.value.total_encuestas ?? stats.value.total_encuestas ?? 0)
  const cobertura = totalConFolio > 0 ? ((totalAccionesEnc / totalConFolio) * 100).toFixed(1) : 0

  return {
    distritosConEncuestas: conEncuestas.length,
    topDistrito: top && Number(top.acciones_con_encuestas || top.total_encuestas || 0) > 0 ? (top.idsede === 0 ? 'Central' : `Dtto ${top.idsede}`) : 'N/A',
    topAccionesConEncuestas: top ? Number(top.acciones_con_encuestas || 0) : 0,
    topTotalEncuestas: top ? Number(top.total_encuestas || 0) : 0,
    totalAccionesConEncuestas: totalAccionesEnc,
    totalConFolio,
    coberturaGlobal: cobertura,
    totalEncuestas: totalEnc
  }
})

const chartEncuestasData = computed(() => {
  const distritos = filteredDistritosEncuestas.value
  const labels = distritos.map(d => d.idsede === 0 ? 'Central' : `D${d.idsede}`)

  return {
    labels,
    datasets: [
      {
        label: 'Acciones con Encuestas',
        data: distritos.map(d => Number(d.acciones_con_encuestas ?? (d.total_encuestas > 0 ? Math.ceil(d.total_encuestas / 3) : 0))),
        backgroundColor: '#10B981',
        hoverBackgroundColor: '#059669',
        borderRadius: 4,
        barPercentage: 0.75,
        categoryPercentage: 0.82
      },
      {
        label: 'Total con Folio',
        data: distritos.map(d => Number(d.con_folio || d.total_actividades || 0)),
        backgroundColor: themeStore.isDark ? '#334155' : '#CBD5E1',
        hoverBackgroundColor: themeStore.isDark ? '#475569' : '#94A3B8',
        borderRadius: 4,
        barPercentage: 0.75,
        categoryPercentage: 0.82
      }
    ]
  }
})

const chartEncuestasOptions = computed(() => {
  const isDark = themeStore.isDark
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: textColor,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 10, 26, 0.96)' : 'rgba(255, 255, 255, 0.98)',
        titleColor: isDark ? '#ffffff' : '#0f172a',
        bodyColor: isDark ? '#e2e8f0' : '#334155',
        borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: (items) => {
            if (!items?.length) return ''
            const idx = items[0].dataIndex
            const d = filteredDistritosEncuestas.value[idx]
            return d ? (d.idsede === 0 ? 'Oficinas Centrales' : `Dirección Distrital ${d.idsede}`) : ''
          },
          label: (item) => {
            return ` ${item.dataset.label}: ${Number(item.raw || 0).toLocaleString('es-MX')}`
          },
          afterBody: (items) => {
            if (!items?.length) return ''
            const idx = items[0].dataIndex
            const d = filteredDistritosEncuestas.value[idx]
            if (!d) return ''
            const conEnc = Number(d.acciones_con_encuestas ?? (d.total_encuestas > 0 ? Math.ceil(d.total_encuestas / 3) : 0))
            const conFol = Number(d.con_folio || d.total_actividades || 0)
            const enc = Number(d.total_encuestas || 0)
            const pct = conFol > 0 ? Math.round((conEnc / conFol) * 100) : 0
            return `\nAcciones con Encuestas: ${conEnc} de ${conFol} con folio (${pct}%)\nTotal Encuestas Respondidas en Campo: ${enc}\nAcciones Totales Asignadas: ${d.total_acciones || 0}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { size: 10, weight: 'bold' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { stepSize: 1, color: textColor, font: { size: 10 } },
        title: {
          display: true,
          text: 'Total de Encuestas Respondidas',
          color: textColor,
          font: { size: 11, weight: 'bold' }
        }
      }
    }
  }
})

// ==========================================
// METAS INSTITUCIONALES 2027 (BAR CHART 6, SEMI CIRCLE 1, BAR CHART 4)
// ==========================================
const metasStats = ref({
  anio: 2027,
  id_distrito: 0,
  meta_actual: 4500,
  total_acciones: 0,
  finalizadas: 0,
  capturadas: 0,
  sin_capturar: 0,
  porcentaje: 0,
  semi_circle_pct: 0,
  desglose_mensual: []
})

const filterDistritoMetas = ref('0')
const isMetasLoading = ref(false)

const distritosOptions = [
  { id: '0', nombre: 'Todos los Distritos (Consolidado)' },
  ...Array.from({ length: 33 }, (_, i) => ({
    id: String(i + 1),
    nombre: `Dirección Distrital ${String(i + 1).padStart(2, '0')}`
  }))
]

const fetchMetasStats = async () => {
  isMetasLoading.value = true
  try {
    const params = {}
    if (filterAnio.value) {
      params.anio = filterAnio.value
    }
    if (filterDistritoMetas.value !== '') {
      params.id_distrito = filterDistritoMetas.value
    }
    const { data } = await api.get('/admin/metas/dashboard', { params })
    if (data?.success && data?.data) {
      metasStats.value = data.data
    }
  } catch (err) {
    console.warn('[DASHBOARD] Error al cargar estadísticas de metas:', err.message)
  } finally {
    isMetasLoading.value = false
  }
}

watch([filterDistritoMetas, filterAnio], () => {
  fetchMetasStats()
})

// Métricas consolidadas para visualización en tiempo real
const displayFinalizadas = computed(() => {
  return Number(metasStats.value.finalizadas || stats.value.finalizadas || 0)
})

const displayCapturadas = computed(() => {
  return Number(metasStats.value.capturadas || stats.value.capturadas || 0)
})

const displayTotal = computed(() => {
  return Number(metasStats.value.total_acciones || stats.value.total_acciones || 0)
})

const displayMeta = computed(() => {
  return Number(metasStats.value.meta_actual || 4500)
})

const displayPorcentaje = computed(() => {
  if (metasStats.value.porcentaje && Number(metasStats.value.porcentaje) > 0) {
    return Number(metasStats.value.porcentaje)
  }
  const meta = displayMeta.value
  const fin = displayFinalizadas.value
  return meta > 0 ? Number(((fin / meta) * 100).toFixed(2)) : 0
})

const displayPendiente = computed(() => {
  return Math.max(0, displayMeta.value - displayFinalizadas.value)
})

// Cápsulas segmentadas según avance de la meta (solo finalizadas)
const barChart6Capsules = computed(() => {
  const meta = displayMeta.value
  const fin = displayFinalizadas.value

  const pctFin = meta > 0 ? (fin / meta) * 100 : 0
  const totalCapsules = 48
  const capsules = []

  for (let i = 1; i <= totalCapsules; i++) {
    const capsulePct = (i / totalCapsules) * 100
    const type = capsulePct <= pctFin ? 'finalizada' : 'empty'
    capsules.push({ index: i, type })
  }
  return capsules
})

// Semi Circle 1: Dashoffset para arco SVG de 180° (circunferencia r=80: PI * 80 ≈ 251.33)
const semiCircleDashOffset = computed(() => {
  const pct = Math.min(100, Math.max(0, displayPorcentaje.value))
  const circumference = 251.33
  return circumference - (circumference * pct) / 100
})

// Bar Chart 4: Desglose horizontal por meses reales (Categoría A y B)
const barChart4Data = computed(() => {
  const meses = metasStats.value.desglose_mensual && metasStats.value.desglose_mensual.length > 0
    ? metasStats.value.desglose_mensual
    : [
        { nombre: 'Jan', finalizadas: 0, programadas: 0 },
        { nombre: 'Feb', finalizadas: 0, programadas: 0 },
        { nombre: 'Mar', finalizadas: 0, programadas: 0 },
        { nombre: 'Apr', finalizadas: 0, programadas: 0 },
        { nombre: 'May', finalizadas: 0, programadas: 0 },
        { nombre: 'Jun', finalizadas: 0, programadas: 0 },
        { nombre: 'Jul', finalizadas: 0, programadas: 0 },
        { nombre: 'Aug', finalizadas: 0, programadas: 0 },
        { nombre: 'Sep', finalizadas: 0, programadas: 0 },
        { nombre: 'Oct', finalizadas: 0, programadas: 0 },
        { nombre: 'Nov', finalizadas: 0, programadas: 0 },
        { nombre: 'Dec', finalizadas: 0, programadas: 0 }
      ]

  return {
    labels: meses.map(m => m.nombre),
    datasets: [
      {
        label: 'Acciones Finalizadas',
        data: meses.map(m => Number(m.finalizadas || 0)),
        backgroundColor: '#6366F1',
        borderRadius: 4,
        barThickness: 8,
        categoryPercentage: 0.75,
        barPercentage: 0.9
      },
      {
        label: 'Acciones Programadas',
        data: meses.map(m => Number(m.programadas || 0)),
        backgroundColor: themeStore.isDark ? '#334155' : '#E2E8F0',
        borderRadius: 4,
        barThickness: 8,
        categoryPercentage: 0.75,
        barPercentage: 0.9
      }
    ]
  }
})

const barChart4Options = computed(() => {
  const isDark = themeStore.isDark
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'

  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 10, 26, 0.96)' : 'rgba(255, 255, 255, 0.98)',
        titleColor: isDark ? '#ffffff' : '#0f172a',
        bodyColor: isDark ? '#e2e8f0' : '#334155',
        borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => {
            const label = context.datasetIndex === 0 ? 'Acciones Finalizadas' : 'Acciones Programadas'
            return `${label}: ${context.raw} acciones`
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 10 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: textColor, font: { size: 11, weight: 'bold' } }
      }
    }
  }
})

// Catálogo de Formatos Oficiales 2027
const categoriasFormatos = ref([
  {
    id: 1,
    nombre: 'Servicio Social',
    icono: '🎓',
    archivos: [
      { nombre: 'Formato de registro', archivo: 'Anexo01_SS.docx' },
      { nombre: 'Manifestación de no ser beneficiario/a de alguna beca que impida recibir el apoyo económico', archivo: 'Anexo02_SS.docx' },
      { nombre: 'Formato de reporte de avance en el proceso de reclutamiento de prestadores y prestadoras de servicio social', archivo: 'Anexo03_SS.docx' },
      { nombre: 'Formato para el reporte de bajas anticipadas y sustituciones de prestadores y prestadoras de servicio social', archivo: 'Anexo04_SS.docx' },
      { nombre: 'Formato de reporte de la capacitación otorgada a las y los prestadores de servicio social', archivo: 'Anexo05_SS.docx' },
      { nombre: 'Consideraciones generales para la coordinación de las actividades de las y los prestadores de servicio social', archivo: 'Anexo06_SS.docx' },
      { nombre: 'Lista de asistencia de el/la prestador(a) de servicio social', archivo: 'Anexo07_SS.docx' },
      { nombre: 'Formato para la solicitud de otorgamiento de apoyo económico a prestadores(as) de servicio social', archivo: 'Anexo08_SS.docx' },
      { nombre: 'Formato para la solicitud de expedición de Oficio de liberación para prestadores(as) de servicio social', archivo: 'Anexo09_SS.docx' }
    ]
  },
  {
    id: 2,
    nombre: 'Acciones Educativas',
    icono: '📚',
    archivos: [
      { nombre: 'Formato para el registro de asistentes a talleres de formación ciudadana e intervenciones educativas', archivo: 'Anexo01_AE.docx' },
      { nombre: 'Formato para el registro del desarrollo de talleres de formación ciudadana e intervenciones educativas', archivo: 'Anexo02_AE.docx' },
      { nombre: 'Encuesta de satisfacción', archivo: 'Anexo03_AE.docx' },
      { nombre: 'Cedula de verificación de expediente fisico o digital distrital', archivo: 'Anexo04_AE.docx' }
    ]
  },
  {
    id: 3,
    nombre: 'Ludoteca Cívica',
    icono: '🎲',
    archivos: [
      { nombre: 'Formato para la gestión de acciones educativas de la Ludoteca Cívica dirigidas a la comunidad educativa y otros públicos', archivo: 'luci.docx' }
    ]
  },
  {
    id: 4,
    nombre: 'Vínculo Institucional (Demarcaciones)',
    icono: '🏛️',
    archivos: [
      { nombre: 'Modelo de Convenio', archivo: 'Anexo01_DT.docx' },
      { nombre: 'Modelo de Programa Anual de Trabajo', archivo: 'Anexo02_DT.docx' },
      { nombre: 'Procedimiento de vinculación', archivo: 'Anexo03_DT.docx' }
    ]
  },
  {
    id: 5,
    nombre: 'Lineamientos de Protección',
    icono: '🛡️',
    archivos: [
      { nombre: 'Carta de autorización expresa y cesión de derechos_Padres', archivo: 'lineamientos1.docx' },
      { nombre: 'Formato de autorización expresa de las niñas, niños y adolescentes', archivo: 'lineamientos2.docx' }
    ]
  }
])

const selectedCategoriaId = ref(1)
const selectedCategoria = computed(() => categoriasFormatos.value.find(c => c.id === Number(selectedCategoriaId.value)))

const totalFormatosDisponibles = computed(() => {
  return categoriasFormatos.value.reduce((acc, cat) => acc + (cat.archivos?.length || 0), 0)
})

const fetchFormatosActivos = async () => {
  try {
    const { data } = await api.get('/formatos')
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      categoriasFormatos.value = data.data
      if (!selectedCategoriaId.value || !data.data.some(c => c.id === Number(selectedCategoriaId.value))) {
        selectedCategoriaId.value = data.data[0].id
      }
    }
  } catch (err) {
    console.warn('[DASHBOARD] No se pudieron sincronizar los formatos activos:', err.message)
  }
}

const descargando = ref({})
const descargarArchivo = async (nombreArchivo) => {
  descargando.value[nombreArchivo] = true
  try {
    const { token } = authStore
    const response = await fetch(`/api/formatos/descargar/${nombreArchivo}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!response.ok) throw new Error('No encontrado')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Descargando ${nombreArchivo}`)
  } catch (error) {
    toast.error('No se pudo descargar el archivo. Intenta de nuevo.')
  } finally {
    descargando.value[nombreArchivo] = false
  }
}

// Handlers de WebSockets para Actualización en Vivo
const handleLiveUpdate = (payload) => {
  isLiveUpdating.value = true
  fetchMetrics(false)
  fetchMetasStats()
  fetchEncuestasDistritales(false)
  
  nextTick(() => {
    gsap.fromTo('.stat-radial-card', 
      { scale: 0.98 }, 
      { scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    )
    setTimeout(() => {
      isLiveUpdating.value = false
    }, 1500)
  })
}

const handleRecordatorioMeta = (payload) => {
  toast.info(`🔔 Recordatorio Institucional: ${payload.titulo || 'Meta Anual'} - ${payload.mensaje || ''}`)
  fetchMetasStats()
}

const handleFormatosUpdate = () => {
  fetchFormatosActivos()
}

// Animación GSAP al cambiar de pestaña de formatos
watch(selectedCategoriaId, () => {
  nextTick(() => {
    gsap.from('.formato-card-item', {
      opacity: 0,
      y: 14,
      stagger: 0.04,
      duration: 0.35,
      ease: 'power2.out',
      clearProps: 'all'
    })
  })
})

onMounted(() => {
  fetchMetrics()
  fetchMetasStats()
  fetchEncuestasDistritales()
  fetchFormatosActivos()

  // Conexión reactiva a Sockets
  try {
    socket = getSocket()
    if (socket) {
      socket.on('accion:creada', handleLiveUpdate)
      socket.on('accion:capturada', handleLiveUpdate)
      socket.on('accion:finalizada', handleLiveUpdate)
      socket.on('accion:reprogramada', handleLiveUpdate)
      socket.on('accion:cancelada', handleLiveUpdate)
      socket.on('encuesta:registrada', handleLiveUpdate)
      socket.on('notificacion:nueva', handleLiveUpdate)
      socket.on('notificacion:recordatorio_meta', handleRecordatorioMeta)
      socket.on('formato:actualizado', handleFormatosUpdate)
      socket.on('formatos:sync', handleFormatosUpdate)
    }
  } catch (err) {
    console.warn('[DASHBOARD WS] No se pudo inicializar sockets:', err)
  }

  // Animación inicial GSAP de las tarjetas
  nextTick(() => {
    gsap.from('.stat-radial-card', {
      opacity: 0,
      y: 20,
      scale: 0.95,
      stagger: 0.08,
      duration: 0.5,
      ease: 'power3.out',
      clearProps: 'all'
    })
  })

  // Polling de respaldo cada 60s
  pollingInterval = setInterval(() => {
    fetchMetrics(false)
    fetchMetasStats()
    fetchEncuestasDistritales(false)
  }, 60000)
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
  if (socket) {
    socket.off('accion:creada', handleLiveUpdate)
    socket.off('accion:capturada', handleLiveUpdate)
    socket.off('accion:finalizada', handleLiveUpdate)
    socket.off('accion:reprogramada', handleLiveUpdate)
    socket.off('accion:cancelada', handleLiveUpdate)
    socket.off('encuesta:registrada', handleLiveUpdate)
    socket.off('notificacion:nueva', handleLiveUpdate)
    socket.off('notificacion:recordatorio_meta', handleRecordatorioMeta)
    socket.off('formato:actualizado', handleFormatosUpdate)
    socket.off('formatos:sync', handleFormatosUpdate)
  }
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <!-- Encabezado con Indicador de Sockets en Vivo -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight dark:text-white flex items-center gap-3">
          <span>Bienvenido, {{ authStore.user?.nombre || authStore.user?.usuario || 'Administrador' }}</span>
        </h1>
        <p class="mt-1 text-slate-500 text-sm dark:text-slate-400">
          Tablero de control institucional en tiempo real — Monitoreo operativo distrital y captura 2027.
        </p>
      </div>

      <!-- Badge de Estado en Vivo y Botón de Refresco -->
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <span 
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs"
          :class="isLiveUpdating 
            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 animate-pulse' 
            : 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'"
        >
          <span class="w-2 h-2 rounded-full" :class="isLiveUpdating ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'"></span>
          <span>{{ isLiveUpdating ? 'Actualizando datos...' : 'Actualización en vivo' }}</span>
        </span>

        <button
          type="button"
          @click="fetchMetrics(true)"
          class="p-2 rounded-xl text-slate-500 hover:text-[#6B2D8B] dark:text-slate-400 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          title="Recargar métricas ahora"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </header>

    <!-- 4 CARDS CON RADIALS TIPO TAILADMIN -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div 
        v-for="card in radialCards" 
        :key="card.id"
        class="stat-radial-card p-5 rounded-2xl bg-white/95 dark:bg-[#120a1f]/90 border border-slate-200/80 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 hover:-translate-y-1 hover:shadow-2xl hover:border-purple-400/50 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
      >
        <!-- Fila superior: Icono a la izquierda y Radial TailAdmin a la derecha -->
        <div class="flex items-center justify-between">
          <div :class="['w-12 h-12 rounded-xl flex items-center justify-center shadow-xs border', card.iconBoxClass]">
            <component :is="card.icon" class="w-6 h-6" />
          </div>

          <!-- TailAdmin Radial Ring Progress -->
          <div class="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg class="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
              <!-- Círculo base de fondo -->
              <circle
                cx="32" cy="32" r="26"
                fill="none"
                class="stroke-slate-100 dark:stroke-slate-800/80"
                stroke-width="5"
              />
              <!-- Círculo animado de avance -->
              <circle
                cx="32" cy="32" r="26"
                fill="none"
                :class="card.strokeClass"
                stroke-width="5"
                stroke-linecap="round"
                :stroke-dasharray="163.36"
                :stroke-dashoffset="163.36 - (163.36 * card.percent) / 100"
                class="transition-all duration-1000 ease-out"
              />
            </svg>
            <!-- Porcentaje en el centro del radial -->
            <span class="absolute font-black text-[11px] text-slate-800 dark:text-white font-mono">
              {{ card.percent }}%
            </span>
          </div>
        </div>

        <!-- Sección de valor y etiquetas -->
        <div class="mt-4">
          <span class="text-[11px] font-bold text-slate-400 dark:text-purple-300/70 uppercase tracking-wider block">
            {{ card.title }}
          </span>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              <span v-if="isLoading" class="animate-pulse bg-slate-200 dark:bg-slate-800 text-transparent rounded">000</span>
              <span v-else>{{ card.value }}</span>
            </span>
            <span v-if="card.badge" :class="['text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-xs', card.badgeClass]">
              {{ card.badge }}
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
            {{ card.subtitle }}
          </p>
        </div>

        <!-- Línea de acento inferior en hover -->
        <div :class="['absolute bottom-0 inset-x-0 h-1 transition-all duration-300 opacity-60 group-hover:opacity-100', card.bottomBarClass]"></div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- SECCIÓN: METAS ANUALES 2027 (BAR CHART 6, SEMI CIRCLE 1 & BAR CHART 4) -->
    <!-- ======================================================== -->
    <section class="space-y-5">
      
      <!-- Fila Superior: Bar Chart 6 (8 cols) + Semi Circle 1 (4 cols) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <!-- Meta Anual Segmentada en Bloques -->
        <div class="lg:col-span-8 rounded-2xl bg-white/95 dark:bg-[#120a1f]/90 border border-slate-200/80 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div class="flex items-center gap-2">
                <Target class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Avance de la Meta Anual</h2>
                <span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Meta Anual {{ metasStats.anio || 2027 }}
                </span>
              </div>
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Acciones Educativas Concluidas
              </span>
            </div>

            <!-- Texto de Avance Solicitado por el Usuario -->
            <div class="mt-4 mb-2">
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {{ displayFinalizadas.toLocaleString('es-MX') }}
                </span>
                <span class="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  acciones realizadas de <strong class="text-indigo-600 dark:text-indigo-400 font-mono">{{ displayMeta.toLocaleString('es-MX') }}</strong> de la meta actual
                </span>
                <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 ml-auto shadow-2xs">
                  {{ displayPorcentaje }}% alcanzado
                </span>
              </div>
            </div>

            <!-- Cápsulas Segmentadas Proporcionales -->
            <div class="w-full py-4">
              <div class="flex items-center gap-1 sm:gap-1.5 w-full">
                <div
                  v-for="cap in barChart6Capsules"
                  :key="cap.index"
                  :class="[
                    'flex-1 h-9 sm:h-10 rounded-xs transition-all duration-300',
                    cap.type === 'finalizada'
                      ? 'bg-[#6366F1] shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80'
                  ]"
                  :title="`Bloque ${cap.index}: ${cap.type === 'finalizada' ? 'Finalizada' : 'Pendiente'}`"
                ></div>
              </div>
            </div>
          </div>

          <!-- Leyenda Institucional -->
          <div class="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#6366F1]"></span>
              <span>Acciones Finalizadas: <strong>{{ displayFinalizadas.toLocaleString('es-MX') }}</strong></span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              <span>Pendiente para la Meta: <strong>{{ displayPendiente.toLocaleString('es-MX') }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Medidor Semicircular de Meta (180°) -->
        <div class="lg:col-span-4 rounded-2xl bg-white/95 dark:bg-[#120a1f]/90 border border-slate-200/80 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 p-6 flex flex-col justify-between">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Porcentaje de Cumplimiento</h2>
            <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Meta Anual
            </span>
          </div>

          <!-- Arco Semicircular SVG con porcentaje central -->
          <div class="relative flex flex-col items-center justify-center my-auto pt-4">
            <svg class="w-56 h-32" viewBox="0 0 200 115">
              <defs>
                <linearGradient id="semiCircleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#818CF8" />
                  <stop offset="100%" stop-color="#4F46E5" />
                </linearGradient>
              </defs>
              <!-- Track gris de fondo -->
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                class="stroke-slate-100 dark:stroke-slate-800/90"
                stroke-width="12"
                stroke-linecap="round"
              />
              <!-- Arco de porcentaje animado -->
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#semiCircleGrad)"
                stroke-width="12"
                stroke-linecap="round"
                stroke-dasharray="251.33"
                :stroke-dashoffset="semiCircleDashOffset"
                class="transition-all duration-1000 ease-out"
              />
            </svg>
            <div class="absolute bottom-2 flex flex-col items-center">
              <span class="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {{ displayPorcentaje }}%
              </span>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Meta Anual
              </span>
            </div>
          </div>

          <div class="text-center pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
              Porcentaje alcanzado respecto al objetivo anual
            </span>
          </div>
        </div>

      </div>

      <!-- Fila Inferior: Barras Horizontales por Mes con Filtro Distrital -->
      <div class="rounded-2xl bg-white/95 dark:bg-[#120a1f]/90 border border-slate-200/80 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 p-6 space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <BarChart2 class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Cálculo Mensual de Acciones por Distrito</h2>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monitoreo mensual de acciones educativas finalizadas vs programadas por distrito.
            </p>
          </div>

          <!-- Filtro Interactivo de Distritos -->
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Filtrar distrito:</span>
            <select
              v-model="filterDistritoMetas"
              class="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer shadow-2xs"
              title="Filtrar por distrito o consolidado general"
            >
              <option v-for="d in distritosOptions" :key="d.id" :value="d.id">
                {{ d.nombre }}
              </option>
            </select>
          </div>
        </div>

        <!-- Leyenda Institucional -->
        <div class="flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#6366F1]"></span>
            <span>Acciones Finalizadas</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span>Acciones Programadas</span>
          </div>
        </div>

        <!-- Canvas Horizontal -->
        <div class="h-[320px] w-full pt-1">
          <Bar
            v-if="!isMetasLoading"
            :key="`barchart4-${themeStore.isDark}-${filterDistritoMetas}`"
            :data="barChart4Data"
            :options="barChart4Options"
          />
          <div v-else class="h-full flex flex-col items-center justify-center text-slate-400">
            <RefreshCw class="w-8 h-8 animate-spin opacity-40 text-indigo-600" />
            <p class="text-xs mt-2 font-medium">Actualizando cálculo mensual...</p>
          </div>
        </div>

      </div>

    </section>

    <!-- SECCIÓN: GRÁFICA DE AVANCE POR DISTRITO TERRITORIAL (EN VIVO) -->
    <section v-if="isAdministrador" class="space-y-3">
      <div class="rounded-2xl bg-white/95 dark:bg-[#120a1f]/90 border border-slate-200/80 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 p-6 space-y-5">
        
        <!-- Cabecera de la Gráfica y Controles -->
        <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <BarChart2 class="w-5 h-5 text-[#6B2D8B] dark:text-purple-400" />
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">Avance por Distrito Territorial</h2>
              <span class="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                33 Sedes
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Desglose acumulado: <span class="text-emerald-600 dark:text-emerald-400 font-bold">Finalizadas (verde)</span>, <span class="text-purple-600 dark:text-purple-400 font-bold">Capturadas en proceso (morado)</span> y <span class="text-amber-600 dark:text-amber-400 font-bold">Sin Capturar (ámbar)</span>.
            </p>
          </div>

          <!-- Controles y Filtros: Año, Mes y Vista de Distritos -->
          <div class="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            <!-- Filtro Año -->
            <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <Calendar class="w-3.5 h-3.5 text-[#6B2D8B] dark:text-purple-400 shrink-0" />
              <select
                v-model="filterAnio"
                class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                title="Filtrar avance por año"
              >
                <option value="">Todos los Años</option>
                <option v-for="y in aniosDisponibles" :key="y" :value="String(y)">{{ y }}</option>
              </select>
            </div>

            <!-- Filtro Mes -->
            <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <Filter class="w-3.5 h-3.5 text-[#6B2D8B] dark:text-purple-400 shrink-0" />
              <select
                v-model="filterMes"
                class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                title="Filtrar avance por mes"
              >
                <option value="">Todos los Meses</option>
                <option v-for="m in mesesCatalogo" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>

            <!-- Vista de Distritos -->
            <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                @click="chartFilter = 'todos'"
                :class="[
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  chartFilter === 'todos' 
                    ? 'bg-white dark:bg-[#6B2D8B] text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                Todos (1-33)
              </button>
              <button
                type="button"
                @click="chartFilter = 'top10'"
                :class="[
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  chartFilter === 'top10' 
                    ? 'bg-white dark:bg-[#6B2D8B] text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                Top 10 Activos
              </button>
              <button
                type="button"
                @click="chartFilter = 'pendientes'"
                :class="[
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  chartFilter === 'pendientes' 
                    ? 'bg-white dark:bg-[#6B2D8B] text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                Con Pendientes
              </button>
            </div>
          </div>
        </div>

        <!-- Tira de Mini Métricas Resumen -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 px-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs">
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Distritos con Actividad</span>
            <span class="font-bold text-slate-800 dark:text-purple-200 text-sm font-mono">
              {{ statsDistritales.distritosActivos }} de 33 sedes
            </span>
          </div>
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Distrito con Más Acciones</span>
            <span class="font-bold text-[#6B2D8B] dark:text-purple-300 text-sm font-mono">
              {{ statsDistritales.topDistrito }} ({{ statsDistritales.topAcciones }})
            </span>
          </div>
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Finalizadas / Capturadas</span>
            <span class="font-bold text-slate-800 dark:text-white text-sm font-mono">
              <span class="text-emerald-600 dark:text-emerald-400">{{ statsDistritales.totalFinalizadasDistritos }} fin</span> / 
              <span class="text-purple-600 dark:text-purple-300">{{ statsDistritales.totalCapturadasDistritos }} cap</span>
            </span>
          </div>
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Tasa Global de Cumplimiento</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
              {{ statsDistritales.tasaCumplimiento }}% avance
            </span>
          </div>
        </div>

        <!-- Contenedor del Lienzo de la Gráfica -->
        <div class="h-[380px] w-full pt-2">
          <Bar 
            v-if="!isLoading && chartData.labels?.length > 0" 
            :key="`${themeStore.isDark}-${chartFilter}-${filterAnio}-${filterMes}`" 
            :data="chartData" 
            :options="chartOptions" 
          />
          <div v-else class="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <BarChart2 class="w-12 h-12 mb-3 opacity-30 animate-pulse text-[#6B2D8B]" />
            <p class="text-sm font-medium">Calculando métricas distritales en tiempo real...</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECCIÓN: GRÁFICA DE ENCUESTAS RESPONDIDAS POR DISTRITO TERRITORIAL (EN VIVO) -->
    <section v-if="isAdministrador" class="space-y-3">
      <div class="rounded-2xl bg-white/95 dark:bg-[#120a1f]/90 border border-slate-200/80 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 p-6 space-y-5">
        
        <!-- Cabecera de la Gráfica y Controles -->
        <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <ClipboardList class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">Encuestas Respondidas por Distrito Territorial</h2>
              <span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                33 Sedes
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Distribución distrital de instrumentos de satisfacción respondidos por la ciudadanía en actividades educativas del IECM.
            </p>
          </div>

          <!-- Controles y Filtros: Año, Mes y Vista de Distritos -->
          <div class="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            <!-- Filtro Año -->
            <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <Calendar class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <select
                v-model="filterAnioEncuestas"
                class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                title="Filtrar encuestas por año"
              >
                <option value="">Todos los Años</option>
                <option v-for="y in aniosDisponibles" :key="y" :value="String(y)">{{ y }}</option>
              </select>
            </div>

            <!-- Filtro Mes -->
            <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <Filter class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <select
                v-model="filterMesEncuestas"
                class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                title="Filtrar encuestas por mes"
              >
                <option value="">Todos los Meses</option>
                <option v-for="m in mesesCatalogo" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>

            <!-- Vista de Distritos -->
            <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                @click="chartFilterEncuestas = 'todos'"
                :class="[
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  chartFilterEncuestas === 'todos' 
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                Todos (1-33)
              </button>
              <button
                type="button"
                @click="chartFilterEncuestas = 'top10'"
                :class="[
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  chartFilterEncuestas === 'top10' 
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                Top 10 Activos
              </button>
              <button
                type="button"
                @click="chartFilterEncuestas = 'con_encuestas'"
                :class="[
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  chartFilterEncuestas === 'con_encuestas' 
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                Con Encuestas
              </button>
            </div>
          </div>
        </div>

        <!-- Tira de Mini Métricas Resumen -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 px-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs">
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Distritos con Encuestas</span>
            <span class="font-bold text-slate-800 dark:text-indigo-200 text-sm font-mono">
              {{ statsDistritalesEncuestas.distritosConEncuestas }} de 33 sedes
            </span>
          </div>
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Distrito con Más Encuestas</span>
            <span class="font-bold text-indigo-600 dark:text-indigo-300 text-sm font-mono">
              {{ statsDistritalesEncuestas.topDistrito }} ({{ statsDistritalesEncuestas.topAccionesConEncuestas }} con enc.)
            </span>
          </div>
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Acciones con Encuestas (de Folio)</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
              {{ statsDistritalesEncuestas.totalAccionesConEncuestas }}
            </span>
            <span class="text-slate-500 dark:text-slate-400 font-medium ml-1">de {{ statsDistritalesEncuestas.totalConFolio }} con folio</span>
            <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">({{ statsDistritalesEncuestas.coberturaGlobal }}%)</span>
          </div>
          <div>
            <span class="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase">Total Encuestas Respondidas</span>
            <span class="font-bold text-indigo-600 dark:text-indigo-400 text-sm font-mono">
              {{ statsDistritalesEncuestas.totalEncuestas.toLocaleString('es-MX') }} en campo
            </span>
          </div>
        </div>

        <!-- Leyenda Institucional -->
        <div class="flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span>Acciones con Encuestas Respondidas</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span>Acciones Totales con Folio Oficial</span>
          </div>
        </div>

        <!-- Contenedor del Lienzo de la Gráfica -->
        <div class="h-[380px] w-full pt-2">
          <Bar 
            v-if="!isEncuestasLoading && chartEncuestasData.labels?.length > 0" 
            :key="`chart-encuestas-${themeStore.isDark}-${chartFilterEncuestas}-${filterAnioEncuestas}-${filterMesEncuestas}`" 
            :data="chartEncuestasData" 
            :options="chartEncuestasOptions" 
          />
          <div v-else class="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ClipboardList class="w-12 h-12 mb-3 opacity-30 animate-pulse text-indigo-600" />
            <p class="text-sm font-medium">Calculando encuestas distritales en tiempo real...</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECCIÓN: FORMATOS Y DOCUMENTOS OFICIALES CON RADIAL TAILADMIN -->
    <section class="space-y-4">
      <div class="rounded-2xl bg-white/95 dark:bg-[#120a1f]/90 border border-slate-200/80 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 p-6 space-y-6">
        
        <!-- Header con Widget Radial TailAdmin de Disponibilidad -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 dark:from-purple-950/40 dark:via-[#140b24] dark:to-purple-950/20 border border-purple-200/70 dark:border-purple-900/50">
          <div class="space-y-1.5 max-w-xl">
            <div class="flex items-center gap-2">
              <FolderArchive class="w-5 h-5 text-[#6B2D8B] dark:text-purple-300" />
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">
                Formatos y Documentos Oficiales Institucionales
              </h2>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Repositorio normativo de anexos, convenios y formatos de registro autorizados para las 33 Direcciones Distritales y Oficinas Centrales del IECM.
            </p>
          </div>

          <!-- Widget Radial TailAdmin: Disponibilidad de Formatos -->
          <div class="flex items-center gap-4 bg-white/90 dark:bg-purple-950/60 px-4 py-3 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 shadow-xs shrink-0 self-start md:self-auto">
            <div class="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg class="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  class="stroke-slate-100 dark:stroke-slate-800"
                  stroke-width="5"
                />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  class="stroke-[#6B2D8B] dark:stroke-purple-400"
                  stroke-width="5"
                  stroke-linecap="round"
                  stroke-dasharray="163.36"
                  stroke-dashoffset="0"
                />
              </svg>
              <span class="absolute font-black text-xs text-[#6B2D8B] dark:text-purple-300 font-mono">
                100%
              </span>
            </div>

            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                Disponibilidad Oficial
              </span>
              <p class="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                {{ totalFormatosDisponibles }} de {{ totalFormatosDisponibles }} en servidor
              </p>
              <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldCheck class="w-3.5 h-3.5" /> Normativa Vigente
              </span>
            </div>
          </div>
        </div>

        <!-- Pestañas de Categorías (Pills Interactivas) -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            v-for="cat in categoriasFormatos"
            :key="cat.id"
            type="button"
            @click="selectedCategoriaId = cat.id"
            :class="[
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 shadow-xs border',
              Number(selectedCategoriaId) === Number(cat.id)
                ? 'bg-gradient-to-r from-[#6B2D8B] to-purple-600 text-white border-transparent shadow-purple-900/20 scale-[1.02]'
                : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
            ]"
          >
            <span class="text-sm">{{ cat.icono || '📄' }}</span>
            <span>{{ cat.nombre }}</span>
            <span 
              :class="[
                'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold',
                Number(selectedCategoriaId) === Number(cat.id)
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
              ]"
            >
              {{ cat.archivos?.length || 0 }}
            </span>
          </button>
        </div>

        <!-- Grid de Tarjetas de Formatos con Animación GSAP Stagger -->
        <div v-if="selectedCategoria && selectedCategoria.archivos?.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="archivo in selectedCategoria.archivos"
            :key="archivo.archivo"
            class="formato-card-item p-4 rounded-xl bg-slate-50/80 dark:bg-[#160d26]/80 border border-slate-200/80 dark:border-purple-900/30 hover:border-[#6B2D8B]/50 dark:hover:border-purple-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
          >
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div class="w-10 h-10 rounded-xl bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
                  <FileText class="w-5 h-5" />
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 truncate max-w-[150px]">
                  {{ archivo.archivo }}
                </span>
              </div>
              <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                {{ archivo.nombre }}
              </h3>
            </div>

            <div class="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle class="w-3 h-3" /> Disponible
              </span>

              <AppButton
                variant="primary"
                size="sm"
                :disabled="descargando[archivo.archivo]"
                @click="descargarArchivo(archivo.archivo)"
                class="bg-[#6B2D8B] hover:bg-[#582472] text-white px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs"
              >
                <template #icon>
                  <span v-if="descargando[archivo.archivo]" class="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                  <FileDown v-else class="w-3.5 h-3.5" />
                </template>
                <span>{{ descargando[archivo.archivo] ? 'Descargando...' : 'Descargar' }}</span>
              </AppButton>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12 text-slate-400 dark:text-slate-500">
          <FolderArchive class="w-10 h-10 mx-auto opacity-30 mb-2" />
          <p class="text-xs font-semibold">No se encontraron formatos en esta categoría.</p>
        </div>

      </div>
    </section>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(107, 45, 139, 0.2);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 45, 139, 0.4);
}
</style>
