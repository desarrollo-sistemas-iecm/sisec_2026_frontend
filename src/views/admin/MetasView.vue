<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  Target, Bell, Send, CheckCircle2, AlertCircle, RefreshCw,
  Edit2, Plus, Calendar, Building2, BarChart2, Check, X, ShieldAlert
} from '@lucide/vue'
import api from '../../services/api.js'
import { useToast } from '../../composables/useToast.js'
import Swal from 'sweetalert2'

const toast = useToast()

const activeTab = ref('metas') // 'metas' | 'recordatorios'
const loading = ref(false)

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: METAS ANUALES
// ═══════════════════════════════════════════════════════════════════════════
const metasList = ref([])
const anioSeleccionado = ref(2027)

const metaForm = ref({
  id_meta: null,
  anio: 2027,
  id_distrito: 0, // 0 = Todos los distritos
  meta_anual: 4500,
  descripcion: ''
})

const isEditingMeta = ref(false)

const distritosOptions = computed(() => {
  const options = [{ id: 0, nombre: 'Todos los distritos (Meta Global Institucional)' }]
  for (let i = 1; i <= 33; i++) {
    options.push({ id: i, nombre: `Dirección Distrital ${i < 10 ? '0' + i : i}` })
  }
  options.push({ id: 99, nombre: 'Oficinas Centrales' })
  return options
})

const fetchMetas = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/metas', {
      params: { anio: anioSeleccionado.value }
    })
    if (data?.success && data?.data) {
      metasList.value = data.data
    }
  } catch (err) {
    console.error('Error cargando metas:', err)
    toast.error('No se pudieron cargar las metas institucionales')
  } finally {
    loading.value = false
  }
}

const handleSaveMeta = async () => {
  const metaNum = Number(metaForm.value.meta_anual)
  if (!metaNum || isNaN(metaNum) || metaNum < 1 || metaNum > 99999) {
    toast.warning('Por favor ingresa una meta válida de 4 o 5 dígitos (ej. 4500 o 1716)')
    return
  }

  loading.value = true
  try {
    if (isEditingMeta.value && metaForm.value.id_meta) {
      // Edición de meta existente
      const { data } = await api.put(`/admin/metas/${metaForm.value.id_meta}`, {
        meta_anual: metaNum,
        descripcion: metaForm.value.descripcion
      })
      if (data?.success) {
        toast.success(data.message || 'Meta actualizada correctamente')
        cancelEditMeta()
        await fetchMetas()
      }
    } else {
      // Creación de nueva meta
      const { data } = await api.post('/admin/metas', {
        anio: metaForm.value.anio,
        id_distrito: metaForm.value.id_distrito,
        meta_anual: metaNum,
        descripcion: metaForm.value.descripcion
      })
      if (data?.success) {
        toast.success(data.message || 'Meta establecida correctamente')
        resetMetaForm()
        await fetchMetas()
      }
    }
  } catch (err) {
    console.error('Error guardando meta:', err)
    toast.error(err.response?.data?.message || 'Error al guardar la meta')
  } finally {
    loading.value = false
  }
}

const handleEditMeta = (item) => {
  isEditingMeta.value = true
  metaForm.value = {
    id_meta: item.id_meta,
    anio: item.anio,
    id_distrito: item.id_distrito,
    meta_anual: item.meta_anual,
    descripcion: item.descripcion || ''
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEditMeta = () => {
  isEditingMeta.value = false
  resetMetaForm()
}

const resetMetaForm = () => {
  metaForm.value = {
    id_meta: null,
    anio: 2027,
    id_distrito: 0,
    meta_anual: 4500,
    descripcion: ''
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: RECORDATORIOS MENSUALES
// ═══════════════════════════════════════════════════════════════════════════
const recordatoriosList = ref([])

const recordatorioForm = ref({
  id_recordatorio: null,
  titulo: 'Recordatorio de Cumplimiento de Meta Anual',
  mensaje: 'Estimadas Direcciones Distritales: Se les recuerda avanzar en la calendarización, captura y conclusión oportuna de sus acciones educativas con sus respectivas evidencias y encuestas de satisfacción para dar cumplimiento a la meta anual establecida.',
  frecuencia: 'mensual',
  dia_disparo: 1,
  hora_disparo: '09:00',
  id_distrito_destino: 0,
  activo: true
})

const isEditingRecordatorio = ref(false)

const diasMesOptions = [
  { val: 1, label: 'Día 1 de cada mes (Inicio de mes)' },
  { val: 5, label: 'Día 5 de cada mes' },
  { val: 10, label: 'Día 10 de cada mes' },
  { val: 15, label: 'Día 15 de cada mes (Quincena)' },
  { val: 20, label: 'Día 20 de cada mes' },
  { val: 25, label: 'Día 25 de cada mes (Cierre mensual próximo)' },
  { val: 28, label: 'Día 28 de cada mes (Cierre ordinario)' }
]

const fetchRecordatorios = async () => {
  try {
    const { data } = await api.get('/admin/recordatorios')
    if (data?.success && data?.data) {
      recordatoriosList.value = data.data
    }
  } catch (err) {
    console.error('Error cargando recordatorios:', err)
  }
}

const handleSaveRecordatorio = async () => {
  if (!recordatorioForm.value.mensaje.trim()) {
    toast.warning('El mensaje del recordatorio no puede estar vacío')
    return
  }

  loading.value = true
  try {
    const { data } = await api.post('/admin/recordatorios', recordatorioForm.value)
    if (data?.success) {
      toast.success(data.message || 'Recordatorio guardado')
      resetRecordatorioForm()
      await fetchRecordatorios()
    }
  } catch (err) {
    console.error('Error guardando recordatorio:', err)
    toast.error('Error al guardar recordatorio')
  } finally {
    loading.value = false
  }
}

const handleEditRecordatorio = (rec) => {
  isEditingRecordatorio.value = true
  recordatorioForm.value = {
    id_recordatorio: rec.id_recordatorio,
    titulo: rec.titulo,
    mensaje: rec.mensaje,
    frecuencia: rec.frecuencia || 'mensual',
    dia_disparo: rec.dia_disparo || 1,
    hora_disparo: rec.hora_disparo || '09:00',
    id_distrito_destino: rec.id_distrito_destino || 0,
    activo: Boolean(rec.activo)
  }
}

const cancelEditRecordatorio = () => {
  isEditingRecordatorio.value = false
  resetRecordatorioForm()
}

const resetRecordatorioForm = () => {
  recordatorioForm.value = {
    id_recordatorio: null,
    titulo: 'Recordatorio de Cumplimiento de Meta Anual',
    mensaje: 'Estimadas Direcciones Distritales: Se les recuerda avanzar en la calendarización, captura y conclusión oportuna de sus acciones educativas con sus respectivas evidencias y encuestas de satisfacción para dar cumplimiento a la meta anual establecida.',
    frecuencia: 'mensual',
    dia_disparo: 1,
    hora_disparo: '09:00',
    id_distrito_destino: 0,
    activo: true
  }
}

const handleDispararAhora = async (rec) => {
  const confirm = await Swal.fire({
    title: '¿Disparar Recordatorio Ahora?',
    text: `Se enviará la notificación inmediatamente a ${rec.id_distrito_destino === 0 ? 'las 33 Direcciones Distritales' : `la Dirección Distrital ${rec.id_distrito_destino}`}.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#6B2D8B',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, disparar recordatorio',
    cancelButtonText: 'Cancelar'
  })

  if (!confirm.isConfirmed) return

  loading.value = true
  try {
    const { data } = await api.post(`/admin/recordatorios/${rec.id_recordatorio}/disparar`)
    if (data?.success) {
      toast.success(data.message || 'Recordatorio enviado exitosamente')
      await fetchRecordatorios()
    }
  } catch (err) {
    console.error('Error disparando recordatorio:', err)
    toast.error('Error al disparar recordatorio')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMetas()
  fetchRecordatorios()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado del Submódulo -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="p-2.5 rounded-xl bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/60 dark:text-purple-300">
            <Target class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">
              Metas Anuales y Recordatorios Distritales
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Definición de metas de acciones educativas finalizadas y automatización de avisos a los 33 distritos.
            </p>
          </div>
        </div>
      </div>

      <!-- Selector de Pestañas Internas -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
        <button
          @click="activeTab = 'metas'"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          :class="activeTab === 'metas' ? 'bg-[#6B2D8B] text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'"
        >
          <Target class="w-4 h-4" />
          Metas Anuales
        </button>
        <button
          @click="activeTab = 'recordatorios'"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          :class="activeTab === 'recordatorios' ? 'bg-[#6B2D8B] text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'"
        >
          <Bell class="w-4 h-4" />
          Recordatorios por Mes
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- PESTAÑA 1: GESTIÓN DE METAS ANUALES                                    -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'metas'" class="space-y-6">
      
      <!-- Formulario para Crear / Editar Meta -->
      <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
          <div class="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <Plus v-if="!isEditingMeta" class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
            <Edit2 v-else class="w-4 h-4 text-amber-500" />
            <span>{{ isEditingMeta ? 'Editar Meta Anual Establecida' : 'Establecer Nueva Meta Anual' }}</span>
          </div>
          <span v-if="isEditingMeta" class="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
            Modo Edición
          </span>
        </div>

        <form @submit.prevent="handleSaveMeta" class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <!-- Campo 1: Meta a establecer (int 4 dígitos) -->
          <div class="md:col-span-4">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Meta de Acciones Finalizadas (4 dígitos) *
            </label>
            <div class="relative">
              <input
                v-model.number="metaForm.meta_anual"
                type="number"
                min="1"
                max="99999"
                step="1"
                required
                placeholder="Ej. 4500"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white font-mono text-base font-bold focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all"
              />
              <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                acciones
              </span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Ingresa el objetivo numérico anual de acciones concluidas.
            </p>
          </div>

          <!-- Campo 2: Alcance Distrital (Todos o uno específico) -->
          <div class="md:col-span-5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Alcance Distrital *
            </label>
            <select
              v-model="metaForm.id_distrito"
              :disabled="isEditingMeta"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option v-for="opt in distritosOptions" :key="opt.id" :value="opt.id">
                {{ opt.nombre }}
              </option>
            </select>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Selecciona si la meta aplica a los 33 distritos o a uno individual.
            </p>
          </div>

          <!-- Campo 3: Año de la Meta (DESHABILITADO) -->
          <div class="md:col-span-3">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Año del Ejercicio (Deshabilitado)
            </label>
            <div class="relative">
              <input
                :value="metaForm.anio"
                type="text"
                disabled
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-mono text-sm font-bold cursor-not-allowed select-none"
              />
              <Calendar class="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Vigencia fija para el ejercicio en curso.
            </p>
          </div>

          <!-- Campo 4: Descripción Opcional -->
          <div class="md:col-span-9">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Descripción o Justificación Institucional (Opcional)
            </label>
            <input
              v-model="metaForm.descripcion"
              type="text"
              maxlength="250"
              placeholder="Ej. Meta Institucional Anual 2027 conforme al programa operativo anual."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all"
            />
          </div>

          <!-- Botones de Acción -->
          <div class="md:col-span-3 flex items-end gap-2">
            <button
              v-if="isEditingMeta"
              @click="cancelEditMeta"
              type="button"
              class="w-1/2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="py-2.5 px-4 rounded-xl bg-[#6B2D8B] hover:bg-[#582473] text-white font-bold text-xs shadow-md shadow-purple-900/20 transition-all flex items-center justify-center gap-2"
              :class="isEditingMeta ? 'w-1/2' : 'w-full'"
            >
              <Check class="w-4 h-4" />
              <span>{{ isEditingMeta ? 'Guardar Cambios' : 'Crear Meta' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Listado de Metas Creadas -->
      <div class="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <BarChart2 class="w-5 h-5 text-[#6B2D8B] dark:text-purple-400" />
            <h2 class="text-base font-bold text-slate-800 dark:text-white">
              Metas Establecidas para el Ejercicio {{ anioSeleccionado }}
            </h2>
          </div>
          <button
            @click="fetchMetas"
            class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all"
            title="Refrescar listado"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th class="py-3 px-4">Año</th>
                <th class="py-3 px-4">Alcance / Sede</th>
                <th class="py-3 px-4 text-right">Meta Anual</th>
                <th class="py-3 px-4 text-right">Realizadas</th>
                <th class="py-3 px-4">Avance (%)</th>
                <th class="py-3 px-4">Estatus</th>
                <th class="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <tr v-if="metasList.length === 0">
                <td colspan="7" class="py-8 text-center text-slate-400">
                  No hay metas anuales configuradas para este ejercicio.
                </td>
              </tr>
              <tr
                v-for="item in metasList"
                :key="item.id_meta"
                class="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
              >
                <td class="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                  {{ item.anio }}
                </td>
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-800 dark:text-white">
                    {{ item.distrito_nombre }}
                  </div>
                  <div v-if="item.descripcion" class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {{ item.descripcion }}
                  </div>
                </td>
                <td class="py-3.5 px-4 text-right font-mono font-black text-slate-800 dark:text-white text-base">
                  {{ Number(item.meta_anual).toLocaleString('es-MX') }}
                </td>
                <td class="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  {{ Number(item.total_finalizadas || 0).toLocaleString('es-MX') }}
                </td>
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-2">
                    <div class="w-24 bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        class="bg-[#6B2D8B] h-2 rounded-full transition-all duration-500"
                        :style="{ width: `${Math.min(100, item.porcentaje_avance || 0)}%` }"
                      ></div>
                    </div>
                    <span class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {{ item.porcentaje_avance }}%
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Activa
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <button
                    @click="handleEditMeta(item)"
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#6B2D8B] text-slate-700 hover:text-white dark:bg-white/5 dark:text-slate-300 dark:hover:bg-[#6B2D8B] dark:hover:text-white font-semibold text-xs transition-all shadow-xs"
                    title="Editar cantidad de meta"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                    <span>Editar meta</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- PESTAÑA 2: RECORDATORIOS POR MES PARA DISTRITOS                        -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'recordatorios'" class="space-y-6">
      
      <!-- Formulario de Configuración de Recordatorio -->
      <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
          <div class="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <Bell class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
            <span>{{ isEditingRecordatorio ? 'Editar Recordatorio' : 'Configurar Recordatorio Automático para Distritos' }}</span>
          </div>
          <span v-if="isEditingRecordatorio" class="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
            Modo Edición
          </span>
        </div>

        <form @submit.prevent="handleSaveRecordatorio" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <!-- Título del recordatorio -->
            <div class="md:col-span-8">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Título del Aviso / Notificación *
              </label>
              <input
                v-model="recordatorioForm.titulo"
                type="text"
                required
                maxlength="150"
                placeholder="Ej. Recordatorio de Cumplimiento de Meta Anual"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all"
              />
            </div>

            <!-- Destinatarios -->
            <div class="md:col-span-4">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Destinatarios *
              </label>
              <select
                v-model="recordatorioForm.id_distrito_destino"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all"
              >
                <option :value="0">Todos los distritos (33 Direcciones)</option>
                <option v-for="i in 33" :key="i" :value="i">
                  Dirección Distrital {{ i < 10 ? '0' + i : i }}
                </option>
              </select>
            </div>

            <!-- Contenido del mensaje personalizado -->
            <div class="md:col-span-12">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contenido del Mensaje del Recordatorio (Personalizado por Administrador) *
              </label>
              <textarea
                v-model="recordatorioForm.mensaje"
                rows="3"
                required
                placeholder="Redacta el mensaje que recibirán los operadores en su buzón de notificaciones..."
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all leading-relaxed"
              ></textarea>
            </div>

            <!-- Frecuencia / Día de disparo -->
            <div class="md:col-span-6">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Día del Mes para el Disparo Automático *
              </label>
              <select
                v-model="recordatorioForm.dia_disparo"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all"
              >
                <option v-for="opt in diasMesOptions" :key="opt.val" :value="opt.val">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Hora de disparo -->
            <div class="md:col-span-3">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Hora de Disparo (24 hrs) *
              </label>
              <input
                v-model="recordatorioForm.hora_disparo"
                type="time"
                required
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white text-sm font-mono font-medium focus:ring-2 focus:ring-[#6B2D8B] focus:border-transparent transition-all"
              />
            </div>

            <!-- Switch Activo -->
            <div class="md:col-span-3 flex items-center pt-6">
              <label class="relative inline-flex items-center cursor-pointer select-none">
                <input
                  v-model="recordatorioForm.activo"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#6B2D8B]"></div>
                <span class="ml-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {{ recordatorioForm.activo ? 'Disparo Activo' : 'Pausado' }}
                </span>
              </label>
            </div>
          </div>

          <!-- Botones -->
          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              v-if="isEditingRecordatorio"
              @click="cancelEditRecordatorio"
              type="button"
              class="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="py-2.5 px-6 rounded-xl bg-[#6B2D8B] hover:bg-[#582473] text-white font-bold text-xs shadow-md shadow-purple-900/20 transition-all flex items-center gap-2"
            >
              <Check class="w-4 h-4" />
              <span>{{ isEditingRecordatorio ? 'Actualizar Recordatorio' : 'Guardar Recordatorio' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Listado de Recordatorios Guardados -->
      <div class="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Bell class="w-5 h-5 text-[#6B2D8B] dark:text-purple-400" />
            <h2 class="text-base font-bold text-slate-800 dark:text-white">
              Historial y Estado de Recordatorios Programados
            </h2>
          </div>
          <button
            @click="fetchRecordatorios"
            class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all"
            title="Refrescar listado"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>

        <div class="divide-y divide-slate-100 dark:divide-white/5">
          <div v-if="recordatoriosList.length === 0" class="p-8 text-center text-slate-400 text-sm">
            No se han registrado recordatorios automáticos.
          </div>
          <div
            v-for="rec in recordatoriosList"
            :key="rec.id_recordatorio"
            class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <div class="space-y-1.5 max-w-2xl">
              <div class="flex items-center gap-2.5">
                <span class="font-bold text-slate-800 dark:text-white text-sm">
                  {{ rec.titulo }}
                </span>
                <span
                  class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                  :class="rec.activo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'"
                >
                  {{ rec.activo ? 'Activo' : 'Pausado' }}
                </span>
                <span class="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  {{ rec.id_distrito_destino === 0 ? 'Todos los distritos' : `Distrito ${rec.id_distrito_destino}` }}
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {{ rec.mensaje }}
              </p>
              <div class="flex items-center gap-4 text-[11px] text-slate-400 pt-1 font-mono">
                <span>Frecuencia: Día {{ rec.dia_disparo }} a las {{ rec.hora_disparo }} hrs</span>
                <span>• Disparos realizados: {{ rec.total_disparos || 0 }}</span>
                <span v-if="rec.ultimo_disparo">• Último: {{ new Date(rec.ultimo_disparo).toLocaleString('es-MX') }}</span>
              </div>
            </div>

            <!-- Acciones -->
            <div class="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                @click="handleEditRecordatorio(rec)"
                class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all"
                title="Editar recordatorio"
              >
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                @click="handleDispararAhora(rec)"
                :disabled="loading"
                class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all"
                title="Enviar notificación inmediata a los distritos"
              >
                <Send class="w-3.5 h-3.5" />
                <span>Disparar recordatorio ahora</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>
