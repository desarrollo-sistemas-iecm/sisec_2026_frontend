<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  MessageSquare, Plus, Search, CheckCircle, ShieldCheck,
  Send, Users, ArrowRightLeft, Sparkles, Filter, AlertCircle,
  RefreshCw, CheckCircle2, MessageCircle, FileText, CornerDownRight
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

// Estadísticas para las métricas y radials
const totalMensajes = computed(() => mensajes.value.length)

const countDistritoAAdmin = computed(() => {
  return mensajes.value.filter(m => m.tipo_flujo === 'DISTRITO_A_ADMIN').length
})

const countAdminADistrito = computed(() => {
  return mensajes.value.filter(m => m.tipo_flujo === 'ADMIN_A_DISTRITO').length
})

const countAdminASuperadmin = computed(() => {
  return mensajes.value.filter(m => m.tipo_flujo === 'ADMIN_A_SUPERADMIN').length
})

const countRequiereAccion = computed(() => {
  return mensajes.value.filter(m => m.requiere_id_accion).length
})

// Porcentaje de mensajes Distrito -> Admin sobre el total
const porcentajeDistritoAdmin = computed(() => {
  if (!totalMensajes.value) return 0
  return Math.round((countDistritoAAdmin.value / totalMensajes.value) * 100)
})

const filteredMensajes = computed(() => {
  const term = search.value.trim().toLowerCase()
  return mensajes.value.filter(m => {
    const matchesFlujo = !selectedFlujo.value || m.tipo_flujo === selectedFlujo.value
    const haystack = `${m.codigo || ''} ${m.titulo || ''} ${m.cuerpo_mensaje || ''} ${m.categoria || ''}`.toLowerCase()
    const matchesSearch = !term || haystack.includes(term)
    return matchesFlujo && matchesSearch
  })
})

const getFlujoBadge = (flujo) => {
  switch (flujo) {
    case 'DISTRITO_A_ADMIN':
      return {
        label: 'Distrito ➔ Administrador',
        class: 'bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        borderColor: '#8B5CF6'
      }
    case 'ADMIN_A_DISTRITO':
      return {
        label: 'Administrador ➔ Distrito',
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        borderColor: '#3B82F6'
      }
    case 'ADMIN_A_SUPERADMIN':
      return {
        label: 'Administrador ➔ Superadministrador',
        class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        borderColor: '#10B981'
      }
    default:
      return {
        label: flujo,
        class: 'bg-slate-100 text-slate-800 border-slate-300',
        borderColor: '#94A3B8'
      }
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
      await Swal.fire({
        icon: 'success',
        title: '¡Plantilla Registrada!',
        text: `El mensaje predeterminado [${payload.codigo}] se integró exitosamente al catálogo.`,
        confirmButtonColor: '#6B2D8B',
        background: '#1e1b4b',
        color: '#ffffff',
        customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold px-6 py-2.5' }
      })
      modalCrearOpen.value = false
      await loadMensajes()
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
    <!-- Header Principal -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 rounded-xl shadow-xs">
          <MessageSquare class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Catálogo de Mensajes Predeterminados 2027
            </h1>
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Plantillas de Comunicación
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestiona las plantillas de comunicación institucional entre Cuentas Distritales, Administradores Centrales y el Superadministrador.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 self-start md:self-auto">
        <button
          type="button"
          @click="loadMensajes"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin text-purple-600' : ''" />
          <span>Actualizar</span>
        </button>

        <button
          type="button"
          @click="abrirModalCrear"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6B2D8B] hover:bg-[#582472] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus class="w-4 h-4 stroke-[2.5]" />
          Nuevo Mensaje Predeterminado
        </button>
      </div>
    </header>

    <!-- Métricas Ejecutivas con Radial y Estadísticas -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Radial de Flujo Distrital -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg class="w-14 h-14 -rotate-90 transform" viewBox="0 0 36 36">
            <path class="text-slate-100 dark:text-slate-800 stroke-current" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="text-purple-600 stroke-current transition-all duration-700 ease-out" :stroke-dasharray="`${porcentajeDistritoAdmin}, 100`" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span class="absolute text-xs font-black text-slate-800 dark:text-slate-100">{{ porcentajeDistritoAdmin }}%</span>
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flujo Distrito ➔ Admin</span>
          <span class="text-base font-black text-slate-900 dark:text-white">{{ countDistritoAAdmin }} de {{ totalMensajes }}</span>
          <span class="block text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">Plantillas de solicitud distrital</span>
        </div>
      </div>

      <!-- Flujos Institucionales Activos -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <ArrowRightLeft class="w-6 h-6" />
        </div>
        <div class="space-y-1">
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flujos Institucionales</span>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Admin ➔ Dtto: {{ countAdminADistrito }}
            </span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Admin ➔ Super: {{ countAdminASuperadmin }}
            </span>
          </div>
        </div>
      </div>

      <!-- Requerimientos Normativos -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center shrink-0">
          <ShieldCheck class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validación de Expediente</span>
          <span class="text-base font-black text-slate-900 dark:text-white">{{ countRequiereAccion }} Plantillas</span>
          <span class="block text-[11px] text-slate-400 font-medium mt-0.5">Asociadas a una Acción Educativa</span>
        </div>
      </div>
    </div>

    <!-- Pestañas de Filtro Rápido por Flujo -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
      <button
        type="button"
        @click="selectedFlujo = ''"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
        :class="selectedFlujo === ''
          ? 'bg-[#6B2D8B] text-white shadow-sm'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'"
      >
        <span>Todos los Flujos</span>
        <span
          class="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
          :class="selectedFlujo === '' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
        >
          {{ totalMensajes }}
        </span>
      </button>

      <button
        type="button"
        @click="selectedFlujo = 'DISTRITO_A_ADMIN'"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
        :class="selectedFlujo === 'DISTRITO_A_ADMIN'
          ? 'bg-purple-700 text-white shadow-sm'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'"
      >
        <span>Distrito ➔ Admin</span>
        <span
          class="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
          :class="selectedFlujo === 'DISTRITO_A_ADMIN' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
        >
          {{ countDistritoAAdmin }}
        </span>
      </button>

      <button
        type="button"
        @click="selectedFlujo = 'ADMIN_A_DISTRITO'"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
        :class="selectedFlujo === 'ADMIN_A_DISTRITO'
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'"
      >
        <span>Admin ➔ Distrito</span>
        <span
          class="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
          :class="selectedFlujo === 'ADMIN_A_DISTRITO' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
        >
          {{ countAdminADistrito }}
        </span>
      </button>

      <button
        type="button"
        @click="selectedFlujo = 'ADMIN_A_SUPERADMIN'"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
        :class="selectedFlujo === 'ADMIN_A_SUPERADMIN'
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'"
      >
        <span>Admin ➔ Superadmin</span>
        <span
          class="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
          :class="selectedFlujo === 'ADMIN_A_SUPERADMIN' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
        >
          {{ countAdminASuperadmin }}
        </span>
      </button>
    </div>

    <!-- Contenedor Principal con Buscador -->
    <AppCard>
      <template #header>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="w-full sm:max-w-md">
            <AppInput
              v-model="search"
              placeholder="Buscar por código, título, contenido o categoría..."
              label="Buscar Mensaje"
            >
              <template #icon><Search class="w-4 h-4" /></template>
            </AppInput>
          </div>
          <div class="text-xs text-slate-500 font-medium self-end sm:self-auto">
            Mostrando <span class="font-bold text-slate-900 dark:text-white">{{ filteredMensajes.length }}</span> de {{ totalMensajes }} plantillas
          </div>
        </div>
      </template>

      <!-- Tabla de Mensajes Predeterminados -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="px-4 py-3 w-36">Código</th>
              <th class="px-5 py-3">Título Institucional</th>
              <th class="px-6 py-3">Cuerpo de la Plantilla</th>
              <th class="px-4 py-3 text-center w-48">Tipo de Flujo</th>
              <th class="px-4 py-3 text-center w-28">Categoría</th>
              <th class="px-4 py-3 text-center w-28">Acción Ligada</th>
              <th class="px-4 py-3 text-center w-28">Nota Extra</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="row in filteredMensajes"
              :key="row.id_mensaje_predeterminado"
              class="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors border-l-4"
              :style="{ borderLeftColor: getFlujoBadge(row.tipo_flujo).borderColor }"
            >
              <!-- Código -->
              <td class="px-4 py-4 font-mono font-bold text-xs text-purple-900 dark:text-purple-300">
                {{ row.codigo }}
              </td>

              <!-- Título -->
              <td class="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs">
                {{ row.titulo }}
              </td>

              <!-- Cuerpo -->
              <td class="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
                {{ row.cuerpo_mensaje }}
              </td>

              <!-- Tipo de Flujo -->
              <td class="px-4 py-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block" :class="getFlujoBadge(row.tipo_flujo).class">
                  {{ getFlujoBadge(row.tipo_flujo).label }}
                </span>
              </td>

              <!-- Categoría -->
              <td class="px-4 py-4 text-center">
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {{ row.categoria || 'General' }}
                </span>
              </td>

              <!-- Requiere Acción -->
              <td class="px-4 py-4 text-center">
                <span v-if="row.requiere_id_accion" class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  Obligatoria
                </span>
                <span v-else class="text-xs text-slate-400 font-medium">Opcional</span>
              </td>

              <!-- Permite Comentario 100 caracteres -->
              <td class="px-4 py-4 text-center">
                <span v-if="row.permite_comentario_adicional" class="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  +100 Chars
                </span>
                <span v-else class="text-xs text-slate-400 font-medium">Fijo</span>
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
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
            Código Identificador (Ej. SOL_PRORROGA_ESPECIAL)
          </label>
          <input
            v-model="form.codigo"
            type="text"
            placeholder="SOL_PRORROGA_ESPECIAL"
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm uppercase font-mono focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              Título del Mensaje
            </label>
            <span class="text-[11px] font-mono font-bold" :class="(form.titulo?.length || 0) > 90 ? 'text-amber-500' : 'text-slate-400'">
              {{ form.titulo?.length || 0 }} / 100
            </span>
          </div>
          <input
            v-model="form.titulo"
            type="text"
            maxlength="100"
            placeholder="Título oficial del requerimiento..."
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              Cuerpo / Plantilla Base
            </label>
            <span class="text-[11px] font-mono font-bold" :class="(form.cuerpo_mensaje?.length || 0) > 270 ? 'text-amber-500' : 'text-slate-400'">
              {{ form.cuerpo_mensaje?.length || 0 }} / 300
            </span>
          </div>
          <textarea
            v-model="form.cuerpo_mensaje"
            rows="3"
            maxlength="300"
            placeholder="Escribe el texto base del mensaje institucional..."
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Tipo de Flujo</label>
            <select
              v-model="form.tipo_flujo"
              class="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
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
              placeholder="Liberación, Aviso, Prórroga..."
              class="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              v-model="form.requiere_id_accion"
              class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
            />
            <div class="text-xs">
              <span class="font-bold text-slate-800 dark:text-slate-200 block">¿Requiere asociarse a una Acción Educativa?</span>
              <span class="text-slate-500 dark:text-slate-400">Exige al emisor seleccionar una clave correlativa de acción de su distrito.</span>
            </div>
          </label>

          <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              v-model="form.permite_comentario_adicional"
              class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
            />
            <div class="text-xs">
              <span class="font-bold text-slate-800 dark:text-slate-200 block">¿Permitir nota personalizada (+100 caracteres)?</span>
              <span class="text-slate-500 dark:text-slate-400">Permite agregar una justificación o comentario adicional antes de enviar.</span>
            </div>
          </label>
        </div>

        <!-- Vista previa de la tarjeta de notificación -->
        <div class="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40">
          <div class="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MessageCircle class="w-3.5 h-3.5" />
            Vista Previa de la Notificación
          </div>
          <div class="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div class="text-xs font-bold text-slate-900 dark:text-white">
              {{ form.titulo || 'Título de ejemplo del mensaje' }}
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {{ form.cuerpo_mensaje || 'Cuerpo del mensaje institucional predeterminado...' }}
            </div>
          </div>
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
