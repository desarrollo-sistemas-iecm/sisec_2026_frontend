<script setup>
import { ref, watch, computed } from 'vue'
import Swal from 'sweetalert2'
import { MessageSquarePlus, Send, AlertCircle, HelpCircle } from '@lucide/vue'
import api from '../../services/api.js'
import AppModal from '../AppModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppSelect from '../ui/AppSelect.vue'
import { useToast } from '../../composables/useToast.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  actividad: { type: Object, default: null }
})

const emit = defineEmits(['close', 'enviado'])
const toast = useToast()

const sending = ref(false)
const loadingMensajes = ref(false)
const mensajesPredeterminados = ref([])
const mensajeSeleccionadoId = ref('')
const comentarioAdicional = ref('')

const mensajeObj = computed(() => {
  return mensajesPredeterminados.value.find(m => String(m.id_mensaje_predeterminado) === String(mensajeSeleccionadoId.value))
})

const cargarMensajes = async () => {
  loadingMensajes.value = true
  try {
    const { data } = await api.get('/notificaciones-2027/mensajes-predeterminados', {
      params: { tipo_flujo: 'DISTRITO_A_ADMIN' }
    })
    mensajesPredeterminados.value = data?.data ?? []
    if (mensajesPredeterminados.value.length > 0) {
      mensajeSeleccionadoId.value = mensajesPredeterminados.value[0].id_mensaje_predeterminado
    }
  } catch (error) {
    toast.error('No se pudieron cargar los mensajes predeterminados.')
  } finally {
    loadingMensajes.value = false
  }
}

watch(() => props.open, (val) => {
  if (val) {
    comentarioAdicional.value = ''
    cargarMensajes()
  }
})

const enviarSolicitud = async () => {
  if (!mensajeSeleccionadoId.value || !mensajeObj.value) {
    toast.warning('Por favor selecciona un mensaje predeterminado.')
    return
  }

  sending.value = true
  try {
    const payload = {
      id_mensaje_predeterminado: Number(mensajeSeleccionadoId.value),
      id_acciones_educativas: props.actividad?.id_acciones_educativas,
      id_tipousuario_destino: 2, // Rol Administrador Central
      titulo: mensajeObj.value.titulo,
      mensaje_base: mensajeObj.value.cuerpo_mensaje,
      comentario_adicional: comentarioAdicional.value.trim().slice(0, 100)
    }

    await api.post('/notificaciones-2027/enviar', payload)

    await Swal.fire({
      icon: 'success',
      title: '¡Solicitud Enviada!',
      text: 'La notificación fue enviada al Administrador en tiempo real. Recibirás respuesta en cuanto sea atendida.',
      confirmButtonColor: '#6B2D8B',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg' }
    })

    emit('enviado')
    emit('close')
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error al enviar la solicitud.')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <AppModal :open="open" size="lg" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
          <MessageSquarePlus class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Solicitar Liberación / Notificar</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ actividad?.clave_accion || 'AE' }} — {{ actividad?.nombre_accion || actividad?.curso || '' }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-800 dark:text-amber-200">
        Esta actividad se encuentra fuera del periodo ordinario de captura. Selecciona el motivo institucional predeterminado para solicitar autorización al Administrador.
      </div>

      <!-- Selector de Mensajes Predeterminados -->
      <div>
        <label class="label-iecm">Asunto / Mensaje Predeterminado Oficial *</label>
        <select v-model="mensajeSeleccionadoId" class="input-iecm cursor-pointer" required>
          <option value="" disabled>{{ loadingMensajes ? 'Cargando mensajes...' : 'Selecciona un mensaje predeterminado' }}</option>
          <option v-for="m in mensajesPredeterminados" :key="m.id_mensaje_predeterminado" :value="m.id_mensaje_predeterminado">
            {{ m.titulo }}
          </option>
        </select>
      </div>

      <!-- Vista previa del texto base -->
      <div v-if="mensajeObj" class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 italic">
        "{{ mensajeObj.cuerpo_mensaje }}"
      </div>

      <!-- Comentario libre adicional de hasta 100 caracteres -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="label-iecm">Observación adicional (Opcional, máx. 100 caracteres)</label>
          <span class="text-[11px] font-mono text-slate-400">
            {{ comentarioAdicional.length }} / 100
          </span>
        </div>
        <textarea
          v-model="comentarioAdicional"
          maxlength="100"
          rows="2"
          class="input-iecm resize-none text-xs"
          placeholder="Especifica algún dato puntual o justificación breve (ej. oficio de justificación escolar)..."
        ></textarea>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
        >
          Cancelar
        </button>

        <AppButton
          variant="primary"
          size="md"
          :loading="sending"
          @click="enviarSolicitud"
          class="bg-[#6B2D8B] hover:bg-[#582472] text-white font-bold shadow-md shadow-purple-900/10 px-5 py-2.5 rounded-xl cursor-pointer"
        >
          <template #icon v-if="!sending"><Send class="w-4 h-4" /></template>
          Enviar Solicitud
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
