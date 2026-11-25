<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  ClipboardList, Search, ChevronRight, ChevronDown,
  CheckCircle2, Users, BarChart3, Building,
  Calendar, Sparkles, Filter, RefreshCw, AlertCircle
} from '@lucide/vue'
import api from '../services/api.js'
import { useAuthStore } from '../stores/authStore.js'
import { useToast } from '../composables/useToast.js'
import { useGsapAnimations } from '../composables/useGsapAnimations.js'

import AppCard from '../components/ui/AppCard.vue'
import AppTable from '../components/ui/AppTable.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import AppButton from '../components/ui/AppButton.vue'

const authStore = useAuthStore()
const toast = useToast()
const { animarVista } = useGsapAnimations()

const isAdmin = computed(() => Number(authStore.user?.id_tipousuario || authStore.user?.permiso) === 2)
const isSuperAdmin = computed(() => Number(authStore.user?.id_tipousuario || authStore.user?.permiso) === 3)
const isPrivileged = computed(() => isAdmin.value || isSuperAdmin.value)
const userDistrito = computed(() => Number(authStore.user?.idsede || authStore.user?.id_distrito || 0))

const vistaRef = ref(null)
const loading = ref(false)
const acciones = ref([])

// Filtros
const search = ref('')
const selectedDistrito = ref('')
const dateFrom = ref('')
const dateTo = ref('')

// Estado de filas expandidas (Set de id_acciones_educativas)
const expandedRows = ref(new Set())
// Caché de encuestas por acción: { [id_accion]: { loading: boolean, data: [] } }
const encuestasCache = ref({})

const getLikertBadge = (val) => {
  switch (Number(val)) {
    case 5:
      return { text: '5 - Totalmente de acuerdo', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    case 4:
      return { text: '4 - De acuerdo', class: 'bg-teal-100 text-teal-800 border-teal-300' }
    case 3:
      return { text: '3 - Neutral', class: 'bg-amber-100 text-amber-800 border-amber-300' }
    case 2:
      return { text: '2 - En desacuerdo', class: 'bg-orange-100 text-orange-800 border-orange-300' }
    case 1:
      return { text: '1 - Totalmente en desacuerdo', class: 'bg-rose-100 text-rose-800 border-rose-300' }
    default:
      return { text: 'N/A', class: 'bg-slate-100 text-slate-600 border-slate-300' }
  }
}

// Cargar listado de acciones que tienen o pueden tener encuestas (ÚNICAMENTE CON FOLIO)
const loadAcciones = async () => {
  loading.value = true
  try {
    const params = {}
    if (isPrivileged.value) {
      if (selectedDistrito.value) {
        params.id_distrito = selectedDistrito.value
      }
    } else {
      params.id_distrito = userDistrito.value
    }

    const { data } = await api.get('/programacion-2027/admin/acciones', { params })
    const raw = data?.data ?? []
    
    // Si es distrital, filtrar además estrictamente por su propio distrito en frontend
    const scopedList = isPrivileged.value 
      ? raw 
      : raw.filter(a => Number(a.id_distrito) === userDistrito.value)

    // Únicamente acciones con folio oficial asignado y que no estén canceladas
    acciones.value = scopedList.filter(a => 
      a.folio_accion_educativa && 
      String(a.folio_accion_educativa).trim() !== '' && 
      !String(a.folio_accion_educativa).toLowerCase().includes('sin folio') &&
      Number(a.id_estado) !== 4
    )
  } catch (error) {
    toast.error('No se pudo cargar el listado de acciones.')
  } finally {
    loading.value = false
  }
}

// Alternar expansión de una fila de acción
const toggleExpand = async (row) => {
  const id = row.id_acciones_educativas
  if (expandedRows.value.has(id)) {
    expandedRows.value.delete(id)
    return
  }

  expandedRows.value.add(id)

  // Cargar encuestas si no están en caché
  if (!encuestasCache.value[id]) {
    encuestasCache.value[id] = { loading: true, data: [] }
    try {
      const { data } = await api.get(`/captura-2027/${id}/encuestas`)
      encuestasCache.value[id] = { loading: false, data: data?.data ?? [] }
      // Actualizar contador
      row.total_encuestas = (data?.data ?? []).length
    } catch (error) {
      encuestasCache.value[id] = { loading: false, data: [] }
      toast.error(`Error al cargar encuestas para la acción ${row.clave_accion}`)
    }
  }
}

// Filtrar acciones
const filteredAcciones = computed(() => {
  const term = search.value.trim().toLowerCase()
  const from = dateFrom.value
  const to = dateTo.value

  return acciones.value.filter((a) => {
    // Si no es Administrador ni SuperAdmin, limitar estrictamente al distrito asignado
    if (!isPrivileged.value && Number(a.id_distrito) !== userDistrito.value) {
      return false
    }

    // Garantizar que solo pasen actividades con folio oficial
    if (!a.folio_accion_educativa || !String(a.folio_accion_educativa).trim()) return false

    const fecha = String(a.fecha_programada || '').split('T')[0]
    if (from && fecha < from) return false
    if (to && fecha > to) return false

    if (!term) return true
    const haystack = `${a.folio_accion_educativa || ''} ${a.clave_accion || ''} ${a.nombre_accion || ''} ${a.nombre_institucion || ''}`.toLowerCase()
    return haystack.includes(term)
  })
})

// Métricas de encuestas para KPIs
const metrics = computed(() => {
  const totalAcciones = acciones.value.length
  const totalEncuestas = acciones.value.reduce((acc, a) => acc + Number(a.total_encuestas || 0), 0)
  const accionesConEncuestas = acciones.value.filter(a => Number(a.total_encuestas || 0) > 0).length
  return { totalAcciones, totalEncuestas, accionesConEncuestas }
})

onMounted(() => {
  loadAcciones()
})

watch(selectedDistrito, () => {
  loadAcciones()
})
</script>

<template>
  <div ref="vistaRef" class="space-y-6">
    <!-- Header Banner Minimalista y Profesional -->
    <header class="space-y-4 pb-4 border-b border-slate-200/90 dark:border-slate-800">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div class="space-y-1.5 max-w-2xl">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <div class="p-2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs">
                <ClipboardList class="w-6 h-6" />
              </div>
              <span>Módulo de Encuestas de Satisfacción 2027</span>
            </h2>
            <span v-if="isPrivileged" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
              Visión Global (33 Direcciones Distritales)
            </span>
            <span v-else class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Dirección Distrital {{ userDistrito }}
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Visualización jerárquica de todas las encuestas respondidas por los participantes en cada acción educativa. Consulta las respuestas sociodemográficas y la escala Likert registrada.
          </p>
        </div>

        <!-- Cards KPI Modernos de Alto Impacto para Encuestas -->
        <div class="grid grid-cols-2 gap-3.5 shrink-0 self-start lg:self-auto">
          <!-- Card 1: Total Encuestas -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 min-w-[175px] group">
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <ClipboardList class="w-4 h-4" />
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#6B2D8B] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/60 px-2.5 py-0.5 rounded-full">
                Total
              </span>
            </div>
            <div class="space-y-0.5">
              <span class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight block">
                {{ metrics.totalEncuestas }}
              </span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">
                Cuestionarios capturados
              </span>
            </div>
          </div>

          <!-- Card 2: Con Encuestas -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs hover:shadow-md transition-all duration-200 min-w-[175px] group">
            <div class="flex items-center justify-between mb-2">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <CheckCircle2 class="w-4 h-4" />
              </div>
              <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Con Encuestas
              </span>
            </div>
            <div class="space-y-0.5">
              <span class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight block">
                {{ metrics.accionesConEncuestas }}
              </span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block truncate" :title="isPrivileged ? `${metrics.accionesConEncuestas} de ${metrics.totalAcciones} acciones con folio` : `${metrics.accionesConEncuestas} de ${metrics.totalAcciones} acciones de tu distrito`">
                {{ isPrivileged ? `de ${metrics.totalAcciones} con folio` : `de ${metrics.totalAcciones} en D${userDistrito}` }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenedor Maestro -->
    <AppCard>
      <template #header>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
          <div class="lg:col-span-2">
            <AppInput
              v-model="search"
              placeholder="Buscar por folio, clave de acción, institución..."
              label="Buscar Acción Educativa"
            >
              <template #icon><Search class="w-4 h-4" /></template>
            </AppInput>
          </div>

          <!-- Selector de Distrito para Admin/Superadmin | Indicador Fijo para Distrital -->
          <div v-if="isPrivileged">
            <AppSelect v-model="selectedDistrito" label="Distrito">
              <option value="">Todos los distritos (1-33)</option>
              <option v-for="d in 33" :key="d" :value="d">Distrito {{ d }}</option>
            </AppSelect>
          </div>
          <div v-else>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Distrito Territorial
            </label>
            <div class="h-10 px-3.5 flex items-center justify-between rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs font-bold text-[#6B2D8B] dark:text-purple-300">
              <span class="flex items-center gap-2">
                <Building class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
                Distrito {{ userDistrito }}
              </span>
              <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                Tu Sede
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <AppInput v-model="dateFrom" type="date" label="Desde" class="w-1/2" />
            <AppInput v-model="dateTo" type="date" label="Hasta" class="w-1/2" />
          </div>
        </div>
      </template>

      <!-- Tabla Maestra Dinámica -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="w-10 px-3 py-3 text-center"></th>
              <th class="px-4 py-3">Folio Acción</th>
              <th class="px-4 py-3">Acción Educativa</th>
              <th class="px-4 py-3">Distrito</th>
              <th class="px-4 py-3">Institución / Espacio</th>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3 text-center">Total Encuestas</th>
              <th class="px-4 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <template v-for="row in filteredAcciones" :key="row.id_acciones_educativas">
              <!-- Fila Maestra -->
              <tr
                class="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer"
                :class="{ 'bg-purple-50/60 dark:bg-purple-950/30': expandedRows.has(row.id_acciones_educativas) }"
                @click="toggleExpand(row)"
              >
                <!-- Botón Expandir / Colapsar -->
                <td class="px-3 py-4 text-center">
                  <button
                    class="p-1.5 rounded-lg text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-transform duration-200"
                    :class="{ 'rotate-90': expandedRows.has(row.id_acciones_educativas) }"
                  >
                    <ChevronRight class="w-4 h-4" />
                  </button>
                </td>

                <!-- Folio Oficial (Verde) -->
                <td class="px-4 py-4 font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {{ row.folio_accion_educativa }}
                </td>

                <!-- Acción Educativa -->
                <td class="px-4 py-4">
                  <div class="flex items-center gap-2">
                    <span
                      class="px-2 py-0.5 rounded text-xs font-bold text-white shadow-xs shrink-0"
                      :style="{ backgroundColor: row.color || '#6B2D8B' }"
                    >
                      {{ row.clave_accion }}
                    </span>
                    <span class="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1" :title="row.nombre_accion">
                      {{ row.nombre_accion }}
                    </span>
                  </div>
                </td>

                <!-- Distrito -->
                <td class="px-4 py-4">
                  <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Distrito {{ row.id_distrito || row.distrito || 1 }}
                  </span>
                </td>

                <!-- Institución -->
                <td class="px-4 py-4">
                  <span class="font-medium text-slate-700 dark:text-slate-300 line-clamp-1" :title="row.nombre_institucion">
                    {{ row.nombre_institucion }}
                  </span>
                </td>

                <!-- Fecha -->
                <td class="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                  {{ String(row.fecha_programada || '').split('T')[0] }}
                </td>

                <!-- Total de Encuestas -->
                <td class="px-4 py-4 text-center">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-bold shadow-xs inline-flex items-center gap-1"
                    :class="Number(row.total_encuestas) > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-500'"
                  >
                    <CheckCircle2 v-if="Number(row.total_encuestas) > 0" class="w-3.5 h-3.5 text-emerald-600" />
                    {{ row.total_encuestas || 0 }} encuestas
                  </span>
                </td>

                <!-- Botón Desplegar -->
                <td class="px-4 py-4 text-center">
                  <AppButton
                    variant="ghost"
                    size="sm"
                    class="text-purple-700 hover:bg-purple-100"
                    @click.stop="toggleExpand(row)"
                  >
                    {{ expandedRows.has(row.id_acciones_educativas) ? 'Ocultar' : 'Ver Respuestas' }}
                  </AppButton>
                </td>
              </tr>

              <!-- Fila Detalle (Desplegable 1:N Encuestas) -->
              <tr v-if="expandedRows.has(row.id_acciones_educativas)" class="bg-slate-50/80 dark:bg-slate-900/60">
                <td colspan="8" class="p-4 sm:p-6 border-l-4 border-l-[#6B2D8B]">
                  <!-- Cargando detalle -->
                  <div v-if="encuestasCache[row.id_acciones_educativas]?.loading" class="py-6 text-center text-sm text-slate-500">
                    <RefreshCw class="w-5 h-5 text-purple-600 animate-spin mx-auto mb-2" />
                    Cargando encuestas registradas para esta acción educativa...
                  </div>

                  <!-- Sin encuestas -->
                  <div
                    v-else-if="!encuestasCache[row.id_acciones_educativas]?.data || encuestasCache[row.id_acciones_educativas]?.data.length === 0"
                    class="py-6 text-center text-slate-500 text-sm bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
                  >
                    <AlertCircle class="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    No hay encuestas individuales registradas todavía para esta acción educativa.
                  </div>

                  <!-- Listado detallado de encuestas -->
                  <div v-else class="space-y-4">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
                        <ClipboardList class="w-4 h-4 text-purple-600" />
                        Encuestas de Satisfacción Registradas ({{ encuestasCache[row.id_acciones_educativas].data.length }})
                      </h4>
                      <span class="text-xs text-slate-500">
                        Cada participante cuenta con su registro individual y folio secuencial.
                      </span>
                    </div>

                    <!-- Subtabla de Encuestas -->
                    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                      <table class="w-full text-left text-xs">
                        <thead class="bg-purple-100/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold uppercase border-b border-purple-200 dark:border-purple-800">
                          <tr>
                            <th class="px-4 py-2.5">Folio Encuesta</th>
                            <th class="px-4 py-2.5">Edad</th>
                            <th class="px-4 py-2.5">Género</th>
                            <th class="px-3 py-2.5 text-center" title="P3: Claridad temas">P3</th>
                            <th class="px-3 py-2.5 text-center" title="P4: Facilitador">P4</th>
                            <th class="px-3 py-2.5 text-center" title="P5: Materiales">P5</th>
                            <th class="px-3 py-2.5 text-center" title="P6: Utilidad cívica">P6</th>
                            <th class="px-3 py-2.5 text-center" title="P7: Tiempo asignado">P7</th>
                            <th class="px-3 py-2.5 text-center" title="P8: Satisfacción general">P8</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                          <tr
                            v-for="encuesta in encuestasCache[row.id_acciones_educativas].data"
                            :key="encuesta.id_encuestas"
                            class="hover:bg-slate-50 dark:hover:bg-slate-750"
                          >
                            <!-- Folio Encuesta -->
                            <td class="px-4 py-3 font-mono font-bold text-purple-900 dark:text-purple-300">
                              {{ encuesta.folio_encuesta }}
                            </td>

                            <!-- Edad -->
                            <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {{ encuesta.p1_edad_persona_asistente }} años
                            </td>

                            <!-- Género -->
                            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {{ encuesta.genero || 'No especificado' }}
                            </td>

                            <!-- P3 - P8 Respuestas Likert -->
                            <td class="px-3 py-3 text-center">
                              <span class="px-2 py-0.5 rounded text-[11px] font-bold border" :class="getLikertBadge(encuesta.p3).class" :title="getLikertBadge(encuesta.p3).text">
                                {{ encuesta.p3 }}
                              </span>
                            </td>
                            <td class="px-3 py-3 text-center">
                              <span class="px-2 py-0.5 rounded text-[11px] font-bold border" :class="getLikertBadge(encuesta.p4).class" :title="getLikertBadge(encuesta.p4).text">
                                {{ encuesta.p4 }}
                              </span>
                            </td>
                            <td class="px-3 py-3 text-center">
                              <span class="px-2 py-0.5 rounded text-[11px] font-bold border" :class="getLikertBadge(encuesta.p5).class" :title="getLikertBadge(encuesta.p5).text">
                                {{ encuesta.p5 }}
                              </span>
                            </td>
                            <td class="px-3 py-3 text-center">
                              <span class="px-2 py-0.5 rounded text-[11px] font-bold border" :class="getLikertBadge(encuesta.p6).class" :title="getLikertBadge(encuesta.p6).text">
                                {{ encuesta.p6 }}
                              </span>
                            </td>
                            <td class="px-3 py-3 text-center">
                              <span class="px-2 py-0.5 rounded text-[11px] font-bold border" :class="getLikertBadge(encuesta.p7).class" :title="getLikertBadge(encuesta.p7).text">
                                {{ encuesta.p7 }}
                              </span>
                            </td>
                            <td class="px-3 py-3 text-center">
                              <span class="px-2 py-0.5 rounded text-[11px] font-bold border" :class="getLikertBadge(encuesta.p8).class" :title="getLikertBadge(encuesta.p8).text">
                                {{ encuesta.p8 }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <!-- Estado Vacío -->
            <tr v-if="filteredAcciones.length === 0 && !loading">
              <td colspan="8" class="py-12 text-center text-slate-500 dark:text-slate-400">
                <ClipboardList class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p class="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {{ isPrivileged ? 'No se encontraron acciones educativas con los filtros seleccionados.' : `No hay acciones educativas registradas para el Distrito ${userDistrito}.` }}
                </p>
                <p class="text-xs text-slate-400 mt-1">
                  Las encuestas de satisfacción se visualizan para acciones educativas que cuentan con folio institucional.
                </p>
              </td>
            </tr>

            <!-- Estado Cargando -->
            <tr v-if="loading">
              <td colspan="8" class="py-12 text-center text-slate-500">
                <RefreshCw class="w-7 h-7 text-[#6B2D8B] animate-spin mx-auto mb-2" />
                <p class="text-xs font-semibold">Cargando encuestas distritales...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>
