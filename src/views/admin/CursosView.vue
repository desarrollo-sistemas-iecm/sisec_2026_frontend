<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue'
import {
  BookOpen, Search, Palette, Save, Check, Sparkles, Filter,
  RefreshCw, Plus, Tag, Layers, CheckCircle2, ShieldCheck,
  RotateCcw, SlidersHorizontal
} from '@lucide/vue'
import api from '../../services/api'
import Swal from 'sweetalert2'
import AppModal from '../../components/AppModal.vue'
import AppCard from '../../components/ui/AppCard.vue'
import AppInput from '../../components/ui/AppInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import AppButton from '../../components/ui/AppButton.vue'
import { useToast } from '../../composables/useToast.js'

const toast = useToast()

const acciones = ref([])
const loading = ref(true)
const search = ref('')
const selectedVertiente = ref('')
const savingId = ref(null)

// Modal de Creación de Acción Educativa
const modalNuevaOpen = ref(false)
const creatingAccion = ref(false)

const defaultVertientes = [
  { id_vertiente: 1, vertiente: 'Mujeres', color: '#D946EF' },
  { id_vertiente: 2, vertiente: 'Jóvenes', color: '#10B981' },
  { id_vertiente: 3, vertiente: 'Masculinidades', color: '#3B82F6' },
  { id_vertiente: 4, vertiente: 'Normatividad', color: '#F59E0B' },
  { id_vertiente: 5, vertiente: 'Población en General', color: '#8B5CF6' }
]
const vertientesCatalogo = ref([...defaultVertientes])

const getVertienteColor = (rowOrName) => {
  if (!rowOrName) return '#8B5CF6'
  if (typeof rowOrName === 'object') {
    if (rowOrName.color_vertiente) return rowOrName.color_vertiente
    if (rowOrName.id_vertiente) {
      const match = vertientesCatalogo.value.find(v => Number(v.id_vertiente) === Number(rowOrName.id_vertiente))
      if (match?.color) return match.color
    }
    if (rowOrName.vertiente) {
      const match = vertientesCatalogo.value.find(v => (v.vertiente || '').toLowerCase().trim() === (rowOrName.vertiente || '').toLowerCase().trim())
      if (match?.color) return match.color
    }
  } else if (typeof rowOrName === 'string') {
    const match = vertientesCatalogo.value.find(v => (v.vertiente || '').toLowerCase().trim() === rowOrName.toLowerCase().trim())
    if (match?.color) return match.color
  }

  const fallbacks = {
    'mujeres': '#D946EF',
    'jóvenes': '#10B981',
    'jovenes': '#10B981',
    'masculinidades': '#3B82F6',
    'normatividad': '#F59E0B',
    'población en general': '#8B5CF6',
    'poblacion en general': '#8B5CF6'
  }
  const nameStr = typeof rowOrName === 'string' ? rowOrName : (rowOrName?.vertiente || '')
  return fallbacks[nameStr.toLowerCase().trim()] || '#8B5CF6'
}

const savingVertienteId = ref(null)

const updateVertienteColor = async (vert, event) => {
  const newColor = event.target.value
  const id = vert.id_vertiente
  savingVertienteId.value = id
  try {
    await api.put(`/admin/vertientes/${id}/color`, { color: newColor })
    vert.color = newColor
    // Actualizar reactivamente todas las acciones en la tabla
    acciones.value.forEach(a => {
      if (Number(a.id_vertiente) === Number(id) || (a.vertiente && a.vertiente.toLowerCase().trim() === vert.vertiente.toLowerCase().trim())) {
        a.color_vertiente = newColor
        a.color = newColor
      }
    })
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Color actualizado para "${vert.vertiente}"`,
      text: 'Sincronizado en tablas, captura y programación',
      showConfirmButton: false,
      timer: 2500,
      background: '#1e1b4b',
      color: '#ffffff'
    })
  } catch (error) {
    toast.error('No se pudo guardar el color de la vertiente.')
  } finally {
    savingVertienteId.value = null
  }
}

const formNueva = reactive({
  nombre_accion: '',
  id_vertiente: 1,
  color: '#6B2D8B'
})

const selectedVertienteNueva = computed(() => {
  return vertientesCatalogo.value.find(v => Number(v.id_vertiente) === Number(formNueva.id_vertiente))
})

// Al cambiar la vertiente en la nueva acción, heredar por defecto el color oficial de dicha vertiente
watch(() => formNueva.id_vertiente, (newId) => {
  const match = vertientesCatalogo.value.find(v => Number(v.id_vertiente) === Number(newId))
  if (match?.color) {
    formNueva.color = match.color
  }
})

// Paleta de colores predefinidos institucionales
const presetColors = [
  { name: 'Púrpura IECM', hex: '#6B2D8B' },
  { name: 'Violeta Eléctrico', hex: '#8B5CF6' },
  { name: 'Azul Cobalto', hex: '#2563EB' },
  { name: 'Azul Cielo', hex: '#0284C7' },
  { name: 'Verde Esmeralda', hex: '#059669' },
  { name: 'Teal Institucional', hex: '#009688' },
  { name: 'Ámbar Cálido', hex: '#D97706' },
  { name: 'Naranja Cívico', hex: '#EA580C' },
  { name: 'Rojo Coral', hex: '#DC2626' },
  { name: 'Magenta / Rosa', hex: '#DB2777' },
  { name: 'Índigo Profundo', hex: '#4F46E5' },
  { name: 'Cian Fresco', hex: '#0891B2' }
]

// Cálculo reactivo del siguiente consecutivo (ej. AE-31 -> AE-32)
const nextClaveSugerida = computed(() => {
  let maxNum = 0
  acciones.value.forEach(a => {
    const match = String(a.clave_accion || '').match(/^AE-(\d+)$/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num > maxNum) {
        maxNum = num
      }
    }
  })
  return `AE-${String(maxNum + 1).padStart(2, '0')}`
})

// Métricas y radials
const totalAccionesCount = computed(() => acciones.value.length)

// Conteo de acciones por vertiente
const conteoPorVertiente = computed(() => {
  const counts = {}
  vertientesCatalogo.value.forEach(v => {
    counts[v.id_vertiente] = 0
  })
  acciones.value.forEach(a => {
    const match = vertientesCatalogo.value.find(v => 
      Number(v.id_vertiente) === Number(a.id_vertiente) ||
      (a.vertiente && (v.vertiente || '').toLowerCase().trim() === a.vertiente.toLowerCase().trim())
    )
    if (match) {
      counts[match.id_vertiente] = (counts[match.id_vertiente] || 0) + 1
    }
  })
  return counts
})

// Porcentaje de cobertura del catálogo (con base de referencia 35 acciones institucionales)
const porcentajeCatalogo = computed(() => {
  if (!totalAccionesCount.value) return 0
  return Math.min(100, Math.round((totalAccionesCount.value / 35) * 100))
})

const loadAcciones = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/cursos')
    if (data.success) {
      acciones.value = (data.data || []).sort((a, b) => {
        const numA = parseInt(String(a.clave_accion || '').replace(/\D/g, ''), 10) || Number(a.id_accion) || 0
        const numB = parseInt(String(b.clave_accion || '').replace(/\D/g, ''), 10) || Number(b.id_accion) || 0
        return numA - numB
      })
      if (data.vertientes && data.vertientes.length > 0) {
        vertientesCatalogo.value = data.vertientes
      }
    }
  } catch (error) {
    toast.error('No se pudieron cargar las acciones del catálogo.')
  } finally {
    loading.value = false
  }
}

const vertientesList = computed(() => {
  const set = new Set()
  acciones.value.forEach(a => {
    if (a.vertiente) set.add(a.vertiente)
  })
  return Array.from(set)
})

const filteredAcciones = computed(() => {
  const term = search.value.trim().toLowerCase()
  const vert = selectedVertiente.value

  return acciones.value.filter(a => {
    const clave = (a.clave_accion || '').toLowerCase()
    const nombre = (a.nombre_accion || a.descripcion || '').toLowerCase()
    const matchesSearch = !term || clave.includes(term) || nombre.includes(term)
    const matchesVert = !vert || a.vertiente === vert
    return matchesSearch && matchesVert
  })
})

const openModalNueva = () => {
  formNueva.nombre_accion = ''
  const firstVert = vertientesCatalogo.value[0]
  formNueva.id_vertiente = firstVert?.id_vertiente || 1
  formNueva.color = firstVert?.color || '#6B2D8B'
  modalNuevaOpen.value = true
}

const submitNuevaAccion = async () => {
  if (!formNueva.nombre_accion?.trim()) {
    toast.warning('Por favor ingresa el nombre de la acción educativa.')
    return
  }
  if (!formNueva.id_vertiente) {
    toast.warning('Por favor selecciona la vertiente institucional.')
    return
  }

  creatingAccion.value = true
  try {
    const payload = {
      nombre_accion: formNueva.nombre_accion.trim(),
      id_vertiente: Number(formNueva.id_vertiente),
      color: formNueva.color || '#6B2D8B'
    }

    const { data } = await api.post('/admin/cursos', payload)
    if (data.success) {
      await Swal.fire({
        icon: 'success',
        title: '¡Acción Educativa Creada!',
        text: `Se ha registrado exitosamente la acción ${data.data?.clave_accion || nextClaveSugerida.value} en el catálogo institucional.`,
        confirmButtonColor: '#6B2D8B',
        background: '#1e1b4b',
        color: '#ffffff',
        customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold px-6 py-2.5' }
      })
      modalNuevaOpen.value = false
      await loadAcciones()
    }
  } catch (error) {
    const msg = error?.response?.data?.message || 'No se pudo crear la acción educativa.'
    toast.error(msg)
  } finally {
    creatingAccion.value = false
  }
}

const updateColor = async (row, event) => {
  const newColor = event.target.value
  const id = row.id_accion || row.idcurso
  savingId.value = id
  try {
    await api.put(`/admin/cursos/${id}/color`, { color: newColor })
    row.color = newColor
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Color actualizado para ${row.clave_accion || row.descripcion}`,
      showConfirmButton: false,
      timer: 2000,
      background: '#1e1b4b',
      color: '#ffffff'
    })
  } catch (error) {
    toast.error('No se pudo guardar el color.')
  } finally {
    savingId.value = null
  }
}

const resetColor = async (row) => {
  const id = row.id_accion || row.idcurso
  savingId.value = id
  try {
    const defaultColor = '#6B2D8B'
    await api.put(`/admin/cursos/${id}/color`, { color: defaultColor })
    row.color = defaultColor
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `Color restablecido para ${row.clave_accion || row.descripcion}`,
      showConfirmButton: false,
      timer: 2000,
      background: '#1e1b4b',
      color: '#ffffff'
    })
  } catch (error) {
    toast.error('No se pudo restablecer el color.')
  } finally {
    savingId.value = null
  }
}

onMounted(() => {
  loadAcciones()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Principal -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 rounded-xl shadow-xs">
          <BookOpen class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Catálogo de Acciones Educativas 2027
            </h1>
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Catálogo Oficial
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión centralizada del catálogo cívico institucional, vertientes normativas y paletas cromáticas para identificación visual en tablas, reportes y expedientes.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 self-start md:self-auto">
        <button
          type="button"
          @click="loadAcciones"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin text-purple-600' : ''" />
          <span>Actualizar</span>
        </button>

        <button
          type="button"
          @click="openModalNueva"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6B2D8B] hover:bg-[#582472] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus class="w-4 h-4 stroke-[2.5]" />
          Nueva Acción Educativa
        </button>
      </div>
    </header>

    <!-- Métricas Ejecutivas con Radial y Estadísticas -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Radial de Cobertura de Acciones -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg class="w-14 h-14 -rotate-90 transform" viewBox="0 0 36 36">
            <path class="text-slate-100 dark:text-slate-800 stroke-current" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="text-purple-600 stroke-current transition-all duration-700 ease-out" :stroke-dasharray="`${porcentajeCatalogo}, 100`" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span class="absolute text-xs font-black text-slate-800 dark:text-slate-100">{{ totalAccionesCount }}</span>
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones Registradas</span>
          <span class="text-base font-black text-slate-900 dark:text-white">{{ totalAccionesCount }} Acciones</span>
          <span class="block text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">Claves correlativas desde AE-01</span>
        </div>
      </div>

      <!-- Distribución por Vertientes -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Layers class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vertientes Normativas</span>
          <span class="text-base font-black text-slate-900 dark:text-white">5 Ejes Temáticos</span>
          <div class="flex items-center gap-1.5 mt-1">
            <span
              v-for="v in vertientesCatalogo"
              :key="v.id_vertiente"
              class="w-2.5 h-2.5 rounded-full inline-block"
              :style="{ backgroundColor: v.color || getVertienteColor(v) }"
              :title="`${v.vertiente}: ${conteoPorVertiente[v.id_vertiente] || 0} acciones`"
            ></span>
          </div>
        </div>
      </div>

      <!-- Siguiente Consecutivo Disponible -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center shrink-0">
          <Sparkles class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Siguiente Clave Correlativa</span>
          <span class="font-mono text-base font-black text-purple-800 dark:text-purple-300">{{ nextClaveSugerida }}</span>
          <span class="block text-[11px] text-slate-400 font-medium mt-0.5">Asignación correlativa oficial</span>
        </div>
      </div>
    </div>

    <!-- Panel Interactivo de Colores por Vertiente Institucional -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center text-[#6B2D8B] dark:text-purple-300">
            <Palette class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Colores por Vertiente Institucional
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-[#6B2D8B] dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                5 Vertientes
              </span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Personaliza el color distintivo de cada vertiente institucional. El cambio se actualizará en tiempo real en la tabla, Captura y Programación.
            </p>
          </div>
        </div>
      </div>

      <!-- Grid de las 5 vertientes con su selector y vista previa -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          v-for="vert in vertientesCatalogo"
          :key="vert.id_vertiente"
          class="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between gap-3 group"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" :title="vert.vertiente">
              {{ vert.vertiente }}
            </span>
            <div class="relative shrink-0 flex items-center">
              <input
                type="color"
                :value="vert.color || getVertienteColor(vert)"
                class="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 bg-transparent p-0.5 shadow-xs hover:scale-110 transition-transform"
                :title="`Haz clic para cambiar el color de ${vert.vertiente}`"
                @change="updateVertienteColor(vert, $event)"
              />
            </div>
          </div>

          <!-- Conteo de acciones de esta vertiente -->
          <div class="flex items-center justify-between text-[11px] text-slate-500">
            <span>Acciones vinculadas:</span>
            <span class="font-bold text-slate-700 dark:text-slate-300">{{ conteoPorVertiente[vert.id_vertiente] || 0 }}</span>
          </div>

          <!-- Badge de Vista Previa -->
          <div class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-xs transition-colors"
              :style="{
                backgroundColor: `${vert.color || getVertienteColor(vert)}15`,
                borderColor: `${vert.color || getVertienteColor(vert)}40`,
                color: vert.color || getVertienteColor(vert)
              }"
            >
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: vert.color || getVertienteColor(vert) }"></span>
              {{ vert.vertiente }}
            </span>
            <span class="font-mono text-[10px] font-bold text-slate-500 uppercase">
              {{ vert.color || getVertienteColor(vert) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenedor del Catálogo -->
    <AppCard>
      <template #header>
        <div class="grid gap-4 md:grid-cols-3 items-end">
          <div class="md:col-span-2">
            <AppInput
              v-model="search"
              placeholder="Buscar por clave (ej. AE-01) o nombre de la acción..."
              label="Buscar en el catálogo"
            >
              <template #icon><Search class="w-4 h-4" /></template>
            </AppInput>
          </div>
          <div>
            <AppSelect v-model="selectedVertiente" label="Filtrar por Vertiente">
              <option value="">Todas las vertientes</option>
              <option v-for="v in vertientesList" :key="v" :value="v">{{ v }}</option>
            </AppSelect>
          </div>
        </div>
      </template>

      <!-- Tabla de Acciones Educativas -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="w-12 px-4 py-3 text-center">#</th>
              <th class="px-4 py-3 w-28">Clave</th>
              <th class="px-6 py-3">Nombre de la Acción Educativa</th>
              <th class="px-6 py-3">Vertiente Institucional</th>
              <th class="px-6 py-3 text-center w-36">Color Distintivo</th>
              <th class="px-6 py-3 text-center w-48">Vista Previa Badge</th>
              <th class="px-4 py-3 text-center w-28">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="(row, index) in filteredAcciones"
              :key="row.id_accion || row.idcurso"
              class="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors border-l-4"
              :style="{ borderLeftColor: row.color || getVertienteColor(row) }"
            >
              <!-- Consecutivo -->
              <td class="px-4 py-4 text-center font-bold text-slate-400 text-xs">
                {{ index + 1 }}
              </td>

              <!-- Clave de Acción -->
              <td class="px-4 py-4 font-mono font-extrabold text-sm text-purple-900 dark:text-purple-300">
                {{ row.clave_accion || `ID-${row.idcurso}` }}
              </td>

              <!-- Nombre -->
              <td class="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                {{ row.nombre_accion || row.descripcion }}
              </td>

              <!-- Vertiente -->
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all duration-150 shadow-xs"
                  :style="{
                    backgroundColor: `${getVertienteColor(row)}15`,
                    borderColor: `${getVertienteColor(row)}40`,
                    color: getVertienteColor(row)
                  }"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: getVertienteColor(row) }"></span>
                  {{ row.vertiente || 'General' }}
                </span>
              </td>

              <!-- Input de Color Interactivo -->
              <td class="px-6 py-4 text-center">
                <div class="inline-flex items-center gap-2">
                  <input
                    type="color"
                    :value="row.color || '#6B2D8B'"
                    class="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 bg-transparent p-0.5 shadow-xs transition-transform hover:scale-110"
                    title="Haz clic para seleccionar un color"
                    @change="updateColor(row, $event)"
                  />
                  <span class="font-mono text-xs uppercase font-bold text-slate-600 dark:text-slate-400">
                    {{ row.color || '#6B2D8B' }}
                  </span>
                </div>
              </td>

              <!-- Vista Previa de Badge -->
              <td class="px-6 py-4 text-center">
                <span
                  class="px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs inline-flex items-center gap-1.5 transition-all"
                  :style="{ backgroundColor: row.color || '#6B2D8B' }"
                >
                  <Sparkles class="w-3.5 h-3.5" />
                  {{ row.clave_accion || 'AE-00' }}
                </span>
              </td>

              <!-- Botón Restablecer -->
              <td class="px-4 py-4 text-center">
                <AppButton
                  variant="ghost"
                  size="sm"
                  class="text-xs text-slate-400 hover:text-purple-700 hover:bg-purple-50 inline-flex items-center gap-1"
                  title="Restablecer al color por defecto"
                  @click="resetColor(row)"
                >
                  <RotateCcw class="w-3 h-3" />
                  Por defecto
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <!-- Modal Registrar Nueva Acción Educativa -->
    <AppModal
      :open="modalNuevaOpen"
      size="lg"
      title="Registrar Nueva Acción Educativa"
      @close="modalNuevaOpen = false"
    >
      <template #header>
        <div class="flex items-center gap-3 text-slate-900 dark:text-white">
          <div class="p-2.5 bg-purple-100 dark:bg-purple-950/70 text-[#6B2D8B] dark:text-purple-300 rounded-xl border border-purple-200/60 dark:border-purple-800/40 shadow-xs">
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Nueva Acción Educativa 2027</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Asignación correlativa oficial y color distintivo</p>
          </div>
        </div>
      </template>

      <form @submit.prevent="submitNuevaAccion" class="space-y-5">
        <!-- Card de Clave Asignada Automáticamente -->
        <div class="p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 flex items-center justify-between">
          <div class="space-y-0.5">
            <span class="text-xs font-semibold uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
              Clave Oficial Asignada
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400">
              Consecutivo correlativo calculado a partir de la última acción registrada.
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3.5 py-1.5 rounded-lg font-mono font-extrabold text-base bg-[#6B2D8B] text-white shadow-sm flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-purple-200" />
              {{ nextClaveSugerida }}
            </span>
          </div>
        </div>

        <!-- Nombre de la Acción -->
        <AppInput
          v-model="formNueva.nombre_accion"
          label="Nombre de la acción educativa"
          required
          placeholder="Ej. Taller de Derechos Cívicos y Participación Ciudadana"
        >
          <template #icon><BookOpen class="w-4 h-4 text-purple-600" /></template>
        </AppInput>

        <!-- Vertiente Institucional -->
        <div>
          <AppSelect
            v-model="formNueva.id_vertiente"
            label="Vertiente institucional vinculada"
            required
          >
            <template #icon><Tag class="w-4 h-4 text-purple-600" /></template>
            <option v-for="vert in vertientesCatalogo" :key="vert.id_vertiente" :value="vert.id_vertiente">
              {{ vert.vertiente }}
            </option>
          </AppSelect>
          <div v-if="selectedVertienteNueva" class="mt-1.5 flex items-center gap-2">
            <span class="text-[11px] text-slate-500">Color institucional de la vertiente:</span>
            <span
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border"
              :style="{
                backgroundColor: `${selectedVertienteNueva.color || getVertienteColor(selectedVertienteNueva)}15`,
                borderColor: `${selectedVertienteNueva.color || getVertienteColor(selectedVertienteNueva)}40`,
                color: selectedVertienteNueva.color || getVertienteColor(selectedVertienteNueva)
              }"
            >
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: selectedVertienteNueva.color || getVertienteColor(selectedVertienteNueva) }"></span>
              {{ selectedVertienteNueva.vertiente }}
            </span>
          </div>
        </div>

        <!-- Selector de Color Distintivo con Muestras y Vista Previa -->
        <div class="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <label class="label-iecm !mb-0">
              Color distintivo institucional
            </label>
            <span class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              {{ formNueva.color }}
            </span>
          </div>

          <!-- Selector de color + Muestras de paleta -->
          <div class="flex items-center gap-3 flex-wrap">
            <div class="relative flex items-center">
              <input
                type="color"
                v-model="formNueva.color"
                class="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 bg-transparent p-0.5 shadow-sm hover:scale-105 transition-transform"
                title="Haz clic para personalizar el color"
              />
            </div>

            <!-- Paleta rápida de muestras -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="preset in presetColors"
                :key="preset.hex"
                type="button"
                class="w-7 h-7 rounded-full border-2 transition-all cursor-pointer hover:scale-115 flex items-center justify-center shadow-xs"
                :style="{ backgroundColor: preset.hex }"
                :class="formNueva.color.toLowerCase() === preset.hex.toLowerCase() ? 'border-white ring-2 ring-purple-600 scale-110' : 'border-transparent'"
                :title="preset.name"
                @click="formNueva.color = preset.hex"
              >
                <Check v-if="formNueva.color.toLowerCase() === preset.hex.toLowerCase()" class="w-3.5 h-3.5 text-white stroke-[3]" />
              </button>
            </div>
          </div>

          <!-- Vista previa en vivo del Badge de la tabla de captura -->
          <div class="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div class="text-xs text-slate-600 dark:text-slate-400">
              <span class="font-semibold block text-slate-800 dark:text-slate-200">Identificador visual:</span>
              <span>Así se mostrará el badge y la línea de identificación en Captura y Programación.</span>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm inline-flex items-center gap-1.5 transition-all"
                :style="{ backgroundColor: formNueva.color }"
              >
                <Sparkles class="w-3.5 h-3.5" />
                {{ nextClaveSugerida }}
              </span>
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="modalNuevaOpen = false"
          class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors cursor-pointer"
        >
          Cancelar
        </button>

        <AppButton
          type="button"
          variant="primary"
          size="md"
          :loading="creatingAccion"
          class="px-6 py-2 text-sm font-semibold shadow-sm"
          @click="submitNuevaAccion"
        >
          <template #icon v-if="!creatingAccion"><Plus class="w-4 h-4" /></template>
          Guardar Acción Educativa
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
