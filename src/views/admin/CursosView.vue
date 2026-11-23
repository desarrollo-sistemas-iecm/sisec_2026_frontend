<script setup>
import { ref, onMounted, computed } from 'vue'
import { BookOpen, Search, Palette, Save, Check, Sparkles, Filter, RefreshCw } from '@lucide/vue'
import api from '../../services/api'
import Swal from 'sweetalert2'
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

const updateColor = async (row, event) => {
  const newColor = event.target.value
  const id = row.id_accion || row.idcurso
  savingId.value = id
  try {
    await api.put(`/admin/cursos/${id}/color`, { color: newColor })
    row.color = newColor
    toast.success(`Color actualizado para ${row.clave_accion || row.descripcion}`)
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
    toast.info(`Color restablecido para ${row.clave_accion || row.descripcion}`)
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
    <!-- Header banner -->
    <header class="flex flex-wrap items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#403166] to-[#6B2D8B] text-white rounded-2xl shadow-sm">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-white/15 rounded-xl border border-white/20">
          <Palette class="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Catálogo de Acciones Educativas 2027</h1>
          <p class="text-purple-200 text-sm mt-1 max-w-xl">
            Gestiona las 31 acciones educativas oficiales (AE-01 a AE-31). Personaliza los colores distintivos con el selector interactivo para identificar visualmente cada acción en tablas, reportes y expedientes.
          </p>
        </div>
      </div>
      <div class="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/20">
        <span class="block text-xs uppercase text-purple-200 font-semibold">Total Acciones</span>
        <span class="text-xl font-extrabold text-white">{{ acciones.length }}</span>
      </div>
    </header>

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
              <th class="px-4 py-3 text-center w-24">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="(row, index) in filteredAcciones"
              :key="row.id_accion || row.idcurso"
              class="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
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
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {{ row.vertiente || 'General' }}
                </span>
              </td>

              <!-- Input de Color Interactivo -->
              <td class="px-6 py-4 text-center">
                <div class="inline-flex items-center gap-2">
                  <input
                    type="color"
                    :value="row.color || '#6B2D8B'"
                    class="w-9 h-9 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 bg-transparent p-0.5 shadow-xs transition-transform hover:scale-110"
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
                  class="text-xs text-slate-400 hover:text-purple-700 hover:bg-purple-50"
                  title="Restablecer al color por defecto"
                  @click="resetColor(row)"
                >
                  Por defecto
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>
