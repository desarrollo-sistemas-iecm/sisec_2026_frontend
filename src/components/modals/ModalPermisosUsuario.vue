<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { Shield, Check, X, Lock, CheckSquare, Square, RotateCcw, Save } from '@lucide/vue'
import api from '../../services/api'
import Swal from 'sweetalert2'
import AppModal from '../AppModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppBadge from '../ui/AppBadge.vue'

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

const loading = ref(false)
const saving = ref(false)
const modulos = ref([])
const submodulos = ref([])
const acciones = ref([])
const userPermisosMap = reactive({}) // key: `${id_modulo}_${id_submodulo || 0}_${id_accion}` -> boolean

const keyOf = (modId, subId, accId) => `${modId}_${subId || 0}_${accId}`

const loadCatalogosAndPermisos = async () => {
  if (!props.user?.idusuario && !props.user?.id_usuario) return
  loading.value = true
  try {
    const idUsuario = props.user.id_usuario || props.user.idusuario

    // 1. Obtener catálogos
    const { data: catData } = await api.get('/admin/permisos/catalogos')
    if (catData.success) {
      modulos.value = catData.modulos || []
      submodulos.value = catData.submodulos || []
      acciones.value = catData.acciones || []
    }

    // 2. Obtener permisos actuales del usuario
    const { data: permData } = await api.get(`/admin/permisos/usuario/${idUsuario}`)
    // Limpiar mapa previo
    Object.keys(userPermisosMap).forEach(k => delete userPermisosMap[k])

    if (permData.success && Array.isArray(permData.permisos)) {
      permData.permisos.forEach(p => {
        if (p.permitido) {
          const k = keyOf(p.id_modulo, p.id_submodulo, p.id_accion_sistema)
          userPermisosMap[k] = true
        }
      })
    }
  } catch (error) {
    console.error('Error al cargar permisos:', error)
    Swal.fire('Error', 'No se pudieron cargar los permisos del usuario.', 'error')
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadCatalogosAndPermisos()
  }
})

// Acciones rápidas
const checkAll = () => {
  modulos.value.forEach(m => {
    const subs = submodulos.value.filter(s => s.id_modulo === m.id_modulo)
    acciones.value.forEach(a => {
      if (subs.length > 0) {
        subs.forEach(s => {
          userPermisosMap[keyOf(m.id_modulo, s.id_submodulo, a.id_accion_sistema)] = true
        })
      } else {
        userPermisosMap[keyOf(m.id_modulo, null, a.id_accion_sistema)] = true
      }
    })
  })
}

const uncheckAll = () => {
  Object.keys(userPermisosMap).forEach(k => {
    userPermisosMap[k] = false
  })
}

const checkReadOnly = () => {
  uncheckAll()
  const verAccion = acciones.value.find(a => a.codigo === 'VER')
  if (!verAccion) return

  modulos.value.forEach(m => {
    const subs = submodulos.value.filter(s => s.id_modulo === m.id_modulo)
    if (subs.length > 0) {
      subs.forEach(s => {
        userPermisosMap[keyOf(m.id_modulo, s.id_submodulo, verAccion.id_accion_sistema)] = true
      })
    } else {
      userPermisosMap[keyOf(m.id_modulo, null, verAccion.id_accion_sistema)] = true
    }
  })
}

const isChecked = (modId, subId, accId) => {
  return Boolean(userPermisosMap[keyOf(modId, subId, accId)])
}

const togglePermiso = (modId, subId, accId) => {
  const k = keyOf(modId, subId, accId)
  userPermisosMap[k] = !userPermisosMap[k]
}

const guardarPermisos = async () => {
  const idUsuario = props.user?.id_usuario || props.user?.idusuario
  if (!idUsuario) return

  saving.value = true
  try {
    const payloadPermisos = []
    Object.keys(userPermisosMap).forEach(k => {
      if (userPermisosMap[k]) {
        const [modId, subId, accId] = k.split('_').map(Number)
        payloadPermisos.push({
          id_modulo: modId,
          id_submodulo: subId === 0 ? null : subId,
          id_accion_sistema: accId,
          permitido: true
        })
      }
    })

    const { data } = await api.post(`/admin/permisos/usuario/${idUsuario}`, {
      permisos: payloadPermisos
    })

    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Permisos actualizados',
        text: 'La matriz de permisos se actualizó correctamente.',
        timer: 1800,
        showConfirmButton: false
      })
      emit('saved')
      emit('close')
    }
  } catch (error) {
    console.error('Error al guardar permisos:', error)
    Swal.fire('Error', 'No se pudieron guardar los permisos.', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal :isOpen="isOpen" @close="emit('close')" maxWidth="max-w-4xl">
    <template #title>
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-iecm-morado-100 dark:bg-iecm-morado-900/40 text-iecm-morado-700 dark:text-iecm-morado-300">
          <Shield class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            Catálogo y Matriz de Permisos
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Usuario: <span class="font-semibold text-slate-800 dark:text-slate-200">{{ user?.usuario }}</span>
            <span v-if="user?.perfil" class="ml-2 font-medium text-iecm-morado-600">({{ user?.perfil }})</span>
          </p>
        </div>
      </div>
    </template>

    <div v-if="loading" class="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
      <div class="w-8 h-8 border-3 border-iecm-morado-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs">Cargando módulos y permisos...</p>
    </div>

    <div v-else class="space-y-6 max-h-[68vh] overflow-y-auto pr-1">
      <!-- Barra de Accesos Rápidos -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          Acciones en lote:
        </span>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="checkAll"
            class="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          >
            ✓ Seleccionar Todo
          </button>
          <button
            type="button"
            @click="checkReadOnly"
            class="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
          >
            👁️ Solo Lectura
          </button>
          <button
            type="button"
            @click="uncheckAll"
            class="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          >
            ✕ Limpiar Todo
          </button>
        </div>
      </div>

      <!-- Lista de Módulos y Submódulos -->
      <div class="space-y-4">
        <div
          v-for="mod in modulos"
          :key="mod.id_modulo"
          class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm"
        >
          <!-- Encabezado del Módulo -->
          <div class="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full bg-iecm-morado-500"></span>
              <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">
                {{ mod.nombre }}
              </h4>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {{ mod.codigo }}
              </span>
            </div>
          </div>

          <!-- Si el módulo NO tiene submódulos (ej. Programación, Captura, Encuestas) -->
          <div
            v-if="submodulos.filter(s => s.id_modulo === mod.id_modulo).length === 0"
            class="p-4"
          >
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <label
                v-for="acc in acciones"
                :key="acc.id_accion_sistema"
                class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition-colors"
                :class="{ 'bg-iecm-morado-50/70 border-iecm-morado-300 dark:bg-iecm-morado-950/30 dark:border-iecm-morado-800': isChecked(mod.id_modulo, null, acc.id_accion_sistema) }"
              >
                <input
                  type="checkbox"
                  class="rounded text-iecm-morado-600 focus:ring-iecm-morado-500 w-4 h-4"
                  :checked="isChecked(mod.id_modulo, null, acc.id_accion_sistema)"
                  @change="togglePermiso(mod.id_modulo, null, acc.id_accion_sistema)"
                />
                <span class="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ acc.nombre }}
                </span>
              </label>
            </div>
          </div>

          <!-- Si el módulo TIENE submódulos (ej. Administración) -->
          <div
            v-else
            class="p-4 space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/60"
          >
            <div
              v-for="sub in submodulos.filter(s => s.id_modulo === mod.id_modulo)"
              :key="sub.id_submodulo"
              class="pt-3 first:pt-0"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {{ sub.nombre }}
                </span>
                <span class="text-[10px] font-mono text-slate-400">
                  ({{ sub.codigo }})
                </span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label
                  v-for="acc in acciones"
                  :key="acc.id_accion_sistema"
                  class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition-colors"
                  :class="{ 'bg-iecm-morado-50/70 border-iecm-morado-300 dark:bg-iecm-morado-950/30 dark:border-iecm-morado-800': isChecked(mod.id_modulo, sub.id_submodulo, acc.id_accion_sistema) }"
                >
                  <input
                    type="checkbox"
                    class="rounded text-iecm-morado-600 focus:ring-iecm-morado-500 w-4 h-4"
                    :checked="isChecked(mod.id_modulo, sub.id_submodulo, acc.id_accion_sistema)"
                    @change="togglePermiso(mod.id_modulo, sub.id_submodulo, acc.id_accion_sistema)"
                  />
                  <span class="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {{ acc.nombre }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <AppButton variant="secondary" @click="emit('close')">
          Cancelar
        </AppButton>
        <AppButton variant="primary" :loading="saving" @click="guardarPermisos">
          <template #icon><Save class="w-4 h-4" /></template>
          Guardar Permisos
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
