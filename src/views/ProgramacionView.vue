<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'
import Swal from 'sweetalert2'
import gsap from 'gsap'
import {
  CalendarPlus, Save, Users, Building2, MapPin, Contact, Clock,
  AlertCircle, CalendarDays, CheckCircle2, Tag, Sparkles, RotateCcw,
  Check, ShieldCheck, MapPinned, UserCheck, CalendarCheck, FileCheck,
  CheckCircle, ArrowRight, BookOpen, Handshake, School, Building,
  Navigation, Phone, BadgeCheck, ChevronRight
} from '@lucide/vue'
import api from '../services/api.js'
import { useToast } from '../composables/useToast.js'
import { useDateRestrictions } from '../composables/useDateRestrictions.js'
import { useAuthStore } from '../stores/authStore.js'

import AppInput from '../components/ui/AppInput.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import AppButton from '../components/ui/AppButton.vue'

const authStore = useAuthStore()
const toast = useToast()

const vistaRef = ref(null)
const loadingCatalogos = ref(false)
const saving = ref(false)

// Catálogos cargados directamente desde la base de datos operativa sisec_2027_dev
const catalogos = reactive({
  acciones: [],
  vertientes: [],
  demarcaciones: [],
  tiposInstitucion: []
})

// Control dinámico de Grupo o Población Atendida
const hasGrupoPoblacion = ref(false)

const {
  configs,
  loading: loadingConfig,
  loadRestrictions,
  isDateEnabled,
  isPastMonth,
  isGlobalDisabled,
  activeDistrictException,
  currentMonthName,
  currentYear,
  alertPastMonthBlocked
} = useDateRestrictions()

// Formulario 2027 (Estructura Unificada)
const form = reactive({
  // Sección 1: Acción Educativa
  con_convenio: false,
  id_accion: '',
  vertiente_nombre: '',
  vertiente_color: '',
  id_vertiente: '',

  // Sección 2: Ubicación y datos de contacto
  id_tipo_institucion: '',
  nombre_institucion: '',

  // Sección 3: Domicilio de la institución o espacio visitado
  calle_numero: '',
  colonia: '',
  id_demarcacion: '',
  cp: '',
  grupo_poblacion_atendida: '',
  nombre_contacto: '',
  telefono_contacto: '',
  num_personas_atender: '',

  // Sección 4: Fecha y personal
  fecha_programada: '',
  hora_programada: '',
  nombre_cargo_persona_atendera: ''
})

// Indicadores de Completitud
const isSeccion1Completa = computed(() => !!form.id_accion)
const isSeccion2Completa = computed(() => !!form.id_tipo_institucion && !!form.nombre_institucion?.trim())
const isSeccion3Completa = computed(() => {
  const cpVal = String(form.cp || '').trim()
  const aforoVal = Number(form.num_personas_atender)
  const grupoVal = !hasGrupoPoblacion.value || !!form.grupo_poblacion_atendida?.trim()
  return (
    !!form.calle_numero?.trim() &&
    !!form.colonia?.trim() &&
    !!form.id_demarcacion &&
    cpVal.length === 5 &&
    grupoVal &&
    !!form.nombre_contacto?.trim() &&
    !!form.telefono_contacto?.trim() &&
    !isNaN(aforoVal) && aforoVal > 0 && aforoVal <= 999
  )
})
const isSeccion4Completa = computed(() => {
  return !!form.fecha_programada && !!form.hora_programada && !!form.nombre_cargo_persona_atendera?.trim()
})

const seccionesCompletadas = computed(() => {
  return [isSeccion1Completa.value, isSeccion2Completa.value, isSeccion3Completa.value, isSeccion4Completa.value].filter(Boolean).length
})

const porcentajeProgreso = computed(() => {
  return Math.round((seccionesCompletadas.value / 4) * 100)
})

// Fecha legible formateada para el resumen en vivo
const fechaLegible = computed(() => {
  if (!form.fecha_programada) return 'Pendiente'
  try {
    const parts = form.fecha_programada.split('-')
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    }
    return form.fecha_programada
  } catch {
    return form.fecha_programada
  }
})

// Auto-completar vertiente al seleccionar acción
watch(() => form.id_accion, (newId) => {
  if (!newId) {
    form.vertiente_nombre = ''
    form.vertiente_color = ''
    form.id_vertiente = ''
    return
  }
  const found = catalogos.acciones.find(a => String(a.id_accion) === String(newId))
  if (found) {
    form.vertiente_nombre = found.vertiente || 'No especificada'
    form.id_vertiente = found.id_vertiente || 5
    const vertCatalog = catalogos.vertientes.find(v => Number(v.id_vertiente) === Number(found.id_vertiente))
    form.vertiente_color = found.color_vertiente || vertCatalog?.color || '#8B5CF6'
  }
})

// Si se desmarca el checkbox de grupo/población, limpiamos el campo
watch(hasGrupoPoblacion, (val) => {
  if (!val) {
    form.grupo_poblacion_atendida = ''
  }
})

const accionSeleccionadaObj = computed(() => {
  if (!form.id_accion) return null
  return catalogos.acciones.find(a => String(a.id_accion) === String(form.id_accion)) || null
})

const demarcacionSeleccionadaObj = computed(() => {
  if (!form.id_demarcacion) return null
  return catalogos.demarcaciones.find(d => String(d.id_demarcacion) === String(form.id_demarcacion)) || null
})

const tipoInstitucionSeleccionadaObj = computed(() => {
  if (!form.id_tipo_institucion) return null
  return catalogos.tiposInstitucion.find(t => String(t.id_tipo_institucion) === String(form.id_tipo_institucion)) || null
})

const resetForm = () => {
  form.con_convenio = false
  form.id_accion = ''
  form.vertiente_nombre = ''
  form.vertiente_color = ''
  form.id_vertiente = ''
  form.id_tipo_institucion = ''
  form.nombre_institucion = ''
  form.calle_numero = ''
  form.colonia = ''
  form.id_demarcacion = ''
  form.cp = ''
  hasGrupoPoblacion.value = false
  form.grupo_poblacion_atendida = ''
  form.nombre_contacto = ''
  form.telefono_contacto = ''
  form.num_personas_atender = ''
  form.fecha_programada = ''
  form.hora_programada = ''
  form.nombre_cargo_persona_atendera = ''
  toast.info('Formulario reiniciado.')
}

const loadCatalogos = async () => {
  loadingCatalogos.value = true
  try {
    const { data } = await api.get('/programacion-2027/catalogos')
    const payload = data?.data ?? {}
    const rawAcciones = payload.acciones ?? []

    catalogos.acciones = rawAcciones.slice().sort((a, b) => {
      const numA = parseInt(String(a.clave_accion || '').replace(/\D/g, ''), 10) || Number(a.id_accion) || 0
      const numB = parseInt(String(b.clave_accion || '').replace(/\D/g, ''), 10) || Number(b.id_accion) || 0
      return numA - numB
    })

    catalogos.vertientes = payload.vertientes ?? []
    catalogos.demarcaciones = payload.demarcaciones ?? []
    catalogos.tiposInstitucion = payload.tiposInstitucion ?? []
  } catch (error) {
    console.error('Error al cargar catálogos desde sisec_2027_dev:', error)
    toast.error('Error al consultar catálogos en la base de datos sisec_2027_dev.')
  } finally {
    loadingCatalogos.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN ESTRICTA AL 100%
// ─────────────────────────────────────────────────────────────────────────────
const validarFormulario = () => {
  if (!form.id_accion) {
    toast.warning('Por favor selecciona la Acción Educativa.')
    return false
  }
  if (!form.id_tipo_institucion) {
    toast.warning('Por favor selecciona el Tipo de institución o espacio visitado.')
    return false
  }
  if (!form.nombre_institucion?.trim()) {
    toast.warning('Por favor ingresa el Nombre de la institución o espacio visitado.')
    return false
  }
  if (!form.calle_numero?.trim()) {
    toast.warning('Por favor ingresa la Calle y número del domicilio.')
    return false
  }
  if (!form.colonia?.trim()) {
    toast.warning('Por favor ingresa la Colonia del domicilio.')
    return false
  }
  if (!form.id_demarcacion) {
    toast.warning('Por favor selecciona la Demarcación territorial (Alcaldía).')
    return false
  }
  const cleanCp = String(form.cp || '').trim()
  if (!cleanCp || cleanCp.length !== 5 || isNaN(Number(cleanCp))) {
    toast.warning('El Código Postal es obligatorio y debe tener exactamente 5 dígitos.')
    return false
  }
  if (hasGrupoPoblacion.value && !form.grupo_poblacion_atendida?.trim()) {
    toast.warning('Has marcado "Agregar grupo o población", por favor escribe su descripción.')
    return false
  }
  if (!form.nombre_contacto?.trim()) {
    toast.warning('Por favor ingresa el Nombre del contacto enlace.')
    return false
  }
  if (!form.telefono_contacto?.trim()) {
    toast.warning('Por favor ingresa el Teléfono de contacto.')
    return false
  }
  const aforo = Number(form.num_personas_atender)
  if (!form.num_personas_atender || isNaN(aforo) || aforo <= 0 || aforo > 999) {
    toast.warning('El Número de personas a atender debe ser de 1 a 3 dígitos (1 - 999).')
    return false
  }
  if (!form.fecha_programada) {
    toast.warning('Por favor ingresa la Fecha programada de la actividad.')
    return false
  }
  if (!form.hora_programada) {
    toast.warning('Por favor ingresa la Hora programada (HH:MM).')
    return false
  }
  if (!form.nombre_cargo_persona_atendera?.trim()) {
    toast.warning('Por favor ingresa el Nombre y cargo del personal que atenderá.')
    return false
  }
  return true
}

const onSubmit = async () => {
  if (!validarFormulario()) return

  if (!isDateEnabled(form.fecha_programada, 'programacion')) {
    if (isGlobalDisabled.value) {
      Swal.fire({
        icon: 'warning',
        title: 'Sistema Cerrado',
        text: 'El periodo de captura y programación se encuentra inhabilitado globalmente.',
        confirmButtonColor: '#6B2D8B',
        customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl' }
      })
      return
    }
    await alertPastMonthBlocked(form.fecha_programada, 'programacion')
    return
  }

  saving.value = true
  try {
    const payload = {
      con_convenio: !!form.con_convenio,
      id_accion: Number(form.id_accion),
      id_vertiente: Number(form.id_vertiente || 5),
      id_tipo_institucion: Number(form.id_tipo_institucion),
      nombre_institucion: form.nombre_institucion.trim(),
      calle_numero: form.calle_numero.trim(),
      colonia: form.colonia.trim(),
      id_demarcacion: Number(form.id_demarcacion),
      cp: String(form.cp).trim(),
      grupo_poblacion_atendida: hasGrupoPoblacion.value ? form.grupo_poblacion_atendida.trim() : null,
      nombre_contacto: form.nombre_contacto.trim(),
      telefono_contacto: form.telefono_contacto.trim(),
      num_personas_atender: Number(form.num_personas_atender),
      fecha_programada: form.fecha_programada,
      hora_programada: form.hora_programada,
      nombre_cargo_persona_atendera: form.nombre_cargo_persona_atendera.trim()
    }

    await api.post('/programacion-2027', payload)
    
    await Swal.fire({
      icon: 'success',
      title: '¡Programación Guardada!',
      text: 'La acción educativa fue programada correctamente en el calendario institucional.',
      confirmButtonColor: '#6B2D8B',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold px-6 py-2.5' }
    })
    resetForm()
  } catch (error) {
    const msg = error?.response?.data?.message || 'Ocurrió un error al guardar la programación.'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCatalogos()
  loadRestrictions()
})
</script>

<template>
  <div ref="vistaRef" class="w-full space-y-6 pb-16">
    
    <!-- =================================================================== -->
    <!-- ENCABEZADO ESTILO GITHUB (Tipografía limpia, breadcrumb, divisores) -->
    <!-- =================================================================== -->
    <header class="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
      
      <!-- Breadcrumb sutil estilo GitHub -->
      <nav class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>Educación Cívica</span>
        <ChevronRight class="w-3 h-3 text-slate-400" />
        <span>SISEC Institucional</span>
        <ChevronRight class="w-3 h-3 text-slate-400" />
        <span class="font-semibold text-slate-800 dark:text-slate-200">Programación 2027</span>
      </nav>

      <!-- Título principal y badges de estado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarPlus class="w-6 h-6 text-[#6B2D8B] dark:text-purple-400 shrink-0" />
            Programación de Acción Educativa
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Planifica y registra los compromisos de educación cívica en el calendario institucional.
          </p>
        </div>

        <!-- Badges y Widget de Progreso estilo GitHub Primer -->
        <div class="flex items-center gap-3 flex-wrap self-start md:self-auto">
          <span
            v-if="authStore.isAdmin || authStore.isSuperAdmin || Number(authStore.user?.idsede) === 0 || authStore.user?.usuario === 'admin'"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-2xs"
          >
            Sede Central / Admin
          </span>
          <span
            v-else-if="authStore.user?.idsede"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs"
          >
            Distrito {{ authStore.user.idsede }}
          </span>

          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-[#6B2D8B] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/70">
            <span class="w-2 h-2 rounded-full bg-[#6B2D8B] animate-pulse"></span>
            Modelo 2027
          </span>

          <div class="flex items-center gap-3 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            <span class="text-slate-600 dark:text-slate-400 font-medium">Progreso</span>
            <div class="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
              <div 
                class="h-full bg-gradient-to-r from-[#8A38B2] to-[#6B2D8B] transition-all duration-300 rounded-full"
                :style="{ width: `${porcentajeProgreso}%` }"
              ></div>
            </div>
            <span class="font-mono font-semibold text-[#6B2D8B] dark:text-purple-300">{{ porcentajeProgreso }}%</span>
          </div>
        </div>
      </div>

    </header>

    <!-- NOTIFICACIÓN DE PERIODO OPERATIVO (GitHub Flash Banner) -->
    <div v-if="!loadingConfig" class="w-full">
      <div v-if="isGlobalDisabled" class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-4 py-2.5 rounded-lg flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
        <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
        <span><strong>Sistema Cerrado:</strong> El periodo de programación se encuentra inhabilitado globalmente en este momento.</span>
      </div>

      <div v-else-if="activeDistrictException" class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 px-4 py-2.5 rounded-lg flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
        <Clock class="w-4 h-4 text-amber-600 shrink-0" />
        <span><strong>Habilitación Especial:</strong> Tu distrito cuenta con periodo autorizado del <strong>{{ activeDistrictException.fecha_inicio }}</strong> al <strong>{{ activeDistrictException.fecha_fin }}</strong>.</span>
      </div>

      <div v-else class="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 px-4 py-2.5 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-2">
          <CalendarCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span class="text-slate-700 dark:text-slate-300">
            Periodo operativo activo: Programando compromisos para el mes de <strong class="text-emerald-900 dark:text-emerald-200 uppercase font-semibold">{{ currentMonthName }} {{ currentYear }}</strong>.
          </span>
        </div>
        <div class="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5 text-emerald-600" />
          <span>Restricciones institucionales validadas</span>
        </div>
      </div>
    </div>

    <!-- =============================================================== -->
    <!-- FORMULARIO UNIFICADO ESTILO GITHUB (Box con flujo continuo)   -->
    <!-- =============================================================== -->
    <form @submit.prevent="onSubmit" class="w-full">
      
      <!-- Contenedor Box GitHub Primer -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

        <!-- Barra Superior del Box (Box-Header) -->
        <div class="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CalendarPlus class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Formulario de Programación
            </span>
          </div>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            Los campos marcados con <span class="text-red-500 font-semibold">*</span> son requeridos
          </span>
        </div>

        <!-- Cuerpo del Formulario: Espaciado continuo con divisores limpios -->
        <div class="p-6 sm:p-8 space-y-8">

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- 1. ACCIÓN EDUCATIVA -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <BookOpen class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
                <h2 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Acción Educativa
                </h2>
              </div>
              <span 
                class="px-2.5 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1"
                :class="isSeccion1Completa ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
              >
                <CheckCircle2 v-if="isSeccion1Completa" class="w-3 h-3 text-emerald-600" />
                <span>{{ isSeccion1Completa ? 'Completado' : 'Requerido' }}</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Selecciona la actividad cívica del catálogo institucional y su vertiente formal vinculada.
            </p>

            <!-- Convenio Interinstitucional estilo GitHub Option Row -->
            <label 
              class="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/30 hover:border-purple-300 hover:bg-purple-50/20 cursor-pointer transition-all select-none"
              :class="form.con_convenio ? 'border-purple-300 bg-purple-50/40 dark:bg-purple-950/30' : ''"
            >
              <input 
                v-model="form.con_convenio" 
                type="checkbox" 
                class="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#6B2D8B] focus:ring-purple-500 cursor-pointer" 
              />
              <div>
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Handshake class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
                  Convenio Interinstitucional Vigente
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                  Marca esta casilla si la acción educativa deriva formalmente de un convenio delegacional vigente.
                </span>
              </div>
            </label>

            <!-- Select Acción Educativa + Vertiente en Grid 3 cols -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">
              <div class="lg:col-span-2">
                <AppSelect v-model="form.id_accion" label="Nombre de la acción educativa" required>
                  <template #icon><BookOpen class="w-4 h-4 text-purple-600 dark:text-purple-400" /></template>
                  <option value="" disabled>{{ loadingCatalogos ? 'Cargando acciones...' : 'Selecciona una acción educativa del catálogo' }}</option>
                  <option v-for="accion in catalogos.acciones" :key="accion.id_accion" :value="accion.id_accion">
                    {{ accion.clave_accion }} — {{ accion.nombre_accion }}
                  </option>
                </AppSelect>
              </div>

              <div class="lg:col-span-1">
                <label class="label-iecm flex items-center justify-between">
                  <span>Vertiente Institucional</span>
                  <span 
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none transition-all duration-150 border"
                    :style="form.vertiente_nombre && form.vertiente_color ? {
                      backgroundColor: `${form.vertiente_color}18`,
                      borderColor: `${form.vertiente_color}50`,
                      color: form.vertiente_color
                    } : {}"
                    :class="form.vertiente_nombre ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                  >
                    Auto
                  </span>
                </label>
                <div class="relative">
                  <div 
                    class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors"
                    :style="form.vertiente_nombre && form.vertiente_color ? { color: form.vertiente_color } : {}"
                    :class="!form.vertiente_nombre ? 'text-slate-400 dark:text-slate-500' : ''"
                  >
                    <Tag class="w-4 h-4" />
                  </div>
                  <div 
                    class="input-iecm pl-10 flex items-center font-medium truncate cursor-not-allowed select-none text-sm transition-all"
                    :style="form.vertiente_nombre && form.vertiente_color ? {
                      backgroundColor: `${form.vertiente_color}12`,
                      borderColor: `${form.vertiente_color}45`,
                      color: form.vertiente_color
                    } : {}"
                    :class="!form.vertiente_nombre ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500 border-slate-200 dark:border-slate-700' : ''"
                  >
                    <span
                      v-if="form.vertiente_nombre && form.vertiente_color"
                      class="w-2 h-2 rounded-full mr-2 shrink-0"
                      :style="{ backgroundColor: form.vertiente_color }"
                    ></span>
                    {{ form.vertiente_nombre || 'Se auto-completa al elegir la acción' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800"></div>

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- 2. UBICACIÓN Y SEDE -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <Building2 class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Ubicación y Sede
                </h2>
              </div>
              <span 
                class="px-2.5 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1"
                :class="isSeccion2Completa ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
              >
                <CheckCircle2 v-if="isSeccion2Completa" class="w-3 h-3 text-emerald-600" />
                <span>{{ isSeccion2Completa ? 'Completado' : 'Requerido' }}</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Tipo de espacio e institución o recinto donde se llevará a cabo la actividad educativa.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <div>
                <AppSelect v-model="form.id_tipo_institucion" label="Tipo de institución o espacio visitado" required>
                  <template #icon><Building class="w-4 h-4 text-blue-600 dark:text-blue-400" /></template>
                  <option value="" disabled>Selecciona el tipo de espacio</option>
                  <option v-for="tipo in catalogos.tiposInstitucion" :key="tipo.id_tipo_institucion" :value="tipo.id_tipo_institucion">
                    {{ tipo.descripcion }}
                  </option>
                </AppSelect>
              </div>

              <div>
                <AppInput 
                  v-model="form.nombre_institucion" 
                  label="Nombre de la institución o espacio" 
                  required 
                  placeholder="Ej. Escuela Primaria Benito Juárez" 
                >
                  <template #icon><School class="w-4 h-4 text-blue-600 dark:text-blue-400" /></template>
                </AppInput>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800"></div>

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- 3. DOMICILIO TERRITORIAL -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <MapPin class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Domicilio Territorial
                </h2>
              </div>
              <span 
                class="px-2.5 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1"
                :class="isSeccion3Completa ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
              >
                <CheckCircle2 v-if="isSeccion3Completa" class="w-3 h-3 text-emerald-600" />
                <span>{{ isSeccion3Completa ? 'Completado' : 'Requerido' }}</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Dirección física exacta y demarcación territorial de la Ciudad de México donde se realizará la intervención.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
              <div class="col-span-1 md:col-span-2">
                <AppInput v-model="form.calle_numero" label="Calle y número" required placeholder="Ej. Av. Insurgentes Sur 123">
                  <template #icon><MapPin class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></template>
                </AppInput>
              </div>

              <div class="col-span-1">
                <AppInput v-model="form.colonia" label="Colonia" required placeholder="Ej. Del Valle" />
              </div>

              <div class="col-span-1 md:col-span-2">
                <AppSelect v-model="form.id_demarcacion" label="Demarcación territorial (Alcaldía)" required>
                  <template #icon><Navigation class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></template>
                  <option value="" disabled>Selecciona la alcaldía</option>
                  <option v-for="dem in catalogos.demarcaciones" :key="dem.id_demarcacion" :value="dem.id_demarcacion">
                    {{ dem.demarcacion }}
                  </option>
                </AppSelect>
              </div>

              <div class="col-span-1">
                <AppInput v-model="form.cp" label="Código Postal (5 dígitos)" maxlength="5" required placeholder="03100" />
              </div>
            </div>

            <!-- Población o Grupo Específico estilo GitHub Option -->
            <div class="pt-2">
              <label 
                class="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/30 hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer transition-all select-none"
                :class="hasGrupoPoblacion ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/30' : ''"
              >
                <input 
                  v-model="hasGrupoPoblacion" 
                  type="checkbox" 
                  class="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                />
                <div>
                  <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Users class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Atención a Grupo o Población en Situación de Vulnerabilidad
                  </span>
                  <span class="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                    Habilita esta opción si la actividad está focalizada en un grupo con características particulares (estudiantes, personas con discapacidad, adultas mayores, etc.).
                  </span>
                </div>
              </label>

              <transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div v-if="hasGrupoPoblacion" class="mt-3">
                  <AppInput
                    v-model="form.grupo_poblacion_atendida"
                    label="Descripción de la población o grupo atendido"
                    required
                    placeholder="Ej. Estudiantes de secundaria, personas con discapacidad, etc."
                  >
                    <template #icon><Users class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></template>
                  </AppInput>
                </div>
              </transition>
            </div>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800"></div>

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- 4. CONTACTO DE ENLACE Y AFORO -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Users class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                Contacto de Enlace y Aforo
              </h2>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Datos de contacto del personal receptor en la institución y cantidad estimada de personas a atender.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              <div>
                <AppInput v-model="form.nombre_contacto" label="Nombre de contacto enlace" required placeholder="Nombre completo">
                  <template #icon><UserCheck class="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></template>
                </AppInput>
              </div>

              <div>
                <AppInput v-model="form.telefono_contacto" label="Teléfono de contacto enlace" required placeholder="10 dígitos numéricos">
                  <template #icon><Phone class="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></template>
                </AppInput>
              </div>

              <div>
                <AppInput 
                  v-model="form.num_personas_atender" 
                  type="number" 
                  min="1" 
                  max="999" 
                  label="Personas a atender (Aforo 1-999)" 
                  required 
                  placeholder="Ej. 45" 
                >
                  <template #icon><Users class="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></template>
                </AppInput>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800"></div>

          <!-- ───────────────────────────────────────────────────────────── -->
          <!-- 5. FECHA, HORARIO Y PERSONAL COMISIONADO -->
          <!-- ───────────────────────────────────────────────────────────── -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <Calendar class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Fecha, Horario y Personal Comisionado
                </h2>
              </div>
              <span 
                class="px-2.5 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1"
                :class="isSeccion4Completa ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
              >
                <CheckCircle2 v-if="isSeccion4Completa" class="w-3 h-3 text-emerald-600" />
                <span>{{ isSeccion4Completa ? 'Completado' : 'Requerido' }}</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Día de ejecución, horario de inicio y servidor(a) público(a) del IECM comisionado(a) para la actividad.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <div>
                <AppInput 
                  v-model="form.fecha_programada" 
                  type="date" 
                  label="Fecha programada" 
                  required 
                >
                  <template #icon><Calendar class="w-4 h-4 text-amber-600 dark:text-amber-400" /></template>
                </AppInput>
              </div>

              <div>
                <AppInput 
                  v-model="form.hora_programada" 
                  type="time" 
                  label="Hora programada (HH:MM)" 
                  required 
                >
                  <template #icon><Clock class="w-4 h-4 text-amber-600 dark:text-amber-400" /></template>
                </AppInput>
              </div>

              <div class="col-span-full">
                <AppInput
                  v-model="form.nombre_cargo_persona_atendera"
                  label="Nombre y cargo del personal que atenderá el compromiso"
                  required
                  placeholder="Ej. Lic. Ana Morales - Coordinadora Distrital de Participación"
                >
                  <template #icon><BadgeCheck class="w-4 h-4 text-amber-600 dark:text-amber-400" /></template>
                </AppInput>
              </div>
            </div>
          </div>

        </div>

        <!-- =============================================================== -->
        <!-- RESUMEN EJECUTIVO Y FOOTER DE ACCIONES ESTILO GITHUB            -->
        <!-- =============================================================== -->
        <div class="p-6 sm:p-8 bg-slate-50/80 dark:bg-slate-950/50 space-y-6 border-t border-slate-200 dark:border-slate-800">
          
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <CalendarCheck class="w-4 h-4 text-[#6B2D8B] dark:text-purple-400" />
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Resumen de la Programación
              </h3>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="form.con_convenio" class="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                Con Convenio
              </span>
              <span 
                v-if="accionSeleccionadaObj" 
                class="px-2.5 py-0.5 rounded-md text-xs font-semibold text-white shadow-sm"
                :style="{ backgroundColor: accionSeleccionadaObj.color || '#6B2D8B' }"
              >
                {{ accionSeleccionadaObj.clave_accion }}
              </span>
            </div>
          </div>

          <!-- 4 Cajas compactas de resumen estilo GitHub Primer -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div class="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Acción Educativa</span>
              <p class="font-semibold text-slate-900 dark:text-slate-100 truncate" :title="accionSeleccionadaObj?.nombre_accion">
                {{ accionSeleccionadaObj?.nombre_accion || 'Sin seleccionar' }}
              </p>
              <p 
                class="text-[11px] font-semibold truncate flex items-center gap-1.5"
                :style="form.vertiente_color ? { color: form.vertiente_color } : {}"
                :class="!form.vertiente_color ? 'text-purple-600 dark:text-purple-400' : ''"
              >
                <span v-if="form.vertiente_color" class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: form.vertiente_color }"></span>
                {{ form.vertiente_nombre || 'Vertiente pendiente' }}
              </p>
            </div>

            <div class="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Sede / Espacio</span>
              <p class="font-semibold text-slate-900 dark:text-slate-100 truncate" :title="form.nombre_institucion">
                {{ form.nombre_institucion || 'Pendiente' }}
              </p>
              <p class="text-[11px] text-slate-500 truncate">
                {{ demarcacionSeleccionadaObj?.demarcacion || 'Demarcación pendiente' }}
              </p>
            </div>

            <div class="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Fecha y Horario</span>
              <p class="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {{ fechaLegible }}
              </p>
              <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {{ form.hora_programada ? `${form.hora_programada} hrs` : 'Horario pendiente' }}
              </p>
            </div>

            <div class="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Atención y Aforo</span>
              <p class="font-semibold text-slate-900 dark:text-slate-100 truncate" :title="form.nombre_cargo_persona_atendera">
                {{ form.nombre_cargo_persona_atendera || 'Personal pendiente' }}
              </p>
              <p class="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                {{ form.num_personas_atender ? `${form.num_personas_atender} personas estimadas` : 'Aforo pendiente' }}
              </p>
            </div>
          </div>

          <!-- Barra de Acciones estilo GitHub Form Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="resetForm"
              class="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm active:scale-95"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              Limpiar Formulario
            </button>

            <AppButton 
              type="submit" 
              variant="primary" 
              size="md" 
              :loading="saving" 
              class="px-6 py-2.5 font-semibold text-sm shadow-sm"
            >
              <template #icon v-if="!saving"><Save class="w-4 h-4" /></template>
              Guardar Programación
            </AppButton>
          </div>

        </div>

      </div>

    </form>
  </div>
</template>
