<script setup>
import { computed, ref, watch, reactive } from 'vue'
import Swal from 'sweetalert2'
import {
  FileText, Upload, Image, CheckCircle, Lock, AlertCircle,
  Clock, Calendar, Users, Eye, Download, ShieldCheck
} from '@lucide/vue'
import api from '../../services/api.js'
import AppModal from '../AppModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppInput from '../ui/AppInput.vue'
import { useToast } from '../../composables/useToast.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  actividad: { type: Object, default: null },
  isReadOnly: { type: Boolean, default: false } // Para Administrador o cuando está Finalizada
})

const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const saving = ref(false)
const finalizando = ref(false)

// Campos de Captura
const modalidad = ref(0) // 0: Presencial, 1: Virtual
const fechaRealizacion = ref('')
const duracionHora = ref('01:00')
const duracionRealActividad = ref('01:00')

// Matriz Demográfica (5 Géneros x 6 Grupos de Edad)
const generosList = [
  { key: 'mujeres', label: 'Mujer' },
  { key: 'hombres', label: 'Hombre' },
  { key: 'no_binario', label: 'Persona no binaria' },
  { key: 'Otro', label: 'Otro' },
  { key: 'prefiero_no_decirlo', label: 'Prefiero no decirlo' }
]

const gruposEdadList = [
  { idx: 1, label: 'Primera infancia (0 - 5 años)' },
  { idx: 2, label: 'Niñez (6 - 11 años)' },
  { idx: 3, label: 'Adolescencia (12 - 17 años)' },
  { idx: 4, label: 'Jóvenes (18 - 29 años)' },
  { idx: 5, label: 'Personas adultas (30 - 59 años)' },
  { idx: 6, label: 'Personas mayores (60+ años)' }
]

// Matriz reactiva para almacenar los conteos
const matriz = reactive({})
generosList.forEach(g => {
  gruposEdadList.forEach(e => {
    matriz[`G_${g.key}_${e.idx}`] = 0
  })
})

// Archivos adjuntos
const archivo1 = ref(null) // Formato registro (10 MB)
const archivo2 = ref(null) // Formato asistencia (10 MB)
const archivo3 = ref(null) // Evidencia foto (10 MB)
const archivo4 = ref(null) // Encuesta satisfacción (20 MB)

// Archivos ya existentes en BD
const archivosExistentes = reactive({
  archivo1: null,
  archivo2: null,
  archivo3: null,
  archivo4: null
})

// Totales de la matriz
const totalesPorGenero = computed(() => {
  const result = {}
  generosList.forEach(g => {
    let sum = 0
    gruposEdadList.forEach(e => {
      sum += Number(matriz[`G_${g.key}_${e.idx}`] || 0)
    })
    result[g.key] = sum
  })
  return result
})

const totalesPorEdad = computed(() => {
  const result = {}
  gruposEdadList.forEach(e => {
    let sum = 0
    generosList.forEach(g => {
      sum += Number(matriz[`G_${g.key}_${e.idx}`] || 0)
    })
    result[e.idx] = sum
  })
  return result
})

const totalGeneral = computed(() => {
  return Object.values(totalesPorGenero.value).reduce((a, b) => a + b, 0)
})

// Determina si está bloqueado contra edición
const estaFinalizada = computed(() => {
  return props.actividad?.id_estado === 3 || props.actividad?.estado_accion === 'Finalizada'
})

const readOnlyComputed = computed(() => {
  return props.isReadOnly || estaFinalizada.value
})

// Sincronizar datos al abrir modal
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.actividad) {
    modalidad.value = props.actividad.modalidad ?? 0
    fechaRealizacion.value = props.actividad.fecha_programada ? String(props.actividad.fecha_programada).split('T')[0] : ''
    duracionHora.value = props.actividad.hora_programada || '01:00'
    duracionRealActividad.value = '01:00'

    // Reset archivos seleccionados
    archivo1.value = null
    archivo2.value = null
    archivo3.value = null
    archivo4.value = null

    // Cargar datos previos si existen
    archivosExistentes.archivo1 = props.actividad.formato_registro_accion_pdf || null
    archivosExistentes.archivo2 = props.actividad.formato_asistencia_accion_pdf || null
    archivosExistentes.archivo3 = props.actividad.evidencia_fotografia || null
    archivosExistentes.archivo4 = props.actividad.encuesta_satisfaccion_pdf || null

    try {
      const { data } = await api.get(`/captura-2027/${props.actividad.id_acciones_educativas}/detalle`)
      const d = data?.data
      if (d) {
        modalidad.value = d.modalidad ?? modalidad.value
        fechaRealizacion.value = d.fecha_realizacion_accion ? String(d.fecha_realizacion_accion).split('T')[0] : fechaRealizacion.value
        duracionHora.value = d.duracion_hora || duracionHora.value
        duracionRealActividad.value = d.duracion_real_actividad || duracionRealActividad.value

        generosList.forEach(g => {
          gruposEdadList.forEach(e => {
            const key = `G_${g.key}_${e.idx}`
            matriz[key] = d[key] ?? 0
          })
        })

        archivosExistentes.archivo1 = d.formato_registro_accion_pdf || archivosExistentes.archivo1
        archivosExistentes.archivo2 = d.formato_asistencia_accion_pdf || archivosExistentes.archivo2
        archivosExistentes.archivo3 = d.evidencia_fotografia || archivosExistentes.archivo3
        archivosExistentes.archivo4 = d.encuesta_satisfaccion_pdf || archivosExistentes.archivo4
      }
    } catch (e) {
      // Usar datos precargados
    }
  }
})

// Manejo de carga de archivos con validación de peso
const onFileSelected = (event, tipo, maxSizeMB) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > maxSizeMB * 1024 * 1024) {
    toast.error(`El archivo excede el tamaño máximo permitido de ${maxSizeMB} MB.`)
    event.target.value = null
    return
  }

  if (tipo === 'archivo1') archivo1.value = file
  if (tipo === 'archivo2') archivo2.value = file
  if (tipo === 'archivo3') archivo3.value = file
  if (tipo === 'archivo4') archivo4.value = file
}

// 1. Guardar Información y primeros 3 archivos (Genera Folio Inmutable)
const guardarInformacion = async () => {
  if (!fechaRealizacion.value) {
    toast.warning('Por favor ingresa la Fecha de realización de la acción educativa.')
    return
  }
  if (!duracionRealActividad.value) {
    toast.warning('Por favor ingresa la Duración real de la actividad.')
    return
  }
  if (totalGeneral.value <= 0) {
    toast.warning('Por favor registra al menos una persona en la tabla de población beneficiada.')
    return
  }

  // Verificar que los 3 primeros archivos existan o se estén subiendo
  if (!archivo1.value && !archivosExistentes.archivo1) {
    toast.warning('Es obligatorio adjuntar el Formato de registro de acción educativa (Archivo 1).')
    return
  }
  if (!archivo2.value && !archivosExistentes.archivo2) {
    toast.warning('Es obligatorio adjuntar el Formato de asistencia a acción educativa (Archivo 2).')
    return
  }
  if (!archivo3.value && !archivosExistentes.archivo3) {
    toast.warning('Es obligatorio adjuntar la Evidencia fotográfica (Archivo 3).')
    return
  }

  saving.value = true
  try {
    const formData = new FormData()
    formData.append('modalidad', modalidad.value)
    formData.append('fecha_realizacion_accion', fechaRealizacion.value)
    formData.append('duracion_hora', duracionHora.value)
    formData.append('duracion_real_actividad', duracionRealActividad.value)
    formData.append('folio_accion_educativa', props.actividad?.folio_accion_educativa || '')
    formData.append('id_distrito', props.actividad?.idsede || 1)

    // Agregar las 30 celdas de la matriz
    Object.keys(matriz).forEach(key => {
      formData.append(key, matriz[key] || 0)
    })

    if (archivo1.value) formData.append('formato_registro_accion_pdf', archivo1.value)
    if (archivo2.value) formData.append('formato_asistencia_accion_pdf', archivo2.value)
    if (archivo3.value) formData.append('evidencia_fotografia', archivo3.value)

    const { data } = await api.post(`/captura-2027/${props.actividad.id_acciones_educativas}/guardar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    await Swal.fire({
      icon: 'success',
      title: '¡Información Guardada!',
      html: `La actividad quedó en estado <b>Capturada</b>.<br>Folio asignado: <strong class="text-iecm-morado font-mono text-base">${data.data?.folio_accion_educativa || ''}</strong><br><small class="text-slate-500">Ya puedes responder encuestas de satisfacción para esta actividad.</small>`,
      confirmButtonColor: '#6B2D8B',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg' }
    })

    emit('saved')
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error al guardar la información de la actividad.')
  } finally {
    saving.value = false
  }
}

// 2. Finalizar Acción (Disparado tras adjuntar Archivo 4)
const finalizarAccion = async () => {
  if (!archivo4.value && !archivosExistentes.archivo4) {
    toast.warning('Para finalizar la acción debes subir el PDF de Encuestas de Satisfacción (Archivo 4).')
    return
  }

  const { isConfirmed } = await Swal.fire({
    title: '¿Finalizar Acción Educativa?',
    text: 'Al finalizar la acción, el expediente se cerrará definitivamente y ya NO se podrán editar datos ni subir nuevos archivos.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#6B2D8B',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, finalizar acción',
    cancelButtonText: 'Revisar datos',
    customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg', cancelButton: 'rounded-lg' }
  })

  if (!isConfirmed) return

  finalizando.value = true
  try {
    const formData = new FormData()
    formData.append('id_distrito', props.actividad?.idsede || 1)
    formData.append('folio_accion_educativa', props.actividad?.folio_accion_educativa || '')
    if (archivo4.value) {
      formData.append('encuesta_satisfaccion_pdf', archivo4.value)
    }

    await api.post(`/captura-2027/${props.actividad.id_acciones_educativas}/finalizar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    await Swal.fire({
      icon: 'success',
      title: '¡Acción Finalizada!',
      text: 'El expediente ha sido completado y cerrado exitosamente.',
      confirmButtonColor: '#6B2D8B',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg' }
    })

    emit('saved')
    emit('close')
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error al finalizar la acción.')
  } finally {
    finalizando.value = false
  }
}
</script>

<template>
  <AppModal :open="open" size="6xl" @close="emit('close')">
    <template #header>
      <div class="flex items-center justify-between w-full pr-6">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-white/15 rounded-xl border border-white/20">
            <CheckCircle class="w-6 h-6 text-white" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-white">
                {{ readOnlyComputed ? 'Expediente de Acción Educativa' : 'Captura de Acción Educativa' }}
              </h3>
              <span 
                v-if="actividad?.folio_accion_educativa"
                class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/20 text-purple-100 border border-white/30"
              >
                {{ actividad.folio_accion_educativa }}
              </span>
            </div>
            <p class="text-xs text-purple-200 mt-0.5 max-w-2xl truncate">
              {{ actividad?.clave_accion || 'AE' }} — {{ actividad?.nombre_accion || actividad?.curso || '' }} • {{ actividad?.nombre_institucion || actividad?.institucion || '' }}
            </p>
          </div>
        </div>

        <!-- Badge de Estado -->
        <span 
          class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          :class="{
            'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30': estaFinalizada,
            'bg-amber-500/20 text-amber-300 border border-amber-400/30': !estaFinalizada && actividad?.id_estado === 2,
            'bg-blue-500/20 text-blue-300 border border-blue-400/30': actividad?.id_estado === 1
          }"
        >
          {{ estaFinalizada ? 'Finalizada (Cerrada)' : (actividad?.id_estado === 2 ? 'Capturada' : 'Sin Capturar') }}
        </span>
      </div>
    </template>

    <div class="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-3">
      
      <!-- Aviso de solo lectura si está finalizada -->
      <div v-if="readOnlyComputed" class="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-200">
        <ShieldCheck class="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <strong class="font-bold">Acción Finalizada:</strong> Los datos y evidencias se encuentran resguardados en modo solo lectura para consulta y descarga institucional.
        </div>
      </div>

      <!-- 1. MODALIDAD Y TIEMPOS -->
      <div class="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-iecm-morado dark:text-iecm-morado-300 flex items-center gap-2">
          <Clock class="w-4 h-4" /> Modalidad y Registro de Tiempo
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="label-iecm">Modalidad *</label>
            <select v-model="modalidad" :disabled="readOnlyComputed" class="input-iecm cursor-pointer">
              <option :value="0">Presencial</option>
              <option :value="1">Virtual</option>
            </select>
          </div>

          <div>
            <label class="label-iecm">Fecha de realización *</label>
            <input v-model="fechaRealizacion" type="date" :disabled="readOnlyComputed" class="input-iecm" />
          </div>

          <div>
            <label class="label-iecm">Duración estimada</label>
            <input v-model="duracionHora" type="time" :disabled="readOnlyComputed" class="input-iecm" />
          </div>

          <div>
            <label class="label-iecm">Duración real de la actividad *</label>
            <input v-model="duracionRealActividad" type="time" :disabled="readOnlyComputed" class="input-iecm" />
          </div>
        </div>
      </div>

      <!-- 2. TABLA DE POBLACIÓN BENEFICIADA (5 GÉNEROS X 6 EDADES) -->
      <div class="bg-white dark:bg-iecm-dark-header p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-iecm-morado dark:text-iecm-morado-300 flex items-center gap-2">
            <Users class="w-4 h-4" /> Matriz de Población Beneficiada (5 Géneros × 6 Grupos de Edad)
          </h4>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            Total General: <span class="text-iecm-morado dark:text-iecm-morado-300 text-sm font-black">{{ totalGeneral }}</span> personas
          </span>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
              <tr>
                <th class="p-2.5 pl-3 min-w-[140px]">Género</th>
                <th v-for="e in gruposEdadList" :key="e.idx" class="p-2 text-center min-w-[95px]">
                  <span class="block leading-tight">{{ e.label }}</span>
                </th>
                <th class="p-2.5 text-center bg-purple-50 dark:bg-iecm-morado-950/30 text-iecm-morado dark:text-iecm-morado-300 font-extrabold">Total Fila</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <tr v-for="g in generosList" :key="g.key" class="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <td class="p-2.5 pl-3 font-semibold text-slate-800 dark:text-slate-200">
                  {{ g.label }}
                </td>
                <td v-for="e in gruposEdadList" :key="e.idx" class="p-1.5 text-center">
                  <input
                    v-model.number="matriz[`G_${g.key}_${e.idx}`]"
                    type="number"
                    min="0"
                    :disabled="readOnlyComputed"
                    class="w-16 px-2 py-1 text-center font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-iecm-morado focus:ring-1 focus:ring-iecm-morado disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </td>
                <td class="p-2 text-center font-bold bg-purple-50/60 dark:bg-iecm-morado-950/20 text-slate-900 dark:text-white">
                  {{ totalesPorGenero[g.key] }}
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-100/90 dark:bg-slate-800/90 font-extrabold border-t-2 border-slate-300 dark:border-white/20">
              <tr>
                <td class="p-2.5 pl-3 text-slate-800 dark:text-slate-200">Total por Edad:</td>
                <td v-for="e in gruposEdadList" :key="e.idx" class="p-2 text-center text-slate-900 dark:text-white font-bold">
                  {{ totalesPorEdad[e.idx] }}
                </td>
                <td class="p-2.5 text-center bg-iecm-morado text-white font-black text-sm">
                  {{ totalGeneral }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- 3. GESTIÓN PROGRESIVA DE ARCHIVOS (4 DOCUMENTOS) -->
      <div class="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-iecm-morado dark:text-iecm-morado-300 flex items-center gap-2">
          <Upload class="w-4 h-4" /> Expediente Digital de Evidencias (Formatos Oficiales)
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Archivo 1: Formato de registro de acción educativa -->
          <div class="p-4 bg-white dark:bg-iecm-dark-header border border-slate-200 dark:border-white/10 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">1. Formato de registro de acción educativa (PDF 10MB) *</span>
              <span v-if="archivosExistentes.archivo1" class="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle class="w-3.5 h-3.5" /> Cargado
              </span>
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo1', 10)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-iecm-morado hover:file:bg-purple-200 cursor-pointer disabled:opacity-50"
            />
          </div>

          <!-- Archivo 2: Formato de asistencia -->
          <div class="p-4 bg-white dark:bg-iecm-dark-header border border-slate-200 dark:border-white/10 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">2. Formato de asistencia a acción educativa (PDF 10MB) *</span>
              <span v-if="archivosExistentes.archivo2" class="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle class="w-3.5 h-3.5" /> Cargado
              </span>
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo2', 10)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-iecm-morado hover:file:bg-purple-200 cursor-pointer disabled:opacity-50"
            />
          </div>

          <!-- Archivo 3: Evidencia fotográfica -->
          <div class="p-4 bg-white dark:bg-iecm-dark-header border border-slate-200 dark:border-white/10 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">3. Evidencia fotográfica (.png o .jpg 10MB) *</span>
              <span v-if="archivosExistentes.archivo3" class="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle class="w-3.5 h-3.5" /> Cargada
              </span>
            </div>
            <input 
              type="file" 
              accept=".jpg,.jpeg,.png" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo3', 10)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-iecm-morado hover:file:bg-purple-200 cursor-pointer disabled:opacity-50"
            />
          </div>

          <!-- Archivo 4: Encuesta de satisfacción consolidada (Disparador de Finalización) -->
          <div class="p-4 bg-purple-50/60 dark:bg-iecm-morado-950/20 border-2 border-dashed border-iecm-morado/40 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-iecm-morado dark:text-purple-300">4. Encuestas de satisfacción consolidadas (PDF 20MB)</span>
              <span v-if="archivosExistentes.archivo4" class="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle class="w-3.5 h-3.5" /> Consolidado Listo
              </span>
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo4', 20)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-iecm-morado file:text-white hover:file:bg-purple-800 cursor-pointer disabled:opacity-50"
            />
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Al cargar este archivo, se habilitará la opción para <strong>Finalizar la Acción</strong> y cerrar el expediente.
            </p>
          </div>
        </div>
      </div>

    </div>

    <!-- BOTONES DE ACCIÓN FOOTER -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Cerrar
        </button>

        <div class="flex items-center gap-3">
          <!-- Si NO tiene archivo 4 aún: Botón estándar Guardar Información -->
          <AppButton
            v-if="!readOnlyComputed && !archivo4 && !archivosExistentes.archivo4"
            variant="primary"
            size="md"
            :loading="saving"
            @click="guardarInformacion"
          >
            Guardar Información
          </AppButton>

          <!-- Si YA se seleccionó el Archivo 4: El botón se transforma en FINALIZAR ACCIÓN -->
          <AppButton
            v-else-if="!readOnlyComputed && (archivo4 || archivosExistentes.archivo4)"
            variant="success"
            size="md"
            :loading="finalizando"
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20"
            @click="finalizarAccion"
          >
            <template #icon><ShieldCheck class="w-4 h-4" /></template>
            Finalizar Acción
          </AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>
