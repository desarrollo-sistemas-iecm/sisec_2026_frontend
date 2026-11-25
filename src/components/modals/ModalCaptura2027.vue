<script setup>
import { computed, ref, watch, reactive } from 'vue'
import Swal from 'sweetalert2'
import {
  FileText, Upload, Image, CheckCircle, Lock, AlertCircle,
  Clock, Calendar, Users, Eye, Download, ShieldCheck,
  ExternalLink, X, Loader2, Save, FileCheck2, Sparkles
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

// Estado del visor de documentos
const cargandoArchivo = ref(null) // 1, 2, 3, 4 cuando se descarga del servidor
const mostrarVisor = ref(false)
const visorData = ref(null) // { url, nombre, tipo, titulo, isBlob }
const archivo3Thumbnail = ref(null)

// Campos de Captura
const modalidad = ref(0) // 0: Presencial, 1: Virtual
const fechaRealizacion = ref('')
const duracionHora = ref('01:00') // Hora estimada
const duracionRealActividad = ref(1) // Duración real en horas (número)

// Función auxiliar para parsear la duración real a número de horas
const parseDuracionReal = (val) => {
  if (val === undefined || val === null || val === '') return 1
  if (typeof val === 'number') return val > 0 ? val : 1
  const s = String(val).trim()
  if (s.includes(':')) {
    const parts = s.split(':')
    const h = parseFloat(parts[0]) || 0
    const m = (parseFloat(parts[1]) || 0) / 60
    const total = parseFloat((h + m).toFixed(1))
    return total > 0 ? total : 1
  }
  const n = parseFloat(s)
  return (!isNaN(n) && n > 0) ? n : 1
}

// Matriz Demográfica (5 Géneros x 6 Grupos de Edad) con paleta distintiva
const generosList = [
  {
    key: 'mujeres',
    label: 'Mujer',
    dotColor: '#EC4899', // Pink / Rosa
    badgeClass: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200/80 dark:border-pink-800/40',
    totalClass: 'bg-pink-50/70 dark:bg-pink-950/30 text-pink-800 dark:text-pink-200 font-extrabold',
    rowHover: 'hover:bg-pink-50/20 dark:hover:bg-pink-950/10'
  },
  {
    key: 'hombres',
    label: 'Hombre',
    dotColor: '#2563EB', // Blue / Azul
    badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/40',
    totalClass: 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 font-extrabold',
    rowHover: 'hover:bg-blue-50/20 dark:hover:bg-blue-950/10'
  },
  {
    key: 'no_binario',
    label: 'Persona no binaria',
    dotColor: '#8B5CF6', // Purple / Violeta
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/40',
    totalClass: 'bg-purple-50/70 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200 font-extrabold',
    rowHover: 'hover:bg-purple-50/20 dark:hover:bg-purple-950/10'
  },
  {
    key: 'Otro',
    label: 'Otro',
    dotColor: '#F59E0B', // Amber / Ámbar
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
    totalClass: 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 font-extrabold',
    rowHover: 'hover:bg-amber-50/20 dark:hover:bg-amber-950/10'
  },
  {
    key: 'prefiero_no_decirlo',
    label: 'Prefiero no decirlo',
    dotColor: '#64748B', // Slate / Gris
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    totalClass: 'bg-slate-100/70 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 font-extrabold',
    rowHover: 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
  }
]

const gruposEdadList = [
  {
    idx: 1,
    label: 'Primera infancia (0 - 5 años)',
    shortLabel: 'Primera infancia (0-5)',
    color: '#0284C7', // Sky
    headerClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/40',
    footerClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/40',
    focusRing: 'focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
  },
  {
    idx: 2,
    label: 'Niñez (6 - 11 años)',
    shortLabel: 'Niñez (6-11)',
    color: '#0D9488', // Teal
    headerClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/40',
    footerClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/40',
    focusRing: 'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
  },
  {
    idx: 3,
    label: 'Adolescencia (12 - 17 años)',
    shortLabel: 'Adolescencia (12-17)',
    color: '#4F46E5', // Indigo
    headerClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/40',
    footerClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/40',
    focusRing: 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
  },
  {
    idx: 4,
    label: 'Jóvenes (18 - 29 años)',
    shortLabel: 'Jóvenes (18-29)',
    color: '#059669', // Emerald
    headerClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40',
    footerClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40',
    focusRing: 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  },
  {
    idx: 5,
    label: 'Personas adultas (30 - 59 años)',
    shortLabel: 'Adultos (30-59)',
    color: '#D97706', // Amber
    headerClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
    footerClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
    focusRing: 'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
  },
  {
    idx: 6,
    label: 'Personas mayores (60+ años)',
    shortLabel: 'Mayores (60+)',
    color: '#7C3AED', // Purple
    headerClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/40',
    footerClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/40',
    focusRing: 'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
  }
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
    if (archivo3Thumbnail.value) {
      URL.revokeObjectURL(archivo3Thumbnail.value)
      archivo3Thumbnail.value = null
    }
    cargandoArchivo.value = null
    mostrarVisor.value = false
    visorData.value = null

    modalidad.value = props.actividad.modalidad ?? 0
    fechaRealizacion.value = props.actividad.fecha_programada ? String(props.actividad.fecha_programada).split('T')[0] : ''
    duracionHora.value = props.actividad.hora_programada || '01:00'
    duracionRealActividad.value = 1

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
        duracionRealActividad.value = parseDuracionReal(d.duracion_real_actividad)

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

// Manejo de carga de archivos con validación de peso y previsualización
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
  if (tipo === 'archivo3') {
    archivo3.value = file
    if (archivo3Thumbnail.value) {
      URL.revokeObjectURL(archivo3Thumbnail.value)
    }
    archivo3Thumbnail.value = URL.createObjectURL(file)
  }
  if (tipo === 'archivo4') archivo4.value = file
}

// Títulos institucionales para el visualizador
const getTituloArchivo = (num) => {
  switch (num) {
    case 1: return '1. Formato de registro de acción educativa'
    case 2: return '2. Formato de asistencia a acción educativa'
    case 3: return '3. Evidencia fotográfica de la actividad'
    case 4: return '4. Encuestas de satisfacción consolidadas'
    default: return 'Documento de Evidencia Institucional'
  }
}

// Visualizador dinámico de archivos (tanto locales recién seleccionados como remotos guardados)
const verArchivo = async (num) => {
  const localFiles = {
    1: archivo1.value,
    2: archivo2.value,
    3: archivo3.value,
    4: archivo4.value
  }
  const fileLocal = localFiles[num]

  // 1. Caso: El archivo acaba de ser seleccionado localmente en este modal
  if (fileLocal) {
    const isImage = fileLocal.type.startsWith('image') || /\.(jpe?g|png|webp)$/i.test(fileLocal.name)
    const url = URL.createObjectURL(fileLocal)
    visorData.value = {
      url,
      nombre: fileLocal.name,
      tipo: isImage ? 'imagen' : 'pdf',
      titulo: getTituloArchivo(num),
      isBlob: true
    }
    mostrarVisor.value = true
    return
  }

  // 2. Caso: El archivo ya está guardado en el servidor
  const nombreGuardado = archivosExistentes[`archivo${num}`]
  if (nombreGuardado && props.actividad?.id_acciones_educativas) {
    try {
      cargandoArchivo.value = num
      const resp = await api.get(`/captura-2027/${props.actividad.id_acciones_educativas}/archivo/${num}`, {
        responseType: 'blob'
      })
      const contentType = resp.headers['content-type'] || (nombreGuardado.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
      const blob = new Blob([resp.data], { type: contentType })
      const url = URL.createObjectURL(blob)
      const isImage = contentType.startsWith('image') || /\.(jpe?g|png|webp)$/i.test(nombreGuardado)
      visorData.value = {
        url,
        nombre: nombreGuardado,
        tipo: isImage ? 'imagen' : 'pdf',
        titulo: getTituloArchivo(num),
        isBlob: true
      }
      mostrarVisor.value = true
    } catch (err) {
      toast.error('No se pudo cargar el archivo desde el servidor.')
    } finally {
      cargandoArchivo.value = null
    }
  } else {
    toast.info('No hay ningún archivo disponible para visualizar.')
  }
}

// Cerrar visor y limpiar memoria de objetos Blob
const cerrarVisor = () => {
  mostrarVisor.value = false
  if (visorData.value?.isBlob && visorData.value?.url) {
    const oldUrl = visorData.value.url
    setTimeout(() => {
      try { URL.revokeObjectURL(oldUrl) } catch (e) {}
    }, 400)
  }
  visorData.value = null
}

// Abrir en pestaña nueva nativa del navegador
const abrirEnPestanaNueva = () => {
  if (visorData.value?.url) {
    window.open(visorData.value.url, '_blank')
  }
}

// Descargar archivo directamente
const descargarArchivoVisor = () => {
  if (!visorData.value?.url) return
  const a = document.createElement('a')
  a.href = visorData.value.url
  a.download = visorData.value.nombre || 'documento'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 1. Guardar Información y primeros 3 archivos (Genera Folio Inmutable)
const guardarInformacion = async () => {
  if (!fechaRealizacion.value) {
    toast.warning('Por favor ingresa la Fecha de realización de la acción educativa.')
    return
  }
  if (!duracionRealActividad.value || Number(duracionRealActividad.value) <= 0) {
    toast.warning('Por favor ingresa la duración real de la actividad en horas (ej. 5).')
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
    formData.append('duracion_real_actividad', String(duracionRealActividad.value || '1'))
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
    <div class="space-y-6 pt-1">
      
      <!-- Aviso de solo lectura si está finalizada -->
      <div v-if="readOnlyComputed" class="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-200 shadow-xs">
        <ShieldCheck class="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <strong class="font-bold">Acción Finalizada:</strong> Los datos y evidencias se encuentran resguardados en modo solo lectura para consulta y descarga institucional.
        </div>
      </div>

      <!-- 1. MODALIDAD Y REGISTRO DE TIEMPO -->
      <div class="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#6B2D8B] dark:text-purple-300">
            <div class="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center shadow-xs">
              <Clock class="w-4 h-4" />
            </div>
            <span class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Modalidad y Registro de Tiempo</span>
          </div>

          <!-- Metadatos de la acción: Folio y Estado -->
          <div class="flex items-center gap-2 flex-wrap">
            <span 
              v-if="actividad?.folio_accion_educativa"
              class="px-3 py-1 rounded-lg text-xs font-mono font-extrabold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs"
            >
              {{ actividad.folio_accion_educativa }}
            </span>
            <span
              v-else
              class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 italic shadow-xs"
            >
              Sin folio
            </span>

            <span 
              class="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs"
              :class="{
                'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800': estaFinalizada,
                'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800': !estaFinalizada && actividad?.id_estado === 2,
                'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800': actividad?.id_estado === 1
              }"
            >
              {{ estaFinalizada ? 'Finalizada' : (actividad?.id_estado === 2 ? 'Capturada' : 'Sin Capturar') }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Modalidad <span class="text-red-500">*</span>
            </label>
            <select v-model="modalidad" :disabled="readOnlyComputed" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-iecm-morado focus:ring-2 focus:ring-iecm-morado/20 cursor-pointer disabled:opacity-60 transition-all font-medium">
              <option :value="0">Presencial</option>
              <option :value="1">Virtual</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Fecha de realización <span class="text-red-500">*</span>
            </label>
            <input v-model="fechaRealizacion" type="date" :disabled="readOnlyComputed" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-iecm-morado focus:ring-2 focus:ring-iecm-morado/20 disabled:opacity-60 transition-all font-medium" />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Hora estimada
            </label>
            <input v-model="duracionHora" type="time" :disabled="readOnlyComputed" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-iecm-morado focus:ring-2 focus:ring-iecm-morado/20 disabled:opacity-60 transition-all font-medium" />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Duración real de la actividad <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input 
                v-model.number="duracionRealActividad" 
                type="number" 
                min="0.5" 
                max="24" 
                step="0.5" 
                placeholder="Ej. 5" 
                :disabled="readOnlyComputed" 
                class="w-full pl-3.5 pr-14 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-iecm-morado focus:ring-2 focus:ring-iecm-morado/20 disabled:opacity-60 transition-all font-bold" 
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-bold text-slate-400 dark:text-slate-500">
                horas
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. TABLA DE POBLACIÓN BENEFICIADA (5 GÉNEROS X 6 EDADES) CON IDENTIDAD DE COLOR -->
      <div class="bg-white dark:bg-iecm-dark-header p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#6B2D8B] dark:text-purple-300">
            <div class="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center shadow-xs">
              <Users class="w-4 h-4" />
            </div>
            <span class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Matriz de Población Beneficiada (5 Géneros × 6 Grupos de Edad)</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 px-3.5 py-1.5 rounded-full shadow-xs">
            <span>Total General:</span>
            <span class="text-[#6B2D8B] dark:text-purple-300 text-base font-black">{{ totalGeneral }}</span>
            <span class="text-slate-500 font-normal">personas</span>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-inner">
          <table class="w-full text-xs text-left border-collapse">
            <thead class="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10">
              <tr>
                <th class="p-3 pl-4 min-w-[170px] font-bold uppercase text-[11px] tracking-wider text-slate-600 dark:text-slate-400">
                  Género
                </th>
                <!-- Columnas de Grupos de Edad con color distintivo -->
                <th v-for="e in gruposEdadList" :key="e.idx" class="p-2.5 text-center min-w-[125px]">
                  <div class="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold leading-tight shadow-2xs" :class="e.headerClass">
                    <span class="hidden md:inline">{{ e.label }}</span>
                    <span class="md:hidden">{{ e.shortLabel }}</span>
                  </div>
                </th>
                <th class="p-3 text-center bg-purple-100/70 dark:bg-purple-950/50 text-[#6B2D8B] dark:text-purple-300 font-black text-[11px] uppercase tracking-wider min-w-[95px]">
                  Total Fila
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <tr v-for="g in generosList" :key="g.key" :class="[g.rowHover, 'transition-colors']">
                <!-- Etiqueta de Género con color y viñeta distintiva -->
                <td class="p-2.5 pl-4">
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold shadow-2xs" :class="g.badgeClass">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" :style="{ backgroundColor: g.dotColor }"></span>
                    <span>{{ g.label }}</span>
                  </div>
                </td>

                <!-- Inputs de conteo por edad -->
                <td v-for="e in gruposEdadList" :key="e.idx" class="p-2 text-center">
                  <input
                    v-model.number="matriz[`G_${g.key}_${e.idx}`]"
                    type="number"
                    min="0"
                    :disabled="readOnlyComputed"
                    class="w-20 px-2 py-1.5 text-center font-bold text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-xs"
                    :class="e.focusRing"
                  />
                </td>

                <!-- Total por fila con fondo del género -->
                <td class="p-2.5 text-center font-black text-sm" :class="g.totalClass">
                  {{ totalesPorGenero[g.key] }}
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-100/90 dark:bg-slate-800/90 font-extrabold border-t-2 border-slate-300 dark:border-white/20">
              <tr>
                <td class="p-3 pl-4 text-slate-800 dark:text-slate-100 text-xs font-black uppercase tracking-wider">
                  Total por Edad:
                </td>
                <!-- Totales por columna de edad con su color respectivo -->
                <td v-for="e in gruposEdadList" :key="e.idx" class="p-2.5 text-center">
                  <span class="inline-block px-3 py-1 rounded-lg border font-black text-sm shadow-2xs" :class="e.footerClass">
                    {{ totalesPorEdad[e.idx] }}
                  </span>
                </td>
                <td class="p-3 text-center bg-[#6B2D8B] text-white font-black text-base shadow-sm">
                  {{ totalGeneral }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- 3. GESTIÓN PROGRESIVA DE ARCHIVOS (4 DOCUMENTOS) -->
      <div class="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
        <div class="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#6B2D8B] dark:text-purple-300">
          <div class="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-[#6B2D8B] dark:text-purple-300 flex items-center justify-center">
            <Upload class="w-3.5 h-3.5" />
          </div>
          <span>Expediente Digital de Evidencias (Formatos Oficiales)</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Archivo 1: Formato de registro de acción educativa -->
          <div class="p-4 bg-white dark:bg-iecm-dark-header border border-slate-200/80 dark:border-white/10 rounded-xl space-y-3 shadow-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText class="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>1. Formato de registro de acción educativa *</span>
              </span>
              <span v-if="archivosExistentes.archivo1 || archivo1" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <CheckCircle class="w-3.5 h-3.5" /> {{ archivo1 ? 'Por guardar' : 'Cargado' }}
              </span>
              <span v-else class="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                PDF (10MB)
              </span>
            </div>

            <input 
              type="file" 
              accept=".pdf" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo1', 10)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-iecm-morado hover:file:bg-purple-200 cursor-pointer disabled:opacity-50 transition-all"
            />

            <!-- Barra de estado y botón Ver Archivo -->
            <div v-if="archivo1 || archivosExistentes.archivo1" class="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/40 p-2 rounded-lg">
              <div class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 truncate font-mono">
                <CheckCircle class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span class="truncate font-medium" :title="archivo1 ? archivo1.name : archivosExistentes.archivo1">
                  {{ archivo1 ? archivo1.name : archivosExistentes.archivo1 }}
                </span>
              </div>
              <button
                type="button"
                @click="verArchivo(1)"
                :disabled="cargandoArchivo === 1"
                class="px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/70 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                title="Visualizar formato de registro"
              >
                <Loader2 v-if="cargandoArchivo === 1" class="w-3.5 h-3.5 animate-spin text-purple-600" />
                <Eye v-else class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Ver archivo</span>
              </button>
            </div>
          </div>

          <!-- Archivo 2: Formato de asistencia -->
          <div class="p-4 bg-white dark:bg-iecm-dark-header border border-slate-200/80 dark:border-white/10 rounded-xl space-y-3 shadow-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText class="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>2. Formato de asistencia a acción educativa *</span>
              </span>
              <span v-if="archivosExistentes.archivo2 || archivo2" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <CheckCircle class="w-3.5 h-3.5" /> {{ archivo2 ? 'Por guardar' : 'Cargado' }}
              </span>
              <span v-else class="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                PDF (10MB)
              </span>
            </div>

            <input 
              type="file" 
              accept=".pdf" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo2', 10)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-iecm-morado hover:file:bg-purple-200 cursor-pointer disabled:opacity-50 transition-all"
            />

            <!-- Barra de estado y botón Ver Archivo -->
            <div v-if="archivo2 || archivosExistentes.archivo2" class="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/40 p-2 rounded-lg">
              <div class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 truncate font-mono">
                <CheckCircle class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span class="truncate font-medium" :title="archivo2 ? archivo2.name : archivosExistentes.archivo2">
                  {{ archivo2 ? archivo2.name : archivosExistentes.archivo2 }}
                </span>
              </div>
              <button
                type="button"
                @click="verArchivo(2)"
                :disabled="cargandoArchivo === 2"
                class="px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/70 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                title="Visualizar formato de asistencia"
              >
                <Loader2 v-if="cargandoArchivo === 2" class="w-3.5 h-3.5 animate-spin text-purple-600" />
                <Eye v-else class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Ver archivo</span>
              </button>
            </div>
          </div>

          <!-- Archivo 3: Evidencia fotográfica -->
          <div class="p-4 bg-white dark:bg-iecm-dark-header border border-slate-200/80 dark:border-white/10 rounded-xl space-y-3 shadow-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Image class="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>3. Evidencia fotográfica (.png o .jpg) *</span>
              </span>
              <span v-if="archivosExistentes.archivo3 || archivo3" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <CheckCircle class="w-3.5 h-3.5" /> {{ archivo3 ? 'Por guardar' : 'Cargada' }}
              </span>
              <span v-else class="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                JPG/PNG (10MB)
              </span>
            </div>

            <input 
              type="file" 
              accept=".jpg,.jpeg,.png" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo3', 10)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-iecm-morado hover:file:bg-purple-200 cursor-pointer disabled:opacity-50 transition-all"
            />

            <!-- Barra de estado y botón Ver Imagen -->
            <div v-if="archivo3 || archivosExistentes.archivo3" class="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/40 p-2 rounded-lg">
              <div class="flex items-center gap-2 min-w-0">
                <div v-if="archivo3Thumbnail" class="w-7 h-7 rounded-md overflow-hidden border border-purple-200 shrink-0 bg-slate-200 cursor-pointer" @click="verArchivo(3)" title="Click para ver">
                  <img :src="archivo3Thumbnail" class="w-full h-full object-cover" />
                </div>
                <CheckCircle v-else class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span class="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 truncate" :title="archivo3 ? archivo3.name : archivosExistentes.archivo3">
                  {{ archivo3 ? archivo3.name : archivosExistentes.archivo3 }}
                </span>
              </div>
              <button
                type="button"
                @click="verArchivo(3)"
                :disabled="cargandoArchivo === 3"
                class="px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/70 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                title="Visualizar fotografía"
              >
                <Loader2 v-if="cargandoArchivo === 3" class="w-3.5 h-3.5 animate-spin text-purple-600" />
                <Eye v-else class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Ver imagen</span>
              </button>
            </div>
          </div>

          <!-- Archivo 4: Encuesta de satisfacción consolidada (Estilo Verde Institucional) -->
          <div class="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/20 border-2 border-dashed border-emerald-500/50 rounded-xl space-y-3 shadow-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <FileCheck2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>4. Encuestas de satisfacción consolidadas</span>
              </span>
              <span v-if="archivosExistentes.archivo4 || archivo4" class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 border border-emerald-300 dark:border-emerald-700">
                <CheckCircle class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {{ archivo4 ? 'Por guardar' : 'Consolidado Listo' }}
              </span>
              <span v-else class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 border border-emerald-300/60 dark:border-emerald-700/60 px-2 py-0.5 rounded-full shrink-0">
                PDF (20MB)
              </span>
            </div>

            <input 
              type="file" 
              accept=".pdf" 
              :disabled="readOnlyComputed" 
              @change="e => onFileSelected(e, 'archivo4', 20)" 
              class="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer disabled:opacity-50 transition-all"
            />

            <!-- Barra de estado y botón Ver Archivo 4 -->
            <div v-if="archivo4 || archivosExistentes.archivo4" class="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg">
              <div class="flex items-center gap-1.5 text-xs text-emerald-900 dark:text-emerald-200 truncate font-mono">
                <CheckCircle class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span class="truncate font-medium" :title="archivo4 ? archivo4.name : archivosExistentes.archivo4">
                  {{ archivo4 ? archivo4.name : archivosExistentes.archivo4 }}
                </span>
              </div>
              <button
                type="button"
                @click="verArchivo(4)"
                :disabled="cargandoArchivo === 4"
                class="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                title="Visualizar consolidado de encuestas"
              >
                <Loader2 v-if="cargandoArchivo === 4" class="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <Eye v-else class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ver consolidado</span>
              </button>
            </div>

            <p class="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 leading-tight">
              Al adjuntar este formato se habilitará el botón para <strong>Finalizar la Acción</strong> y cerrar el expediente de forma definitiva.
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
          class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
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
            class="bg-[#6B2D8B] hover:bg-[#582472] text-white font-bold shadow-md shadow-purple-900/10 px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
            @click="guardarInformacion"
          >
            <template #icon v-if="!saving"><Save class="w-4 h-4" /></template>
            Guardar Información
          </AppButton>

          <!-- Si YA se seleccionó el Archivo 4: El botón se transforma en FINALIZAR ACCIÓN -->
          <AppButton
            v-else-if="!readOnlyComputed && (archivo4 || archivosExistentes.archivo4)"
            variant="success"
            size="md"
            :loading="finalizando"
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
            @click="finalizarAccion"
          >
            <template #icon v-if="!finalizando"><ShieldCheck class="w-4 h-4" /></template>
            Finalizar Acción
          </AppButton>
        </div>
      </div>
    </template>
  </AppModal>

  <!-- MODAL VISUALIZADOR DE ARCHIVO / VISTA PREVIA INSTITUCIONAL -->
  <AppModal
    :open="mostrarVisor"
    size="5xl"
    z-index="z-[60]"
    @close="cerrarVisor"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2.5 bg-purple-100 dark:bg-purple-950/70 text-[#6B2D8B] dark:text-purple-300 rounded-xl shrink-0 border border-purple-200/60 dark:border-purple-800/40">
            <FileText v-if="visorData?.tipo === 'pdf'" class="w-5 h-5" />
            <Image v-else class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-base font-extrabold text-slate-900 dark:text-white truncate max-w-lg">
                {{ visorData?.titulo || 'Visualizador de Documento' }}
              </h4>
              <span class="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-purple-50 dark:bg-purple-950/40 text-[#6B2D8B] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40">
                {{ visorData?.tipo === 'pdf' ? 'Formato PDF' : 'Imagen' }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">
              {{ visorData?.nombre }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 pr-6">
          <button
            type="button"
            @click="abrirEnPestanaNueva"
            class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Abrir en pestaña nueva del navegador"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Pestaña nueva</span>
          </button>
        </div>
      </div>
    </template>

    <div class="w-full flex flex-col items-center justify-center min-h-[55vh] max-h-[75vh]">
      <!-- Visualizador PDF nativo integrado -->
      <iframe
        v-if="visorData?.tipo === 'pdf' && visorData?.url"
        :src="visorData.url"
        class="w-full h-[68vh] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 shadow-inner"
      ></iframe>

      <!-- Visualizador Imagen -->
      <div
        v-else-if="visorData?.tipo === 'imagen' && visorData?.url"
        class="w-full h-[68vh] flex items-center justify-center p-4 bg-slate-950/20 dark:bg-slate-950/50 rounded-xl overflow-auto border border-slate-200 dark:border-white/10"
      >
        <img
          :src="visorData.url"
          :alt="visorData.nombre"
          class="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform"
        />
      </div>

      <!-- Fallback -->
      <div v-else class="text-center py-12 text-slate-400">
        <AlertCircle class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
        <p class="text-sm font-semibold">No se pudo cargar la vista previa del documento.</p>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 truncate max-w-md">
          <CheckCircle class="w-4 h-4 text-emerald-500 shrink-0" />
          <span class="text-xs text-slate-600 dark:text-slate-400 font-mono truncate">
            {{ visorData?.nombre }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="descargarArchivoVisor"
            class="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            title="Descargar copia del archivo"
          >
            <Download class="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Descargar</span>
          </button>
          <button
            type="button"
            @click="abrirEnPestanaNueva"
            class="px-3.5 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            <span>Pantalla completa</span>
          </button>
          <button
            type="button"
            @click="cerrarVisor"
            class="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </template>
  </AppModal>
</template>
