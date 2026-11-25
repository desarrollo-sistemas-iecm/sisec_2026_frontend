<script setup>
import { ref, computed, watch, reactive } from 'vue'
import Swal from 'sweetalert2'
import {
  ClipboardList, CheckCircle, User, FileText, Download,
  Sparkles, AlertCircle, ArrowRight, RotateCcw, Save
} from '@lucide/vue'
import api from '../../services/api.js'
import AppModal from '../AppModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppInput from '../ui/AppInput.vue'
import { useToast } from '../../composables/useToast.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  actividad: { type: Object, default: null }
})

const emit = defineEmits(['close', 'encuestaGuardada'])
const toast = useToast()

const saving = ref(false)
const consecutivoActual = ref(1)
const ultimoPdfUrl = ref(null)

// 5 Géneros oficiales 2027
const generos = [
  { id: 1, label: 'Mujer' },
  { id: 2, label: 'Hombre' },
  { id: 3, label: 'Persona no binaria' },
  { id: 4, label: 'Otro' },
  { id: 5, label: 'Prefiero no decirlo' }
]

// Escala Likert de 5 puntos
const escalaLikert = [
  { value: 1, label: 'Totalmente en desacuerdo', short: 'TD' },
  { value: 2, label: 'En desacuerdo', short: 'D' },
  { value: 3, label: 'Neutral / Regular', short: 'N' },
  { value: 4, label: 'De acuerdo', short: 'A' },
  { value: 5, label: 'Totalmente de acuerdo', short: 'TA' }
]

const preguntas = [
  { key: 'p3', texto: 'P3. La acción educativa cumplió con mis expectativas.' },
  { key: 'p4', texto: 'P4. Las personas que impartieron la acción educativa trataron el tema de forma clara.' },
  { key: 'p5', texto: 'P5. La temática abordada es aplicable a mi vida personal o laboral.' },
  { key: 'p6', texto: 'P6. El formato previsto para el desarrollo de la actividad motiva mi participación.' },
  { key: 'p7', texto: 'P7. Las dudas, inquietudes y comentarios fueron atendidos adecuadamente.' },
  { key: 'p8', texto: 'P8. ¿Consideras que esta actividad del IECM contribuye a la consolidación de la cultura democrática entre las personas habitantes de la Ciudad de México?' }
]

// Estado reactivo del formulario de encuesta
const form = reactive({
  edad: '',
  id_genero: '',
  p3: null,
  p4: null,
  p5: null,
  p6: null,
  p7: null,
  p8: null
})

// Folio autogenerado para visualización
const tieneFolioValido = computed(() => {
  const f = props.actividad?.folio_accion_educativa
  return Boolean(f && String(f).trim() !== '' && !String(f).toLowerCase().includes('sin folio'))
})

const folioEncuestaVisual = computed(() => {
  const folioAccion = props.actividad?.folio_accion_educativa || 'AE-PENDIENTE'
  return `ENC-${folioAccion}-${consecutivoActual.value}`
})

// Rango de edad condiciona el tipo de instrumento
const tipoInstrumento = computed(() => {
  const edadNum = Number(form.edad)
  if (!edadNum || isNaN(edadNum)) return { tipo: 1, etiqueta: 'General' }
  if (edadNum <= 17) {
    return { tipo: 2, etiqueta: 'Cuestionario para Niñez y Adolescencia (Adaptado)' }
  }
  return { tipo: 1, etiqueta: 'Cuestionario para Jóvenes y Personas Adultas' }
})

const resetRespuestas = () => {
  form.edad = ''
  form.id_genero = ''
  form.p3 = null
  form.p4 = null
  form.p5 = null
  form.p6 = null
  form.p7 = null
  form.p8 = null
  ultimoPdfUrl.value = null
}

const cargarSiguienteConsecutivo = async () => {
  if (!props.actividad?.id_acciones_educativas) return
  try {
    const { data } = await api.get(`/captura-2027/${props.actividad.id_acciones_educativas}/encuestas`)
    const total = (data?.data ?? []).length
    consecutivoActual.value = total + 1
  } catch (e) {
    consecutivoActual.value = 1
  }
}

watch(() => props.open, (val) => {
  if (val) {
    resetRespuestas()
    cargarSiguienteConsecutivo()
  }
})

const validar = () => {
  if (!tieneFolioValido.value) {
    toast.error('No se puede registrar encuesta para una acción que aún no tiene folio institucional.')
    return false
  }
  const edadNum = Number(form.edad)
  if (!form.edad || isNaN(edadNum) || edadNum < 1 || edadNum > 120) {
    toast.warning('Por favor ingresa una edad válida de 2 dígitos (1 - 120).')
    return false
  }
  if (!form.id_genero) {
    toast.warning('Por favor selecciona el género de la persona asistente.')
    return false
  }
  for (const p of preguntas) {
    if (!form[p.key]) {
      toast.warning(`Falta responder: ${p.texto.split('.')[0]}`)
      return false
    }
  }
  return true
}

const guardarEncuesta = async () => {
  if (!validar()) return

  saving.value = true
  try {
    const generoObj = generos.find(g => g.id === Number(form.id_genero))
    const payload = {
      folio_accion_educativa: props.actividad?.folio_accion_educativa,
      clave_accion: props.actividad?.clave_accion,
      nombre_accion: props.actividad?.nombre_accion || props.actividad?.curso,
      tipo_encuesta: tipoInstrumento.value.tipo,
      p1_edad_persona_asistente: Number(form.edad),
      id_genero: Number(form.id_genero),
      genero_texto: generoObj?.label,
      p3: Number(form.p3),
      p4: Number(form.p4),
      p5: Number(form.p5),
      p6: Number(form.p6),
      p7: Number(form.p7),
      p8: Number(form.p8)
    }

    const { data } = await api.post(`/captura-2027/${props.actividad.id_acciones_educativas}/encuestas`, payload)

    emit('encuestaGuardada')

    const result = await Swal.fire({
      icon: 'success',
      title: '¡Encuesta Registrada!',
      html: `
        <div class="text-left text-sm space-y-2 mt-2">
          <p>Se ha guardado la encuesta con folio: <strong class="text-iecm-morado font-mono">${data.data?.folio_encuesta}</strong></p>
          <p class="text-xs text-slate-500">Las respuestas fueron registradas exitosamente en el expediente digital.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#6B2D8B',
      cancelButtonColor: '#059669',
      confirmButtonText: 'Responder Siguiente Encuesta',
      cancelButtonText: 'Cerrar Modal',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg', cancelButton: 'rounded-lg' }
    })

    if (result.isConfirmed) {
      // Preparar inmediatamente la siguiente encuesta
      consecutivoActual.value += 1
      resetRespuestas()
    } else {
      emit('close')
    }
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error al guardar la encuesta.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal :open="open" size="4xl" @close="emit('close')">
    <template #header>
      <div class="flex items-center justify-between w-full pr-6">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
            <ClipboardList class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Cuestionario de Satisfacción</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                Encuesta #{{ consecutivoActual }}
              </span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl truncate">
              {{ actividad?.clave_accion || 'AE' }} — {{ actividad?.nombre_accion || actividad?.curso || '' }}
            </p>
          </div>
        </div>

        <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {{ folioEncuestaVisual }}
        </span>
      </div>
    </template>

    <div class="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2">
      
      <!-- ALERTA SI NO TIENE FOLIO VÁLIDO -->
      <div v-if="!tieneFolioValido" class="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
        <AlertCircle class="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p class="font-bold">Acción sin folio institucional asignado</p>
          <p class="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
            No es posible registrar encuestas de satisfacción para esta actividad porque aún no cuenta con un folio oficial generado. Para habilitar las encuestas, primero debe capturarse la acción educativa con sus formatos de evidencia.
          </p>
        </div>
      </div>

      <!-- SECCIÓN 1: DATOS DE LA ACTIVIDAD -->
      <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div>
          <span class="text-slate-400 block font-semibold uppercase text-[10px]">Acción Educativa:</span>
          <span class="font-bold text-slate-800 dark:text-slate-200 truncate block">{{ actividad?.clave_accion }} - {{ actividad?.nombre_accion || actividad?.curso }}</span>
        </div>
        <div>
          <span class="text-slate-400 block font-semibold uppercase text-[10px]">Folio de la Acción Educativa:</span>
          <span class="font-mono font-bold text-iecm-morado dark:text-iecm-morado-300">{{ actividad?.folio_accion_educativa || 'AE-ASIGNADO' }}</span>
        </div>
        <div>
          <span class="text-slate-400 block font-semibold uppercase text-[10px]">Folio Consecutivo de Encuesta:</span>
          <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ folioEncuestaVisual }}</span>
        </div>
      </div>

      <!-- SECCIÓN 2: PERFIL DE LA PERSONA ASISTENTE -->
      <div class="bg-white dark:bg-iecm-dark-header p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-iecm-morado dark:text-iecm-morado-300 flex items-center gap-2">
          <User class="w-4 h-4" /> 2. Perfil de la Persona Asistente
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- P1. Edad -->
          <div>
            <label class="label-iecm">P1. Edad (2 dígitos) *</label>
            <input 
              v-model="form.edad" 
              type="number" 
              min="1" 
              max="120" 
              placeholder="Ej. 24" 
              class="input-iecm"
              required 
            />
            <span v-if="form.edad" class="text-[11px] text-iecm-morado dark:text-iecm-morado-300 mt-1 block font-medium">
              Instrumento: {{ tipoInstrumento.etiqueta }}
            </span>
          </div>

          <!-- P2. Género -->
          <div>
            <label class="label-iecm">P2. Género *</label>
            <select v-model="form.id_genero" class="input-iecm cursor-pointer" required>
              <option value="" disabled>Selecciona el género</option>
              <option v-for="g in generos" :key="g.id" :value="g.id">{{ g.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 3: CUESTIONARIO DE SATISFACCIÓN (LIKERT) -->
      <div class="bg-white dark:bg-iecm-dark-header p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-iecm-morado dark:text-iecm-morado-300 flex items-center gap-2">
            <Sparkles class="w-4 h-4" /> 3. Cuestionario de Satisfacción
          </h4>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">Escala del 1 (Totalmente en desacuerdo) al 5 (Totalmente de acuerdo)</span>
        </div>

        <div class="space-y-4 divide-y divide-slate-100 dark:divide-white/5">
          <div v-for="p in preguntas" :key="p.key" class="pt-3 first:pt-0 space-y-2">
            <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
              {{ p.texto }}
            </p>

            <!-- Opciones Likert horizontales tipo pills -->
            <div class="grid grid-cols-5 gap-1.5 sm:gap-2">
              <button
                v-for="opc in escalaLikert"
                :key="opc.value"
                type="button"
                @click="form[p.key] = opc.value"
                class="py-2 px-1 text-center rounded-lg border text-xs font-medium transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
                :class="form[p.key] === opc.value 
                  ? 'bg-iecm-morado text-white border-iecm-morado shadow-sm font-bold scale-[1.02]' 
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-iecm-morado/50'"
              >
                <span class="text-xs font-black">{{ opc.value }}</span>
                <span class="text-[10px] hidden sm:block truncate max-w-full px-1">{{ opc.short }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
        >
          Cerrar
        </button>

        <AppButton
          variant="primary"
          size="md"
          :loading="saving"
          :disabled="!tieneFolioValido || saving"
          @click="guardarEncuesta"
          class="bg-[#6B2D8B] hover:bg-[#582472] text-white font-bold shadow-md shadow-purple-900/10 px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <template #icon v-if="!saving"><Save class="w-4 h-4" /></template>
          Guardar Encuesta #{{ consecutivoActual }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
