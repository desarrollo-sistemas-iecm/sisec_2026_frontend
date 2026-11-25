<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  Folder, File, Trash2, Upload, ChevronLeft, ChevronRight, HardDrive,
  RefreshCw, Eye, Download, Archive, FolderArchive, FileText, Image as ImageIcon,
  ShieldCheck, AlertTriangle, Sparkles, CheckCircle2, ArrowDownToLine
} from '@lucide/vue'
import api from '../../services/api'
import Swal from 'sweetalert2'
import AppCard from '../../components/ui/AppCard.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppBadge from '../../components/ui/AppBadge.vue'

const currentPath = ref('') // Root es '' que corresponde estrictamente a la carpeta 2027
const entries = ref([])
const loading = ref(true)
const compressingZip = ref(false)

const loadTree = async (folder = '') => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/archivos', { params: { folder } })
    if (data.success) {
      entries.value = data.data
      currentPath.value = folder
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error de carga',
      text: 'No se pudieron cargar los archivos del directorio.',
      confirmButtonColor: '#6B2D8B'
    })
  } finally {
    loading.value = false
  }
}

const goUp = () => {
  if (!currentPath.value) return
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  loadTree(parts.join('/'))
}

const goToFolder = (folderName) => {
  const newPath = currentPath.value ? `${currentPath.value}/${folderName}` : folderName
  loadTree(newPath)
}

const goToBreadcrumb = (index) => {
  if (index === -1) {
    loadTree('')
    return
  }
  const parts = currentPath.value.split('/').filter(Boolean)
  const target = parts.slice(0, index + 1).join('/')
  loadTree(target)
}

const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('/').filter(Boolean)
})

// Estadísticas del directorio actual
const totalCarpetas = computed(() => entries.value.filter(e => e.isDir).length)
const totalArchivos = computed(() => entries.value.filter(e => !e.isDir).length)
const totalBytes = computed(() => entries.value.reduce((acc, curr) => acc + (curr.size || 0), 0))

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Detección contextual del nivel para el botón de descarga ZIP (con 2027 como raíz)
const zipContextInfo = computed(() => {
  const norm = currentPath.value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  if (norm === '' || norm === '2027') {
    return {
      canZip: true,
      label: 'Descargar Concentrado ZIP (Todos los Distritos 2027)',
      tooltip: 'Genera un archivo ZIP con todas las carpetas distritales de 2027',
      variant: 'primary',
      highlight: true
    }
  }
  if (/^(2027\/)?DD\d+$/i.test(norm)) {
    const dd = norm.split('/').pop().toUpperCase()
    return {
      canZip: true,
      label: `Descargar ZIP Distrito ${dd} (Todas las Acciones)`,
      tooltip: `Genera un archivo ZIP con todas las acciones educativas del Distrito ${dd}`,
      variant: 'primary',
      highlight: true
    }
  }
  if (/(^|\/)AE-/i.test(norm)) {
    const ae = norm.split('/').pop().toUpperCase()
    return {
      canZip: true,
      label: `Descargar Expediente en ZIP (${ae})`,
      tooltip: 'Descarga los formatos oficiales, fotografías y encuestas de la acción',
      variant: 'primary',
      highlight: true
    }
  }
  return {
    canZip: true,
    label: 'Descargar Carpeta Completa en ZIP',
    tooltip: 'Comprime el contenido de esta carpeta en un archivo ZIP',
    variant: 'secondary',
    highlight: false
  }
})

// Descarga comprimida en ZIP mediante stream
const downloadFolderAsZip = async () => {
  if (!zipContextInfo.value.canZip || compressingZip.value) return

  compressingZip.value = true

  // Alerta moderna SweetAlert mientras se genera el ZIP en servidor
  Swal.fire({
    title: 'Generando archivo ZIP...',
    html: `
      <div class="space-y-3 text-sm py-2">
        <p class="text-slate-600 dark:text-slate-300">
          Empaquetando y comprimiendo el repositorio institucional. La descarga comenzará automáticamente.
        </p>
        <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-[#6B2D8B] to-purple-500 animate-pulse w-full"></div>
        </div>
      </div>
    `,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })

  try {
    const token = JSON.parse(localStorage.getItem('sicec_token') || 'null')
    const envApi = import.meta.env.VITE_API_URL || '/api'
    const cleanApi = envApi.replace(/\/+$/, '')
    const downloadUrl = `${cleanApi}/admin/archivos/zip?folder=${encodeURIComponent(currentPath.value)}`

    // Descarga directa mediante enlace con token o blob
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('No se pudo generar el archivo ZIP.')
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('content-disposition')
    let filename = 'ARCHIVOS_2027.zip'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match && match[1]) filename = match[1]
    }

    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)

    Swal.fire({
      icon: 'success',
      title: '¡ZIP Descargado!',
      text: `El archivo ${filename} se ha descargado correctamente.`,
      confirmButtonColor: '#6B2D8B',
      timer: 2500,
      showConfirmButton: false
    })
  } catch (error) {
    console.error('Error al descargar ZIP:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error de compresión',
      text: error.message || 'Ocurrió un error al generar el archivo ZIP.',
      confirmButtonColor: '#6B2D8B'
    })
  } finally {
    compressingZip.value = false
  }
}

// Descargar un archivo individual (resuelto bajo la raíz 2027)
const downloadSingleFile = (filepath) => {
  const envApi = import.meta.env.VITE_API_URL || '/api'
  const cleanApi = envApi.replace(/\/+$/, '')
  const cleanPath = String(filepath || '').replace(/^[\\\/]*2027([\\\/]|$)/i, '')
  const url = `${cleanApi}/../uploads/2027/${cleanPath}`.replace(/\/+/g, '/')
  window.open(url, '_blank')
}

// Reto de eliminación obligatoria
const deleteFile = async (filepath) => {
  const filename = filepath.split('/').pop()
  const { value: formValues } = await Swal.fire({
    title: 'Reto de Seguridad Obligatorio',
    html: `
      <div class="text-left space-y-3 text-sm py-2">
        <p class="text-slate-600 dark:text-slate-300">
          Estás a punto de eliminar permanentemente el archivo:
          <span class="font-bold text-red-600 block mt-1 break-all">${filename}</span>
        </p>
        <p class="text-xs text-slate-500">
          Esta acción quedará registrada en la bitácora de auditoría del sistema. Para desbloquear la eliminación, escribe la palabra <strong class="text-red-600">ELIMINAR</strong> en mayúsculas:
        </p>
        <input id="swal-input-word" class="swal2-input !m-0 !w-full font-mono uppercase" placeholder="Escribe ELIMINAR" />
        <p class="text-xs text-slate-500 mt-2">Motivo de la eliminación (opcional):</p>
        <input id="swal-input-motivo" class="swal2-input !m-0 !w-full text-xs" placeholder="Ej. Archivo corrupto o duplicado..." />
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Confirmar Eliminación',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const word = document.getElementById('swal-input-word')?.value?.trim()
      const motivo = document.getElementById('swal-input-motivo')?.value?.trim()
      if (word !== 'ELIMINAR') {
        Swal.showValidationMessage('Debes escribir la palabra exacta "ELIMINAR"')
        return false
      }
      return { confirmationWord: word, motivo }
    }
  })

  if (formValues) {
    try {
      const { data } = await api.post('/admin/archivos/delete', {
        filepath,
        confirmationWord: formValues.confirmationWord,
        motivo: formValues.motivo
      })
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Archivo Eliminado',
          text: 'La acción ha quedado registrada en la bitácora de auditoría.',
          confirmButtonColor: '#6B2D8B',
          timer: 2000,
          showConfirmButton: false
        })
        loadTree(currentPath.value)
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'No se pudo eliminar el archivo.',
        confirmButtonColor: '#6B2D8B'
      })
    }
  }
}

// Reemplazar archivo
const replaceFileInput = ref(null)
const selectedFileToReplace = ref(null)

const triggerReplace = (filepath) => {
  selectedFileToReplace.value = filepath
  if (replaceFileInput.value) {
    replaceFileInput.value.click()
  }
}

const onFileReplaced = async (event) => {
  const file = event.target.files[0]
  if (!file || !selectedFileToReplace.value) return

  event.target.value = null // reset

  const formData = new FormData()
  formData.append('archivo', file)
  formData.append('filepath', selectedFileToReplace.value)

  try {
    const { data } = await api.post('/admin/archivos/replace', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Archivo Reemplazado',
        text: 'El archivo se actualizó correctamente en el servidor.',
        confirmButtonColor: '#6B2D8B',
        timer: 2000,
        showConfirmButton: false
      })
      loadTree(currentPath.value)
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo reemplazar el archivo.',
      confirmButtonColor: '#6B2D8B'
    })
  } finally {
    selectedFileToReplace.value = null
  }
}

onMounted(() => {
  loadTree('')
})
</script>

<template>
  <div class="space-y-6">
    <!-- Input oculto para reemplazo -->
    <input
      type="file"
      ref="replaceFileInput"
      class="hidden"
      @change="onFileReplaced"
    />

    <!-- Header Principal -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-100 dark:bg-purple-950/60 text-[#6B2D8B] dark:text-purple-300 rounded-xl shadow-xs">
          <HardDrive class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Explorador de Archivos y Repositorio 2027
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión de expedientes digitales, evidencias fotográficas, formatos oficiales y encuestas ciudadanas.
          </p>
        </div>
      </div>

      <!-- Acciones de Cabecera: Recargar y Descarga ZIP Contextual -->
      <div class="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
        <!-- Botón Contextual de ZIP -->
        <button
          v-if="zipContextInfo.canZip"
          type="button"
          @click="downloadFolderAsZip"
          :disabled="compressingZip"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          :class="zipContextInfo.highlight
            ? 'bg-gradient-to-r from-[#6B2D8B] to-purple-600 hover:from-[#582472] hover:to-purple-700 text-white shadow-purple-900/20'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'"
          :title="zipContextInfo.tooltip"
        >
          <FolderArchive class="w-4 h-4 stroke-[2.2]" :class="compressingZip ? 'animate-bounce' : ''" />
          <span>{{ zipContextInfo.label }}</span>
        </button>

        <!-- Botón Recargar -->
        <button
          type="button"
          @click="loadTree(currentPath)"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin text-purple-600' : ''" />
          <span>Actualizar</span>
        </button>
      </div>
    </header>

    <!-- Métricas del Directorio Actual -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subcarpetas</span>
          <span class="text-xl font-black text-slate-900 dark:text-white">{{ totalCarpetas }}</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Folder class="w-5 h-5" />
        </div>
      </div>

      <div class="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archivos</span>
          <span class="text-xl font-black text-slate-900 dark:text-white">{{ totalArchivos }}</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <FileText class="w-5 h-5" />
        </div>
      </div>

      <div class="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamaño Nivel</span>
          <span class="text-xl font-black text-slate-900 dark:text-white">{{ formatBytes(totalBytes) }}</span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <HardDrive class="w-5 h-5" />
        </div>
      </div>

      <div class="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seguridad</span>
          <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
            <ShieldCheck class="w-3.5 h-3.5" />
            Auditoría Activa
          </span>
        </div>
        <div class="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center">
          <ShieldCheck class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- Navegador de Directorios y Breadcrumb Interactivo -->
    <AppCard>
      <template #header>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <!-- Breadcrumb clicable con raíz en 2027 -->
          <nav class="flex items-center gap-1.5 text-xs flex-wrap font-medium">
            <button
              type="button"
              @click="goToBreadcrumb(-1)"
              class="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              :class="breadcrumbs.length === 0 ? 'font-bold text-purple-700 dark:text-purple-300' : 'text-slate-500'"
            >
              <HardDrive class="w-3.5 h-3.5" />
              <span>Directorio Raíz (2027)</span>
            </button>

            <template v-for="(segment, idx) in breadcrumbs" :key="idx">
              <ChevronRight class="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                type="button"
                @click="goToBreadcrumb(idx)"
                class="hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                :class="idx === breadcrumbs.length - 1 ? 'font-bold text-purple-700 dark:text-purple-300' : 'text-slate-500'"
              >
                {{ segment }}
              </button>
            </template>
          </nav>

          <!-- Botón Volver Atrás -->
          <button
            v-if="currentPath"
            type="button"
            @click="goUp"
            class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <ChevronLeft class="w-3.5 h-3.5" />
            <span>Atrás</span>
          </button>
        </div>
      </template>

      <!-- Estado de Carga -->
      <div v-if="loading" class="p-12 text-center text-slate-400">
        <RefreshCw class="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
        <span class="text-xs font-medium">Explorando directorio...</span>
      </div>

      <!-- Directorio Vacío -->
      <div v-else-if="entries.length === 0" class="p-12 text-center">
        <FolderArchive class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
        <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">Carpeta vacía</h4>
        <p class="text-xs text-slate-400 mt-1">No se encontraron subcarpetas ni archivos en este nivel.</p>
      </div>

      <!-- Lista de Contenidos -->
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div
          v-for="item in entries"
          :key="item.path"
          class="flex items-center justify-between p-3.5 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group rounded-xl"
        >
          <!-- Si es Carpeta -->
          <button
            v-if="item.isDir"
            type="button"
            @click="goToFolder(item.name)"
            class="flex items-center gap-3 text-left w-full cursor-pointer"
          >
            <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/40 group-hover:scale-105 transition-transform">
              <Folder class="w-5 h-5 fill-amber-500/20" />
            </div>
            <div class="truncate">
              <span class="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors truncate">
                {{ item.name }}
              </span>
              <span class="text-[11px] text-slate-400 font-medium">Carpeta</span>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 ml-auto mr-2 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          <!-- Si es Archivo -->
          <div v-else class="flex items-center justify-between w-full gap-4">
            <div class="flex items-center gap-3 truncate">
              <!-- Icono dinámico según extensión -->
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                :class="item.name.endsWith('.pdf')
                  ? 'bg-red-50 text-red-600 border-red-200/60 dark:bg-red-950/40 dark:border-red-900/40'
                  : item.name.endsWith('.docx') || item.name.endsWith('.doc')
                  ? 'bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-950/40 dark:border-blue-900/40'
                  : item.name.match(/\.(png|jpe?g|webp)$/i)
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-900/40'
                  : 'bg-purple-50 text-[#6B2D8B] border-purple-200/60 dark:bg-purple-950/40 dark:border-purple-900/40'"
              >
                <FileText v-if="!item.name.match(/\.(png|jpe?g|webp)$/i)" class="w-5 h-5" />
                <ImageIcon v-else class="w-5 h-5" />
              </div>

              <div class="truncate">
                <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate" :title="item.name">
                  {{ item.name }}
                </span>
                <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span class="font-mono font-bold">{{ formatBytes(item.size) }}</span>
                  <span>•</span>
                  <span>{{ formatDate(item.modified) }}</span>
                </div>
              </div>
            </div>

            <!-- Acciones para Archivo -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                @click="downloadSingleFile(item.path)"
                class="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                title="Descargar / Visualizar archivo"
              >
                <Eye class="w-4 h-4" />
              </button>

              <button
                type="button"
                @click="triggerReplace(item.path)"
                class="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                title="Reemplazar archivo"
              >
                <Upload class="w-4 h-4" />
              </button>

              <button
                type="button"
                @click="deleteFile(item.path)"
                class="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                title="Eliminar permanentemente (Requiere confirmación)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
