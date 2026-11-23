<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  MessageSquare, Plus, Search, CheckCircle, ShieldCheck,
  Send, Users, ArrowRightLeft, Sparkles, Filter, AlertCircle
} from '@lucide/vue'
import api from '../../services/api.js'
import Swal from 'sweetalert2'
import AppCard from '../../components/ui/AppCard.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppInput from '../../components/ui/AppInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import AppModal from '../../components/AppModal.vue'
import { useToast } from '../../composables/useToast.js'

const toast = useToast()

const mensajes = ref([])
const loading = ref(true)
const search = ref('')
const selectedFlujo = ref('')

// Modal Crear
const modalCrearOpen = ref(false)
const saving = ref(false)
const form = ref({
  codigo: '',
  titulo: '',
  cuerpo_mensaje: '',
  tipo_flujo: 'DISTRITO_A_ADMIN',
  categoria: 'Aviso',
  requiere_id_accion: true,
  permite_comentario_adicional: true
})

const loadMensajes = async () => {
  loading.value = true
  try {
    const params = {}
    if (selectedFlujo.value) {
      params.tipo_flujo = selectedFlujo.value
    }
    const { data } = await api.get('/notificaciones-2027/mensajes-predeterminados', { params })
    mensajes.value = data?.data ?? []
  } catch (error) {
    toast.error('No se pudieron cargar los mensajes predeterminados.')
  } finally {
    loading.value = false
  }
}

const filteredMensajes = computed(() => {
  const term = search.value.trim().toLowerCase()
  return mensajes.value.filter(m => {
    const haystack = `${m.codigo || ''} ${m.titulo || ''} ${m.cuerpo_mensaje || ''} ${m.categoria || ''}`.toLowerCase()
    return !term || haystack.includes(term)
  })
})

const getFlujoBadge = (flujo) => {
  switch (flujo) {
    case 'DISTRITO_A_ADMIN':
      return { label: 'Distrito ➔ Administrador', class: 'bg-purple-100 text-purple-800 border-purple-300' }
    case 'ADMIN_A_DISTRITO':
      return { label: 'Administrador ➔ Distrito', class: 'bg-blue-100 text-blue-800 border-blue-300' }
    case 'ADMIN_A_SUPERADMIN':
      return { label: 'Administrador ➔ Superadministrador', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    default:
      return { label: flujo, class: 'bg-slate-100 text-slate-800 border-slate-300' }
  }
}

const abrirModalCrear = () => {
  form.value = {
    codigo: '',
    titulo: '',
    cuerpo_mensaje: '',
    tipo_flujo: 'DISTRITO_A_ADMIN',
    categoria: 'Aviso',
    requiere_id_accion: true,
    permite_comentario_adicional: true
  }
  modalCrearOpen.value = true
}

const guardarMensaje = async () => {
  if (!form.value.codigo || !form.value.titulo || !form.value.cuerpo_mensaje) {
    toast.warning('Código, título y cuerpo del mensaje son campos estrictamente requeridos.')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      codigo: form.value.codigo.trim().toUpperCase().replace(/\s+/g, '_')
    }
    const { data } = await api.post('/notificaciones-2027/mensajes-predeterminados', payload)
    if (data.success) {
      toast.success('Mensaje predeterminado registrado con éxito en el catálogo.')
      modalCrearOpen.value = false
      loadMensajes()
    }
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Error al guardar el mensaje predeterminado.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadMensajes()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header banner -->
    <header class="flex flex-wrap items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#403166] to-[#6B2D8B] text-white rounded-2xl shadow-sm">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-white/15 rounded-xl border border-white/20">
          <MessageSquare class="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Catálogo de Mensajes Predeterminados 2027</h1>
          <p class="text-purple-200 text-sm mt-1 max-w-xl">
            Gestiona las plantillas de comunicación institucional entre Cuentas Distritales, Administradores Centrales y el Superadministrador. Configura solicitudes de liberación, avisos de captura y notificaciones de cierre.
          </p>
        </div>
      </div>
      <AppButton
        variant="primary"
        class="bg-white text-purple-950 hover:bg-purple-50 font-bold"
        @click="abrirModalCrear"
      >
        <template #icon><Plus class="w-4 h-4 text-purple-700" /></template>
        Nuevo Mensaje Predeterminado
      </AppButton>
    </header>

    <!-- Contenedor -->
    <AppCard>
      <template #header>
        <div class="grid gap-4 md:grid-cols-3 items-end">
          <div class="md:col-span-2">
            <AppInput
              v-model="search"
              placeholder="Buscar por código, título, contenido o categoría..."
              label="Buscar Mensaje"
            >
              <template #icon><Search class="w-4 h-4" /></template>
            </AppInput>
          </div>
          <div>
            <AppSelect v-model="selectedFlujo" label="Filtrar por Flujo">
              <option value="">Todos los flujos</option>
              <option value="DISTRITO_A_ADMIN">Distrito ➔ Administrador</option>
              <option value="ADMIN_A_DISTRITO">Administrador ➔ Distrito</option>
              <option value="ADMIN_A_SUPERADMIN">Administrador ➔ Superadministrador</option>
            </AppSelect>
          </div>
        </div>
      </template>

      <!-- Tabla de Mensajes Predeterminados -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="px-4 py-3">Código</th>
              <th class="px-4 py-3">Título Institucional</th>
              <th class="px-6 py-3">Cuerpo del Mensaje</th>
              <th class="px-4 py-3 text-center">Tipo de Flujo</th>
              <th class="px-4 py-3 text-center">Categoría</th>
              <th class="px-4 py-3 text-center">Acción Ligada</th>
              <th class="px-4 py-3 text-center">+100 Chars</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="row in filteredMensajes"
              :key="row.id_mensaje_predeterminado"
              class="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
            >
              <!-- Código -->
              <td class="px-4 py-4 font-mono font-bold text-xs text-purple-900 dark:text-purple-300">
                {{ row.codigo }}
              </td>

              <!-- Título -->
              <td class="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs">
                {{ row.titulo }}
              </td>

              <!-- Cuerpo -->
              <td class="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-md">
                {{ row.cuerpo_mensaje }}
              </td>

              <!-- Tipo de Flujo -->
              <td class="px-4 py-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border" :class="getFlujoBadge(row.tipo_flujo).class">
                  {{ getFlujoBadge(row.tipo_flujo).label }}
                </span>
              </td>

              <!-- Categoría -->
              <td class="px-4 py-4 text-center">
                <span class="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ row.categoria || 'General' }}
                </span>
              </td>

              <!-- Requiere Acción -->
              <td class="px-4 py-4 text-center">
                <span v-if="row.requiere_id_accion" class="text-xs text-emerald-600 font-bold">Sí</span>
                <span v-else class="text-xs text-slate-400">Opcional</span>
              </td>

              <!-- Permite Comentario 100 caracteres -->
              <td class="px-4 py-4 text-center">
                <span v-if="row.permite_comentario_adicional" class="text-xs text-blue-600 font-bold">Habilitado</span>
                <span v-else class="text-xs text-slate-400">No</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>

    <!-- Modal Nuevo Mensaje Predeterminado -->
    <AppModal
      :open="modalCrearOpen"
      title="Nuevo Mensaje Predeterminado"
      maxWidth="max-w-xl"
      @close="modalCrearOpen = false"
    >
      <div class="space-y-4 text-slate-700 dark:text-slate-300">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Código Identificador (Ej. AVISO_URGENTE)</label>
          <input
            v-model="form.codigo"
            type="text"
            placeholder="SOL_PRORROGA_ESPECIAL"
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm uppercase font-mono focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Título del Mensaje (Hasta 100 caracteres)</label>
          <input
            v-model="form.titulo"
            type="text"
            maxlength="100"
            placeholder="Título oficial del requerimiento..."
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Cuerpo / Plantilla Base (Hasta 300 caracteres)</label>
          <textarea
            v-model="form.cuerpo_mensaje"
            rows="3"
            maxlength="300"
            placeholder="Escribe el texto base del mensaje..."
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Tipo de Flujo</label>
            <select
              v-model="form.tipo_flujo"
              class="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800"
            >
              <option value="DISTRITO_A_ADMIN">Distrito ➔ Administrador</option>
              <option value="ADMIN_A_DISTRITO">Administrador ➔ Distrito</option>
              <option value="ADMIN_A_SUPERADMIN">Administrador ➔ Superadministrador</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Categoría</label>
            <input
              v-model="form.categoria"
              type="text"
              placeholder="Liberación, Aviso, etc."
              class="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <label class="flex items-center gap-3 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              v-model="form.requiere_id_accion"
              class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
            />
            <span>¿Requiere asociarse obligatoriamente a una Acción Educativa?</span>
          </label>

          <label class="flex items-center gap-3 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              v-model="form.permite_comentario_adicional"
              class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
            />
            <span>¿Permitir a la persona usuaria agregar hasta 100 caracteres de nota personalizada?</span>
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <AppButton variant="secondary" @click="modalCrearOpen = false">
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            class="bg-[#6B2D8B] text-white hover:bg-[#582472]"
            :loading="saving"
            @click="guardarMensaje"
          >
            Guardar Mensaje Predeterminado
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
