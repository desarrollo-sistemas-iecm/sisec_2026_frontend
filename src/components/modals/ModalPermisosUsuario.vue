<script setup>
import { ref, computed, watch } from 'vue'
import {
  Shield, Check, X, Save, LayoutDashboard, CalendarDays, Edit3,
  ClipboardList, BarChart3, Settings, Sparkles, CheckCircle2, RotateCcw
} from '@lucide/vue'
import api from '../../services/api'
import Swal from 'sweetalert2'
import AppModal from '../AppModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppBadge from '../ui/AppBadge.vue'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)

// Lista de los 6 módulos oficiales del sistema
const modulosDisponibles = [
  {
    codigo: 'dashboard',
    nombre: 'Dashboard',
    tag: 'Métricas',
    descripcion: 'Métricas institucionales, avance global y semaforización ejecutiva.',
    icon: LayoutDashboard,
    colorBadge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },
  {
    codigo: 'programacion',
    nombre: 'Programación',
    tag: 'Operativo',
    descripcion: 'Planeación de acciones educativas y calendarización distrital.',
    icon: CalendarDays,
    colorBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  {
    codigo: 'captura',
    nombre: 'Captura',
    tag: 'Seguimiento',
    descripcion: 'Registro de evidencias fotográficas, asistencias y participantes.',
    icon: Edit3,
    colorBadge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  {
    codigo: 'encuestas',
    nombre: 'Encuestas',
    tag: 'Evaluación',
    descripcion: 'Aplicación y registro de cuestionarios de satisfacción ciudadana.',
    icon: ClipboardList,
    colorBadge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  },
  {
    codigo: 'reportes',
    nombre: 'Reportes',
    tag: 'Estadística',
    descripcion: 'Generación de tabulados cuantitativos y exportación de reportes.',
    icon: BarChart3,
    colorBadge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
  },
  {
    codigo: 'administracion',
    nombre: 'Administración',
    tag: 'Control',
    descripcion: 'Gestión de usuarios, periodos de captura, catálogos y formatos.',
    icon: Settings,
    colorBadge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
  }
]

// Estado de módulos seleccionados (Set o Array de códigos)
const modulosSeleccionados = ref([])

const isModuloActivo = (codigo) => {
  return modulosSeleccionados.value.includes(codigo.toLowerCase())
}

const toggleModulo = (codigo) => {
  const cod = codigo.toLowerCase()
  if (isModuloActivo(cod)) {
    modulosSeleccionados.value = modulosSeleccionados.value.filter(c => c !== cod)
  } else {
    modulosSeleccionados.value.push(cod)
  }
}

// Acciones en lote
const seleccionarTodos = () => {
  modulosSeleccionados.value = modulosDisponibles.map(m => m.codigo)
}

const seleccionarDistrital = () => {
  // Los únicos 4 módulos de distritales
  modulosSeleccionados.value = ['programacion', 'captura', 'encuestas', 'reportes']
}

const desmarcarTodos = () => {
  modulosSeleccionados.value = []
}

// Cargar permisos actuales del usuario
const loadPermisosUsuario = async () => {
  if (!props.user?.idusuario && !props.user?.id_usuario) return
  loading.value = true
  try {
    const idUsuario = props.user.id_usuario || props.user.idusuario
    const { data } = await api.get(`/admin/permisos/usuario/${idUsuario}`)

    if (data.success && Array.isArray(data.modulos)) {
      modulosSeleccionados.value = data.modulos.map(m => String(m).toLowerCase())
    } else {
      // Fallback según su perfil
      const idPermiso = Number(props.user.idpermiso || props.user.id_tipousuario || 1)
      if (idPermiso === 1) {
        seleccionarDistrital()
      } else {
        seleccionarTodos()
      }
    }
  } catch (error) {
    console.error('Error al cargar permisos:', error)
    // Fallback amigable
    const idPermiso = Number(props.user.idpermiso || props.user.id_tipousuario || 1)
    if (idPermiso === 1) {
      seleccionarDistrital()
    } else {
      seleccionarTodos()
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadPermisosUsuario()
  }
})

// Guardar permisos
const guardarPermisos = async () => {
  const idUsuario = props.user?.id_usuario || props.user?.idusuario
  if (!idUsuario) return

  saving.value = true
  try {
    const payload = {
      modulos: [...modulosSeleccionados.value]
    }

    const { data } = await api.post(`/admin/permisos/usuario/${idUsuario}`, payload)

    if (data.success) {
      // Si el usuario editado es el usuario en sesión actual, actualizar inmediatamente su store
      const currentUserId = Number(authStore.user?.idUsuario || authStore.user?.id_usuario)
      if (currentUserId === Number(idUsuario)) {
        authStore.setModulos(modulosSeleccionados.value)
      }

      await Swal.fire({
        icon: 'success',
        title: 'Permisos actualizados',
        text: `Se asignaron ${modulosSeleccionados.value.length} módulos al perfil de ${props.user?.usuario || 'usuario'}.`,
        confirmButtonColor: '#6B2D8B',
        timer: 2000,
        showConfirmButton: false
      })

      emit('saved')
      emit('close')
    }
  } catch (error) {
    console.error('Error al guardar permisos:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'No se pudieron actualizar los permisos del usuario.',
      confirmButtonColor: '#6B2D8B'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal :isOpen="isOpen" @close="emit('close')" maxWidth="max-w-3xl">
    <template #title>
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-iecm-morado-100 dark:bg-iecm-morado-900/40 text-iecm-morado-700 dark:text-iecm-morado-300">
          <Shield class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            Permisos de Acceso a Módulos
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Usuario: <span class="font-semibold text-slate-800 dark:text-slate-200">{{ user?.usuario }}</span>
            <span v-if="user?.perfil" class="ml-2 font-medium text-iecm-morado-600">({{ user?.perfil }})</span>
            <span v-if="user?.idsede !== undefined" class="ml-1 text-slate-400">
              · {{ Number(user.idsede) === 0 || user?.idpermiso >= 2 || user?.usuario === 'admin' ? 'Central' : `Distrito ${user.idsede}` }}
            </span>
          </p>
        </div>
      </div>
    </template>

    <div v-if="loading" class="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
      <div class="w-8 h-8 border-3 border-iecm-morado-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs">Cargando módulos asignados...</p>
    </div>

    <div v-else class="space-y-5 max-h-[68vh] overflow-y-auto pr-1">
      <!-- Barra de Acciones Rápidas -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
        <div class="flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-iecm-morado-600 dark:text-iecm-morado-400" />
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Asignación en lote:
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="seleccionarTodos"
            class="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 cursor-pointer"
          >
            Seleccionar Todos
          </button>
          <button
            type="button"
            @click="seleccionarDistrital"
            class="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer"
          >
            Perfil Distrital (4 módulos)
          </button>
          <button
            type="button"
            @click="desmarcarTodos"
            class="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 cursor-pointer"
          >
            Desmarcar Todos
          </button>
        </div>
      </div>

      <!-- Grid de los 6 Módulos del Sistema -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div
          v-for="mod in modulosDisponibles"
          :key="mod.codigo"
          @click="toggleModulo(mod.codigo)"
          class="group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between"
          :class="isModuloActivo(mod.codigo)
            ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700/80 shadow-xs'
            : 'bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-75'"
        >
          <!-- Encabezado de la Tarjeta del Módulo -->
          <div class="flex items-start justify-between gap-3 mb-2.5">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                :class="mod.iconBg"
              >
                <component :is="mod.icon" class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-sm text-slate-900 dark:text-white">
                    {{ mod.nombre }}
                  </h4>
                  <span
                    class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    :class="mod.colorBadge"
                  >
                    {{ mod.tag }}
                  </span>
                </div>
                <span class="text-[11px] font-mono text-slate-400">
                  /{{ mod.codigo }}
                </span>
              </div>
            </div>

            <!-- Switch / Checkbox Toggle visual -->
            <div
              class="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0"
              :class="isModuloActivo(mod.codigo)
                ? 'bg-[#6B2D8B] text-white shadow-sm'
                : 'border-2 border-slate-300 dark:border-slate-600 bg-transparent'"
            >
              <Check v-if="isModuloActivo(mod.codigo)" class="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          <!-- Descripción -->
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {{ mod.descripcion }}
          </p>

          <!-- Pie de tarjeta: Estado de acceso -->
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-slate-400 font-medium text-[11px]">Estado de acceso:</span>
            <span
              v-if="isModuloActivo(mod.codigo)"
              class="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-xs"
            >
              <CheckCircle2 class="w-3.5 h-3.5" />
              Habilitado
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 font-medium text-slate-400 dark:text-slate-500 text-xs"
            >
              <X class="w-3.5 h-3.5" />
              Sin acceso
            </span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3 w-full">
        <span class="text-xs text-slate-500 dark:text-slate-400">
          <span class="font-bold text-slate-700 dark:text-slate-200">{{ modulosSeleccionados.length }}</span> de 6 módulos habilitados
        </span>
        <div class="flex items-center gap-2">
          <AppButton variant="secondary" @click="emit('close')">
            Cancelar
          </AppButton>
          <AppButton variant="primary" :loading="saving" @click="guardarPermisos">
            <template #icon><Save class="w-4 h-4" /></template>
            Guardar Permisos
          </AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>