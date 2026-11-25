<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import {
  FileText, Upload, Trash2, FileDown, CheckCircle2, AlertCircle,
  FolderOpen, RefreshCw, Sparkles, ShieldCheck, Check, Clock,
  Plus, ToggleLeft, ToggleRight, Eye, EyeOff, FolderPlus, Layers
} from '@lucide/vue'
import api from '../../services/api.js'
import Swal from 'sweetalert2'
import AppCard from '../../components/ui/AppCard.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppModal from '../../components/AppModal.vue'
import AppInput from '../../components/ui/AppInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import { useToast } from '../../composables/useToast.js'

const toast = useToast()

const defaultCategorias = [
  {
    id: 1,
    nombre: 'Servicio Social',
    tag: 'SS',
    activo: true,
    archivos: [
      { id: 101, nombre: 'Formato de registro', archivo: 'Anexo01_SS.docx', activo: true },
      { id: 102, nombre: 'Manifestación de no ser beneficiario/a de alguna beca que impida recibir el apoyo económico', archivo: 'Anexo02_SS.docx', activo: true },
      { id: 103, nombre: 'Formato de reporte de avance en el proceso de reclutamiento de prestadores y prestadoras de servicio social', archivo: 'Anexo03_SS.docx', activo: true },
      { id: 104, nombre: 'Formato para el reporte de bajas anticipadas y sustituciones de prestadores y prestadoras de servicio social', archivo: 'Anexo04_SS.docx', activo: true },
      { id: 105, nombre: 'Formato de reporte de la capacitación otorgada a las y los prestadores de servicio social', archivo: 'Anexo05_SS.docx', activo: true },
      { id: 106, nombre: 'Consideraciones generales para la coordinación de las actividades de las y los prestadores de servicio social', archivo: 'Anexo06_SS.docx', activo: true },
      { id: 107, nombre: 'Lista de asistencia de el/la prestador(a) de servicio social', archivo: 'Anexo07_SS.docx', activo: true },
      { id: 108, nombre: 'Formato para la solicitud de otorgamiento de apoyo económico a prestadores(as) de servicio social', archivo: 'Anexo08_SS.docx', activo: true },
      { id: 109, nombre: 'Formato para la solicitud de expedición de Oficio de liberación para prestadores(as) de servicio social', archivo: 'Anexo09_SS.docx', activo: true }
    ]
  },
  {
    id: 2,
    nombre: 'Acciones Educativas',
    tag: 'AE',
    activo: true,
    archivos: [
      { id: 201, nombre: 'Formato para el registro de asistentes a talleres de formación ciudadana e intervenciones educativas', archivo: 'Anexo01_AE.docx', activo: true },
      { id: 202, nombre: 'Formato para el registro del desarrollo de talleres de formación ciudadana e intervenciones educativas', archivo: 'Anexo02_AE.docx', activo: true },
      { id: 203, nombre: 'Encuesta de satisfacción', archivo: 'Anexo03_AE.docx', activo: true },
      { id: 204, nombre: 'Cédula de verificación de expediente físico o digital distrital', archivo: 'Anexo04_AE.docx', activo: true }
    ]
  },
  {
    id: 3,
    nombre: 'Ludoteca Cívica',
    tag: 'LUCI',
    activo: true,
    archivos: [
      { id: 301, nombre: 'Formato para la gestión de acciones educativas de la Ludoteca Cívica dirigidas a la comunidad educativa y otros públicos', archivo: 'luci.docx', activo: true }
    ]
  },
  {
    id: 4,
    nombre: 'Vínculo Institucional (Demarcaciones)',
    tag: 'DT',
    activo: true,
    archivos: [
      { id: 401, nombre: 'Modelo de Convenio', archivo: 'Anexo01_DT.docx', activo: true },
      { id: 402, nombre: 'Modelo de Programa Anual de Trabajo', archivo: 'Anexo02_DT.docx', activo: true },
      { id: 403, nombre: 'Procedimiento de vinculación', archivo: 'Anexo03_DT.docx', activo: true }
    ]
  },
  {
    id: 5,
    nombre: 'Lineamientos de Protección',
    tag: 'PROT',
    activo: true,
    archivos: [
      { id: 501, nombre: 'Carta de autorización expresa y cesión de derechos para madres y padres de familia', archivo: 'lineamientos1.docx', activo: true },
      { id: 502, nombre: 'Formato de autorización expresa de las niñas, niños y adolescentes', archivo: 'lineamientos2.docx', activo: true }
    ]
  }
]

const categorias = ref([...defaultCategorias])
const serverFiles = ref([])
const loading = ref(false)
const inputRefs = ref({})
const selectedCategoriaId = ref(1)

// Modal para Subir Nuevo Formato
const modalNuevoOpen = ref(false)
const subiendoNuevo = ref(false)
const formNuevo = reactive({
  categoriaId: 1,
  nombre: '',
  file: null
})

const loadFiles = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/formatos')
    if (data.success) {
      serverFiles.value = data.serverFiles || data.data || []
      if (data.categorias && data.categorias.length > 0) {
        categorias.value = data.categorias
      }
    }
  } catch (error) {
    toast.error('Error al cargar la lista de formatos del servidor.')
  } finally {
    loading.value = false
  }
}

const checkExists = (fileName) => {
  return serverFiles.value.includes(fileName)
}

// Métricas y Radials
const totalFormatos = computed(() => {
  return categorias.value.reduce((acc, cat) => acc + (cat.archivos || []).length, 0)
})

const formatosDisponiblesCount = computed(() => {
  let count = 0
  categorias.value.forEach(cat => {
    (cat.archivos || []).forEach(a => {
      if (checkExists(a.archivo)) count++
    })
  })
  return count
})

const porcentajeDisponibilidad = computed(() => {
  if (totalFormatos.value === 0) return 0
  return Math.round((formatosDisponiblesCount.value / totalFormatos.value) * 100)
})

const seccionesActivasCount = computed(() => {
  return categorias.value.filter(c => c.activo !== false).length
})

const formatosActivosCount = computed(() => {
  let count = 0
  categorias.value.forEach(cat => {
    if (cat.activo !== false) {
      (cat.archivos || []).forEach(a => {
        if (a.activo !== false && checkExists(a.archivo)) count++
      })
    }
  })
  return count
})

const currentCategoria = computed(() => {
  return categorias.value.find(c => c.id === selectedCategoriaId.value) || categorias.value[0] || {}
})

// Activar / Desactivar Sección Completa
const togglingCategoriaId = ref(null)
const toggleSeccion = async (cat) => {
  const nuevoEstado = cat.activo === false ? true : false
  togglingCategoriaId.value = cat.id
  try {
    const { data } = await api.put('/admin/formatos/toggle-categoria', {
      id: cat.id,
      activo: nuevoEstado
    })
    if (data.success) {
      cat.activo = nuevoEstado
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: nuevoEstado ? 'success' : 'info',
        title: nuevoEstado ? `Sección "${cat.nombre}" ACTIVADA` : `Sección "${cat.nombre}" DESACTIVADA`,
        text: nuevoEstado ? 'Visible para los órganos distritales' : 'Oculta para los distritos',
        showConfirmButton: false,
        timer: 2500,
        background: '#1e1b4b',
        color: '#ffffff'
      })
    }
  } catch (error) {
    toast.error('No se pudo cambiar el estado de la sección.')
  } finally {
    togglingCategoriaId.value = null
  }
}

// Activar / Desactivar Formato Individual
const togglingFormatoKey = ref(null)
const toggleFormato = async (cat, formato) => {
  const nuevoEstado = formato.activo === false ? true : false
  togglingFormatoKey.value = formato.archivo
  try {
    const { data } = await api.put('/admin/formatos/toggle-formato', {
      categoriaId: cat.id,
      archivo: formato.archivo,
      activo: nuevoEstado
    })
    if (data.success) {
      formato.activo = nuevoEstado
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: nuevoEstado ? 'success' : 'info',
        title: nuevoEstado ? `Formato ACTIVADO` : `Formato DESACTIVADO`,
        text: `${formato.nombre}: ${nuevoEstado ? 'Visible para distritos' : 'Oculto para distritos'}`,
        showConfirmButton: false,
        timer: 2200,
        background: '#1e1b4b',
        color: '#ffffff'
      })
    }
  } catch (error) {
    toast.error('No se pudo actualizar el estado del formato.')
  } finally {
    togglingFormatoKey.value = null
  }
}

// Modal Subir Nuevo Formato
const abrirModalNuevoFormato = (categoriaId = null) => {
  formNuevo.categoriaId = categoriaId || selectedCategoriaId.value || 1
  formNuevo.nombre = ''
  formNuevo.file = null
  modalNuevoOpen.value = true
}

const onNuevoFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    formNuevo.file = file
    if (!formNuevo.nombre) {
      // Sugerir nombre legible derivado del archivo
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ')
      formNuevo.nombre = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
    }
  }
}

const submitNuevoFormato = async () => {
  if (!formNuevo.nombre || !formNuevo.nombre.trim()) {
    toast.warning('Por favor ingresa el nombre descriptivo del formato.')
    return
  }
  if (!formNuevo.file) {
    toast.warning('Por favor selecciona el archivo del formato a subir.')
    return
  }

  subiendoNuevo.value = true
  const formData = new FormData()
  formData.append('categoriaId', formNuevo.categoriaId)
  formData.append('nombre', formNuevo.nombre.trim())
  formData.append('archivo', formNuevo.file)

  try {
    const { data } = await api.post('/admin/formatos/nuevo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (data.success) {
      await Swal.fire({
        icon: 'success',
        title: '¡Formato Oficial Registrado!',
        text: `El formato "${formNuevo.nombre}" fue publicado y está activo para descarga distrital.`,
        confirmButtonColor: '#6B2D8B',
        background: '#1e1b4b',
        color: '#ffffff',
        customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold px-6 py-2.5' }
      })
      modalNuevoOpen.value = false
      await loadFiles()
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error de carga',
      text: error.response?.data?.message || 'No se pudo subir el nuevo formato.',
      confirmButtonColor: '#6B2D8B',
      background: '#1e1b4b',
      color: '#ffffff'
    })
  } finally {
    subiendoNuevo.value = false
  }
}

// Reemplazar archivo existente
const triggerUpload = (fileName) => {
  if (inputRefs.value[fileName]) {
    inputRefs.value[fileName].click()
  }
}

const onFileSelected = async (event, expectedFileName) => {
  const file = event.target.files[0]
  if (!file) return

  event.target.value = null // reset

  const formData = new FormData()
  formData.append('archivo', file)
  formData.append('nombreArchivo', expectedFileName)

  loading.value = true
  try {
    const { data } = await api.post('/admin/formatos/subir', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Formato Actualizado',
        text: `El archivo ${expectedFileName} se actualizó exitosamente en el servidor.`,
        confirmButtonColor: '#6B2D8B',
        background: '#1e1b4b',
        color: '#ffffff',
        timer: 2000,
        showConfirmButton: false
      })
      await loadFiles()
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error de carga',
      text: error.response?.data?.message || 'No se pudo subir el archivo.',
      confirmButtonColor: '#6B2D8B',
      background: '#1e1b4b',
      color: '#ffffff'
    })
  } finally {
    loading.value = false
  }
}

const downloadFile = (fileName) => {
  const envApi = import.meta.env.VITE_API_URL || '/api'
  const cleanApi = envApi.replace(/\/+$/, '')
  const url = `${cleanApi}/formatos/descargar/${encodeURIComponent(fileName)}`
  window.open(url, '_blank')
}

const deleteFile = async (fileName) => {
  const result = await Swal.fire({
    title: '¿Eliminar formato oficial?',
    text: `Se retirará el archivo "${fileName}" del servidor. Los distritos no podrán descargarlo.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: '#1e1b4b',
    color: '#ffffff'
  })

  if (result.isConfirmed) {
    try {
      const { data } = await api.delete(`/admin/formatos/${encodeURIComponent(fileName)}`)
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'El formato ha sido retirado del servidor.',
          confirmButtonColor: '#6B2D8B',
          background: '#1e1b4b',
          color: '#ffffff',
          timer: 1800,
          showConfirmButton: false
        })
        await loadFiles()
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo eliminar el formato.', 'error')
    }
  }
}

onMounted(() => {
  loadFiles()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Principal -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 rounded-xl shadow-xs">
          <FileText class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Formatos Oficiales Institucionales
            </h1>
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Solo Super Admin
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Control de activación por sección y formato, repositorio de anexos oficiales y subida de nuevos documentos normativos.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 self-start md:self-auto">
        <button
          type="button"
          @click="loadFiles"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin text-purple-600' : ''" />
          <span>Actualizar Estado</span>
        </button>

        <button
          type="button"
          @click="abrirModalNuevoFormato(selectedCategoriaId)"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6B2D8B] hover:bg-[#582472] text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus class="w-4 h-4 stroke-[2.5]" />
          Subir Nuevo Formato
        </button>
      </div>
    </header>

    <!-- Métricas Ejecutivas con Radial -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Radial de Disponibilidad -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg class="w-14 h-14 -rotate-90 transform" viewBox="0 0 36 36">
            <path class="text-slate-100 dark:text-slate-800 stroke-current" stroke-width="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="text-emerald-500 stroke-current transition-all duration-700 ease-out" :stroke-dasharray="`${porcentajeDisponibilidad}, 100`" stroke-width="3.5" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span class="absolute text-xs font-black text-slate-800 dark:text-slate-100">{{ porcentajeDisponibilidad }}%</span>
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponibilidad Oficial</span>
          <span class="text-base font-black text-slate-900 dark:text-white">{{ formatosDisponiblesCount }} de {{ totalFormatos }}</span>
          <span class="block text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Archivos en servidor</span>
        </div>
      </div>

      <!-- Secciones Activas -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center shrink-0">
          <Layers class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secciones Activas</span>
          <span class="text-base font-black text-slate-900 dark:text-white">{{ seccionesActivasCount }} de {{ categorias.length }}</span>
          <span class="block text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">Carpetas habilitadas para distritos</span>
        </div>
      </div>

      <!-- Formatos Activos para Distritos -->
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck class="w-6 h-6" />
        </div>
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visibilidad Distrital</span>
          <span class="text-base font-black text-slate-900 dark:text-white">{{ formatosActivosCount }} Formatos Activos</span>
          <span class="block text-[11px] text-slate-400 font-medium mt-0.5">Listos para consulta y descarga</span>
        </div>
      </div>
    </div>

    <!-- Pestañas de Categorías con Switch de Estado -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
      <button
        v-for="cat in categorias"
        :key="cat.id"
        type="button"
        @click="selectedCategoriaId = cat.id"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border"
        :class="selectedCategoriaId === cat.id
          ? 'bg-[#6B2D8B] text-white shadow-sm border-[#6B2D8B]'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800'"
      >
        <!-- Dot indicador de estado activo/inactivo -->
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="cat.activo !== false ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-400'"
        ></span>

        <span>{{ cat.nombre }}</span>

        <!-- Badge de conteo de archivos en servidor -->
        <span
          class="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
          :class="selectedCategoriaId === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
        >
          {{ (cat.archivos || []).filter(a => checkExists(a.archivo)).length }}/{{ (cat.archivos || []).length }}
        </span>
      </button>
    </div>

    <!-- Panel de la Categoría Seleccionada -->
    <AppCard>
      <template #header>
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/40 shrink-0">
              <FolderOpen class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-bold text-slate-900 dark:text-white">
                  {{ currentCategoria.nombre }}
                </h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-[#6B2D8B] dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {{ currentCategoria.tag }}
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {{ (currentCategoria.archivos || []).length }} formato(s) registrados en esta sección
              </p>
            </div>
          </div>

          <!-- Controles de Sección: Switch Activar/Desactivar y Botón Subir Formato -->
          <div class="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            <!-- Botón / Switch para Activar o Desactivar la Sección Completa -->
            <button
              type="button"
              @click="toggleSeccion(currentCategoria)"
              :disabled="togglingCategoriaId === currentCategoria.id"
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              :class="currentCategoria.activo !== false
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200'"
              :title="currentCategoria.activo !== false ? 'Clic para desactivar esta sección completa' : 'Clic para activar esta sección completa'"
            >
              <ToggleRight v-if="currentCategoria.activo !== false" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <ToggleLeft v-else class="w-4 h-4 text-slate-400 stroke-[2.5]" />
              <span>{{ currentCategoria.activo !== false ? 'Sección Activa (Visible)' : 'Sección Desactivada (Oculta)' }}</span>
            </button>

            <!-- Botón Agregar Formato a esta Categoría -->
            <button
              type="button"
              @click="abrirModalNuevoFormato(currentCategoria.id)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-[#6B2D8B] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Subir Formato Aquí</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Mensaje si la sección está desactivada -->
      <div v-if="currentCategoria.activo === false" class="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
        <EyeOff class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div class="text-xs text-amber-900 dark:text-amber-300">
          <span class="font-bold">Esta sección se encuentra desactivada:</span> Los órganos distritales no pueden ver ni descargar ningún formato perteneciente a esta categoría.
        </div>
      </div>

      <!-- Lista de Formatos de la Categoría -->
      <div class="space-y-3">
        <div
          v-for="item in currentCategoria.archivos"
          :key="item.archivo"
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all"
          :class="item.activo === false
            ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-60'
            : 'bg-white dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 shadow-xs'"
        >
          <!-- Info del Formato -->
          <div class="flex items-start gap-3.5 min-w-0">
            <!-- Icono del documento -->
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
              :class="checkExists(item.archivo)
                ? 'bg-purple-50 dark:bg-purple-950/50 text-[#6B2D8B] dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'"
            >
              <FileText class="w-5 h-5" />
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {{ item.nombre }}
                </h4>
                <span v-if="item.custom" class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-[#6B2D8B] dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                  Añadido por Admin
                </span>
              </div>

              <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                <!-- Nombre del archivo físico -->
                <span class="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {{ item.archivo }}
                </span>

                <!-- Badge Estado en Servidor -->
                <span
                  v-if="checkExists(item.archivo)"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40"
                >
                  <CheckCircle2 class="w-3 h-3" />
                  Disponible en servidor
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40"
                >
                  <AlertCircle class="w-3 h-3" />
                  Pendiente de carga
                </span>
              </div>
            </div>
          </div>

          <!-- Acciones y Toggle por Formato -->
          <div class="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            <!-- Input oculto para reemplazo directo -->
            <input
              type="file"
              :ref="el => { if (el) inputRefs[item.archivo] = el }"
              class="hidden"
              @change="onFileSelected($event, item.archivo)"
            />

            <!-- Switch Activar / Desactivar Formato Individual -->
            <button
              type="button"
              @click="toggleFormato(currentCategoria, item)"
              :disabled="togglingFormatoKey === item.archivo"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              :class="item.activo !== false
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200'"
              :title="item.activo !== false ? 'Clic para desactivar/ocultar este formato a los distritos' : 'Clic para activar/habilitar este formato a los distritos'"
            >
              <ToggleRight v-if="item.activo !== false" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <ToggleLeft v-else class="w-4 h-4 text-slate-400 stroke-[2.5]" />
              <span>{{ item.activo !== false ? 'Activo' : 'Desactivado' }}</span>
            </button>

            <!-- Botón Descargar (Si existe) -->
            <button
              v-if="checkExists(item.archivo)"
              type="button"
              @click="downloadFile(item.archivo)"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              title="Descargar archivo oficial"
            >
              <FileDown class="w-3.5 h-3.5" />
              <span>Descargar</span>
            </button>

            <!-- Botón Reemplazar / Subir -->
            <button
              type="button"
              @click="triggerUpload(item.archivo)"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              :class="checkExists(item.archivo)
                ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200'
                : 'bg-[#6B2D8B] hover:bg-[#582472] text-white shadow-xs'"
              :title="checkExists(item.archivo) ? 'Reemplazar archivo en servidor' : 'Subir archivo requerido'"
            >
              <Upload class="w-3.5 h-3.5" />
              <span>{{ checkExists(item.archivo) ? 'Reemplazar' : 'Subir' }}</span>
            </button>

            <!-- Botón Eliminar -->
            <button
              v-if="checkExists(item.archivo)"
              type="button"
              @click="deleteFile(item.archivo)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Eliminar archivo del servidor"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Modal para Subir Nuevo Formato Oficial -->
    <AppModal
      :open="modalNuevoOpen"
      title="Subir Nuevo Formato Oficial"
      maxWidth="max-w-lg"
      @close="modalNuevoOpen = false"
    >
      <div class="space-y-4 text-slate-700 dark:text-slate-300">
        <!-- Selector de Categoría / Sección -->
        <div>
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
            Sección / Categoría de Destino
          </label>
          <select
            v-model="formNuevo.categoriaId"
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          >
            <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
              {{ cat.nombre }} ({{ cat.tag }})
            </option>
          </select>
        </div>

        <!-- Nombre descriptivo oficial -->
        <div>
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
            Nombre Descriptivo del Formato
          </label>
          <input
            v-model="formNuevo.nombre"
            type="text"
            placeholder="Ej. Anexo 10 - Formato de Evaluación de Impacto Cívico"
            class="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>

        <!-- Selector de Archivo -->
        <div>
          <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
            Archivo del Documento (.docx, .pdf, .xlsx)
          </label>
          <div class="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center hover:border-purple-400 transition-colors">
            <input
              type="file"
              id="input-archivo-nuevo"
              class="hidden"
              accept=".docx,.doc,.pdf,.xlsx,.xls"
              @change="onNuevoFileChange"
            />
            <label for="input-archivo-nuevo" class="cursor-pointer block">
              <FolderPlus class="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <span v-if="formNuevo.file" class="font-bold text-sm text-purple-900 dark:text-purple-300 block">
                {{ formNuevo.file.name }}
              </span>
              <span v-else class="text-xs text-slate-600 dark:text-slate-400 block">
                Haz clic aquí para seleccionar el archivo desde tu computadora
              </span>
              <span class="text-[11px] text-slate-400 block mt-1">
                Formatos permitidos: Word (.docx), PDF (.pdf), Excel (.xlsx)
              </span>
            </label>
          </div>
        </div>

        <div class="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200/60 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300 flex items-start gap-2.5">
          <Sparkles class="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <span>El formato se publicará con estado <strong>Activo</strong> por defecto y se registrará en la auditoría del sistema para su descarga inmediata por los distritos.</span>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <AppButton variant="secondary" @click="modalNuevoOpen = false">
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            class="bg-[#6B2D8B] text-white hover:bg-[#582472]"
            :loading="subiendoNuevo"
            @click="submitNuevoFormato"
          >
            Subir y Publicar Formato
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
