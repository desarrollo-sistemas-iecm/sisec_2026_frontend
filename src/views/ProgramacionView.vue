<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Swal from 'sweetalert2'
import {
  CalendarPlus, Save, Users, Building2, MapPin, Contact, Clock,
  AlertCircle, CalendarDays, CheckCircle, Tag, Sparkles
} from '@lucide/vue'
import api from '../services/api.js'
import { useToast } from '../composables/useToast.js'
import { useGsapAnimations } from '../composables/useGsapAnimations.js'
import { useDateRestrictions } from '../composables/useDateRestrictions.js'

import AppCard from '../components/ui/AppCard.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import AppButton from '../components/ui/AppButton.vue'

const toast = useToast()
const { animarVista } = useGsapAnimations()

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

// Formulario 2027 (4 Secciones Estrictas)
const form = reactive({
  // Sección 1: Acción Educativa
  con_convenio: false,
  id_accion: '',
  vertiente_nombre: '',
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

// Reacción cuando se selecciona una Acción Educativa:
// Se auto-completa la vertiente y su ID automáticamente desde el catálogo
watch(() => form.id_accion, (newId) => {
  if (!newId) {
    form.vertiente_nombre = ''
    form.id_vertiente = ''
    return
  }
  const found = catalogos.acciones.find(a => String(a.id_accion) === String(newId))
  if (found) {
    form.vertiente_nombre = found.vertiente || 'No especificada'
    form.id_vertiente = found.id_vertiente || 5
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

const resetForm = () => {
  form.con_convenio = false
  form.id_accion = ''
  form.vertiente_nombre = ''
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
// VALIDACIÓN ESTRICTA AL 100% CON TOAST
// ─────────────────────────────────────────────────────────────────────────────
const validarFormulario = () => {
  // Sección 1
  if (!form.id_accion) {
    toast.warning('Por favor selecciona la Acción Educativa (Sección 1).')
    return false
  }

  // Sección 2
  if (!form.id_tipo_institucion) {
    toast.warning('Por favor selecciona el Tipo de institución o espacio visitado (Sección 2).')
    return false
  }
  if (!form.nombre_institucion?.trim()) {
    toast.warning('Por favor ingresa el Nombre de la institución o espacio visitado (Sección 2).')
    return false
  }

  // Sección 3
  if (!form.calle_numero?.trim()) {
    toast.warning('Por favor ingresa la Calle y número del domicilio (Sección 3).')
    return false
  }
  if (!form.colonia?.trim()) {
    toast.warning('Por favor ingresa la Colonia del domicilio (Sección 3).')
    return false
  }
  if (!form.id_demarcacion) {
    toast.warning('Por favor selecciona la Demarcación territorial (Sección 3).')
    return false
  }
  const cleanCp = String(form.cp || '').trim()
  if (!cleanCp || cleanCp.length !== 5 || isNaN(Number(cleanCp))) {
    toast.warning('El Código Postal es obligatorio y debe tener exactamente 5 dígitos numéricos.')
    return false
  }

  // Campo condicional de grupo o población
  if (hasGrupoPoblacion.value && !form.grupo_poblacion_atendida?.trim()) {
    toast.warning('Has marcado "Agregar grupo o población", por favor escribe la descripción de la población atendida.')
    return false
  }

  if (!form.nombre_contacto?.trim()) {
    toast.warning('Por favor ingresa el Nombre del contacto enlace (Sección 3).')
    return false
  }
  if (!form.telefono_contacto?.trim()) {
    toast.warning('Por favor ingresa el Teléfono de contacto (Sección 3).')
    return false
  }
  const aforo = Number(form.num_personas_atender)
  if (!form.num_personas_atender || isNaN(aforo) || aforo <= 0 || aforo > 999) {
    toast.warning('El Número de personas a atender es obligatorio y debe ser de 1 a 3 dígitos (1 - 999).')
    return false
  }

  // Sección 4
  if (!form.fecha_programada) {
    toast.warning('Por favor ingresa la Fecha programada de la actividad (Sección 4).')
    return false
  }
  if (!form.hora_programada) {
    toast.warning('Por favor ingresa la Hora programada (HH:MM) (Sección 4).')
    return false
  }
  if (!form.nombre_cargo_persona_atendera?.trim()) {
    toast.warning('Por favor ingresa el Nombre y cargo de la persona que atenderá el compromiso (Sección 4).')
    return false
  }

  return true
}

const onSubmit = async () => {
  if (!validarFormulario()) return

  // Validación de restricciones de fecha del mes
  if (!isDateEnabled(form.fecha_programada, 'programacion')) {
    if (isGlobalDisabled.value) {
      Swal.fire({
        icon: 'warning',
        title: 'Sistema Cerrado',
        text: 'El periodo de captura y programación se encuentra inhabilitado globalmente en este momento.',
        confirmButtonColor: '#6B2D8B'
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
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg' }
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
  if (vistaRef.value) animarVista(vistaRef.value)
})
</script>

<template>
  <div ref="vistaRef" class="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
    <!-- Encabezado (Header banner) -->
    <div class="rounded-2xl bg-[#403166] dark:bg-[#231A38] px-6 py-6 text-white shadow-iecm-sm flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
      <div class="absolute right-0 top-0 w-64 h-64 bg-white/5 opacity-20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
      
      <div class="flex items-start gap-4 relative z-10">
        <div class="p-3 bg-white/15 rounded-xl border border-white/20 shadow-sm">
          <CalendarPlus class="w-8 h-8 text-white" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold tracking-tight text-white">Programación de Acción Educativa</h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              Modelo 2027
            </span>
          </div>
          <p class="text-purple-200 text-sm mt-1 max-w-xl">
            Registra una nueva acción educativa en el calendario institucional. Completa las 4 secciones obligatorias.
          </p>
        </div>
      </div>
    </div>

    <!-- Alertas de Restricciones de Fecha -->
    <div v-if="!loadingConfig" class="w-full">
      <div v-if="isGlobalDisabled" class="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
        <div class="flex items-center gap-3">
          <AlertCircle class="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <p class="text-sm text-slate-900 dark:text-red-100">
            <strong class="font-bold text-red-900 dark:text-red-300">Sistema cerrado:</strong> El periodo de programación se encuentra inhabilitado globalmente.
          </p>
        </div>
      </div>

      <div v-else-if="activeDistrictException" class="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
        <div class="flex items-center gap-3">
          <Clock class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p class="text-sm text-slate-900 dark:text-amber-100">
            <strong class="font-bold text-amber-900 dark:text-amber-300">Habilitación especial activa:</strong> Tu distrito cuenta con periodo autorizado para programar del <strong class="font-semibold text-slate-900 dark:text-white">{{ activeDistrictException.fecha_inicio }}</strong> al <strong class="font-semibold text-slate-900 dark:text-white">{{ activeDistrictException.fecha_fin }}</strong>.
          </p>
        </div>
      </div>

      <div v-else class="bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm">
        <div class="flex items-center gap-3">
          <CalendarDays class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p class="text-sm text-slate-900 dark:text-emerald-100">
            <strong class="font-bold text-emerald-900 dark:text-emerald-300">Mes vigente habilitado:</strong> Programando para <strong class="font-semibold text-slate-900 dark:text-white">{{ currentMonthName }} {{ currentYear }}</strong>.
          </p>
        </div>
      </div>
    </div>

    <form @submit.prevent="onSubmit" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Zona Principal: Las 4 Secciones Requeridas (col-span-8) -->
      <div class="lg:col-span-8 space-y-6">

        <!-- SECCIÓN 1: ACCIÓN EDUCATIVA -->
        <AppCard>
          <template #header>
            <div class="flex items-center gap-2">
              <Sparkles class="w-5 h-5 text-purple-200 dark:text-iecm-morado-400" />
              <h3 class="font-semibold text-white dark:text-iecm-morado-300">1. Acción Educativa</h3>
            </div>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <!-- Checkbox de Convenio (fila completa) -->
            <div class="col-span-full">
              <label class="flex items-center gap-3 p-4 bg-iecm-gris dark:bg-iecm-dark-header border border-iecm-gris-200 dark:border-iecm-dark-border rounded-xl cursor-pointer hover:border-iecm-morado transition-colors">
                <div class="relative flex items-center justify-center">
                  <input v-model="form.con_convenio" type="checkbox" class="peer sr-only" />
                  <div class="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-iecm-morado peer-checked:bg-iecm-morado transition-all"></div>
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                </div>
                <div>
                  <span class="font-medium text-iecm-texto dark:text-iecm-dark-text block">¿Es con convenio?</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">Marca esta casilla si la acción deriva de un convenio institucional formal.</span>
                </div>
              </label>
            </div>

            <!-- Nombre de la Acción Educativa (Select del nuevo catálogo Clave + Nombre) -->
            <div class="col-span-full">
              <AppSelect v-model="form.id_accion" label="Nombre de la acción educativa" required>
                <option value="" disabled>{{ loadingCatalogos ? 'Cargando acciones...' : 'Selecciona una acción educativa del catálogo' }}</option>
                <option v-for="accion in catalogos.acciones" :key="accion.id_accion" :value="accion.id_accion">
                  {{ accion.clave_accion }} — {{ accion.nombre_accion }}
                </option>
              </AppSelect>
            </div>

            <!-- Vertiente (Input Deshabilitado Autocompletado) -->
            <div class="col-span-full md:col-span-2">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Vertiente Institucional (Auto-completada)
              </label>
              <div class="relative">
                <input
                  type="text"
                  :value="form.vertiente_nombre || 'Se auto-completará al seleccionar la acción educativa'"
                  disabled
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-sm font-medium cursor-not-allowed select-none"
                />
                <div class="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <Tag class="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                La vertiente queda estrictamente vinculada por sistema al ID de la acción educativa.
              </p>
            </div>
          </div>
        </AppCard>

        <!-- SECCIÓN 2: UBICACIÓN Y DATOS DE CONTACTO -->
        <AppCard>
          <template #header>
            <div class="flex items-center gap-2">
              <Building2 class="w-5 h-5 text-purple-200 dark:text-iecm-morado-400" />
              <h3 class="font-semibold text-white dark:text-iecm-morado-300">2. Ubicación y Datos de Contacto</h3>
            </div>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <!-- Tipo de Institución / Espacio Visitado (Select Catálogo) -->
            <div class="col-span-1">
              <AppSelect v-model="form.id_tipo_institucion" label="Tipo de institución o espacio visitado *" required>
                <option value="" disabled>Selecciona el tipo de espacio</option>
                <option v-for="tipo in catalogos.tiposInstitucion" :key="tipo.id_tipo_institucion" :value="tipo.id_tipo_institucion">
                  {{ tipo.descripcion }}
                </option>
              </AppSelect>
            </div>

            <!-- Nombre de la Institución / Lugar (Input Texto Normal) -->
            <div class="col-span-1">
              <AppInput v-model="form.nombre_institucion" label="Nombre de la institución / lugar *" required placeholder="Ej. Escuela Primaria Benito Juárez" />
            </div>
          </div>
        </AppCard>

        <!-- SECCIÓN 3: DOMICILIO DE LA INSTITUCIÓN O ESPACIO VISITADO -->
        <AppCard>
          <template #header>
            <div class="flex items-center gap-2">
              <MapPin class="w-5 h-5 text-purple-200 dark:text-iecm-morado-400" />
              <h3 class="font-semibold text-white dark:text-iecm-morado-300">3. Domicilio de la Institución o Espacio Visitado</h3>
            </div>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
            <!-- Calle y número -->
            <div class="col-span-1 md:col-span-2">
              <AppInput v-model="form.calle_numero" label="Calle y número *" required placeholder="Ej. Av. Insurgentes Sur 123" />
            </div>

            <!-- Colonia -->
            <div class="col-span-1">
              <AppInput v-model="form.colonia" label="Colonia *" required placeholder="Ej. Del Valle" />
            </div>

            <!-- Demarcación Territorial (Select Catálogo 16 Alcaldías) -->
            <div class="col-span-1 md:col-span-2">
              <AppSelect v-model="form.id_demarcacion" label="Demarcación territorial (Alcaldía) *" required>
                <option value="" disabled>Selecciona la alcaldía</option>
                <option v-for="dem in catalogos.demarcaciones" :key="dem.id_demarcacion" :value="dem.id_demarcacion">
                  {{ dem.demarcacion }}
                </option>
              </AppSelect>
            </div>

            <!-- Código Postal (5 dígitos) -->
            <div class="col-span-1">
              <AppInput v-model="form.cp" label="Código Postal (5 dígitos) *" maxlength="5" required placeholder="03100" />
            </div>

            <!-- Checkbox Dinámico: Agregar grupo o población atendida -->
            <div class="col-span-full border-t border-slate-100 dark:border-white/5 pt-4">
              <label class="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-iecm-morado transition-colors">
                <div class="relative flex items-center justify-center">
                  <input v-model="hasGrupoPoblacion" type="checkbox" class="peer sr-only" />
                  <div class="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-iecm-morado peer-checked:bg-iecm-morado transition-all"></div>
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                </div>
                <div class="text-sm">
                  <span class="font-semibold text-slate-800 dark:text-slate-200">Agregar grupo o población atendida</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400 block">Marca si deseas especificar características del grupo (ej. personas con discapacidad, adultos mayores, comunidad escolar).</span>
                </div>
              </label>
            </div>

            <!-- Input Desplegable Condicional: Grupo o población atendida -->
            <div v-if="hasGrupoPoblacion" class="col-span-full bg-purple-50/50 dark:bg-iecm-morado-950/20 p-4 rounded-xl border border-iecm-morado/20 space-y-1">
              <AppInput
                v-model="form.grupo_poblacion_atendida"
                label="Campo descriptivo de grupo o población atendida *"
                required
                placeholder="Escribe la descripción de la población o grupo..."
              />
              <p class="text-[11px] text-iecm-morado dark:text-iecm-morado-300 font-medium">
                * Campo obligatorio al haber seleccionado "Agregar grupo o población".
              </p>
            </div>

            <!-- Separador Enlace y Aforo -->
            <div class="col-span-full border-t border-slate-100 dark:border-white/5 pt-3">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Contact class="w-4 h-4 text-iecm-morado dark:text-iecm-morado-400" />
                <span>Datos de Enlace y Aforo Estimado</span>
              </div>
            </div>

            <!-- Nombre de contacto -->
            <div class="col-span-1 md:col-span-2 xl:col-span-1">
              <AppInput v-model="form.nombre_contacto" label="Nombre de contacto *" required placeholder="Nombre completo" />
            </div>

            <!-- Teléfono de contacto -->
            <div class="col-span-1">
              <AppInput v-model="form.telefono_contacto" label="Teléfono de contacto *" required placeholder="10 dígitos" />
            </div>

            <!-- Número de personas a atender (máx 3 dígitos) -->
            <div class="col-span-1">
              <AppInput 
                v-model="form.num_personas_atender" 
                type="number" 
                min="1" 
                max="999" 
                label="Núm. personas a atender (1-3 dígitos) *" 
                required 
                placeholder="Ej. 45" 
              />
            </div>
          </div>
        </AppCard>

        <!-- SECCIÓN 4: FECHA Y PERSONAL -->
        <AppCard>
          <template #header>
            <div class="flex items-center gap-2">
              <Clock class="w-5 h-5 text-purple-200 dark:text-iecm-morado-400" />
              <h3 class="font-semibold text-white dark:text-iecm-morado-300">4. Fecha y Personal</h3>
            </div>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <!-- Fecha programada -->
            <div class="col-span-1">
              <AppInput 
                v-model="form.fecha_programada" 
                type="date" 
                label="Fecha programada (día/mes/año) *" 
                required 
              />
            </div>

            <!-- Hora programada -->
            <div class="col-span-1">
              <AppInput 
                v-model="form.hora_programada" 
                type="time" 
                label="Hora programada (HH:MM) *" 
                required 
              />
            </div>

            <!-- Nombre y cargo del personal -->
            <div class="col-span-full">
              <AppInput
                v-model="form.nombre_cargo_persona_atendera"
                label="Nombre y cargo de la persona que atenderá el compromiso *"
                required
                placeholder="Ej. Lic. Ana Morales - Coordinadora Distrital de Participación"
              />
            </div>
          </div>
        </AppCard>

      </div>

      <!-- Zona Lateral: Resumen Reactivo y Guardado (col-span-4) -->
      <aside class="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
        <AppCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Clock class="w-5 h-5 text-purple-200 dark:text-iecm-morado-400" />
                <h3 class="font-semibold text-white">Resumen Reactivo</h3>
              </div>
              <span 
                v-if="accionSeleccionadaObj" 
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm"
                :style="{ backgroundColor: accionSeleccionadaObj.color || '#6B2D8B' }"
              >
                {{ accionSeleccionadaObj.clave_accion }}
              </span>
            </div>
          </template>

          <div class="space-y-4 text-sm">
            <!-- Convenio Badge -->
            <div v-if="form.con_convenio" class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
              <CheckCircle class="w-4 h-4 text-amber-600 shrink-0" />
              <span>Con Convenio Delegacional</span>
            </div>

            <!-- Acción Educativa Detalle -->
            <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-white/5 space-y-1.5">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Acción Educativa
              </span>
              <p class="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                {{ accionSeleccionadaObj?.nombre_accion || 'Selecciona una acción educativa' }}
              </p>
              <div v-if="form.vertiente_nombre" class="flex items-center gap-1.5 text-xs text-iecm-morado dark:text-iecm-morado-300 font-semibold pt-1">
                <Tag class="w-3.5 h-3.5" />
                <span>Vertiente: {{ form.vertiente_nombre }}</span>
              </div>
            </div>

            <!-- Ubicación -->
            <div class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin class="w-3.5 h-3.5 text-slate-400" />
                Ubicación y Sede
              </span>
              <p class="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                {{ form.nombre_institucion || 'Institución no definida' }}
              </p>
              <p v-if="form.calle_numero || form.colonia" class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {{ [form.calle_numero, form.colonia, form.cp ? 'CP ' + form.cp : ''].filter(Boolean).join(', ') }}
              </p>
            </div>

            <!-- Fecha y Hora -->
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div>
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CalendarDays class="w-3.5 h-3.5 text-slate-400" /> Fecha
                </span>
                <p class="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                  {{ form.fecha_programada || 'Pendiente' }}
                </p>
              </div>
              <div>
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5 text-slate-400" /> Hora
                </span>
                <p class="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                  {{ form.hora_programada || 'Pendiente' }}
                </p>
              </div>
            </div>

            <!-- Aforo y Personal -->
            <div v-if="form.num_personas_atender || form.nombre_cargo_persona_atendera" class="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
              <div v-if="form.num_personas_atender" class="flex items-center justify-between text-xs">
                <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Users class="w-3.5 h-3.5 text-slate-400" /> Aforo estimado:
                </span>
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ form.num_personas_atender }} personas</span>
              </div>
              <div v-if="form.nombre_cargo_persona_atendera" class="space-y-0.5 text-xs">
                <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Contact class="w-3.5 h-3.5 text-slate-400" /> Atenderá:
                </span>
                <p class="font-medium text-slate-800 dark:text-slate-200 truncate">{{ form.nombre_cargo_persona_atendera }}</p>
              </div>
            </div>

            <!-- Botones de Acción -->
            <div class="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2.5">
              <AppButton 
                type="submit" 
                variant="primary" 
                size="lg" 
                :loading="saving" 
                class="w-full justify-center shadow-lg shadow-iecm-morado/20"
              >
                <template #icon v-if="!saving"><Save class="w-5 h-5" /></template>
                Guardar Programación
              </AppButton>
              <button
                type="button"
                @click="resetForm"
                class="w-full py-2 text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors text-center cursor-pointer"
              >
                Limpiar formulario
              </button>
            </div>
          </div>
        </AppCard>

        <!-- Indicador de Mes Vigente -->
        <div class="p-4 bg-purple-50/70 dark:bg-iecm-morado-950/20 border border-iecm-morado/20 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div class="flex items-center gap-2 text-iecm-morado dark:text-iecm-morado-300 font-semibold">
            <CalendarDays class="w-4 h-4 shrink-0" />
            <span>Validación Estricta al 100%</span>
          </div>
          <p class="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Todos los campos del formulario son estrictamente obligatorios para garantizar la integridad institucional del SISEC 2027.
          </p>
        </div>
      </aside>

    </form>
  </div>
</template>
