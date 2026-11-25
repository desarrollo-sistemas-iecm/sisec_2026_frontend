<script setup>
import { ref, onMounted } from 'vue'
import { Send, Bot, ShieldCheck, CheckCircle2, XCircle, RefreshCw, Bell, AlertTriangle, MessageSquare, Zap } from '@lucide/vue'
import api from '../../services/api.js'
import { useToast } from '../../composables/useToast.js'

const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)

const config = ref({
  activo: true,
  resumen_diario: true,
  alertas_admin: true,
  alertas_errores: true,
  bot_configurado: false,
  chat_id: '',
  ambiente: 'development',
  fecha_modif: null
})

const cargarConfiguracion = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/telegram-config')
    if (res.data?.success) {
      config.value = { ...config.value, ...res.data.data }
    }
  } catch (error) {
    toast.error('No se pudo cargar la configuración de Telegram.')
  } finally {
    loading.value = false
  }
}

const guardarConfiguracion = async () => {
  saving.value = true
  try {
    const res = await api.put('/admin/telegram-config', {
      activo: config.value.activo,
      resumen_diario: config.value.resumen_diario,
      alertas_admin: config.value.alertas_admin,
      alertas_errores: config.value.alertas_errores
    })

    if (res.data?.success) {
      config.value = { ...config.value, ...res.data.data }
      toast.success(
        config.value.activo 
          ? 'Notificaciones de Telegram ACTIVADAS exitosamente.' 
          : 'Notificaciones de Telegram DESACTIVADAS exitosamente.'
      )
    }
  } catch (error) {
    toast.error('Error al guardar la configuración de Telegram.')
  } finally {
    saving.value = false
  }
}

const enviarPruebaTelegram = async () => {
  testing.value = true
  try {
    const res = await api.post('/admin/telegram-test')
    if (res.data?.success) {
      toast.success('¡Mensaje de prueba con métricas enviado a Telegram con éxito!')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Error al enviar el mensaje de prueba a Telegram.')
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  cargarConfiguracion()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header del Módulo -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-purple-900/30 via-slate-900/20 to-slate-900/40 p-5 rounded-2xl border border-iecm-morado/30 backdrop-blur-sm">
      <div class="flex items-center gap-3.5">
        <div class="p-3 rounded-xl bg-iecm-morado/20 text-iecm-morado dark:text-purple-300 border border-iecm-morado/40 shadow-inner">
          <Bot class="w-7 h-7" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Bot de Notificaciones Telegram</h2>
            <span 
              class="px-2.5 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1"
              :class="config.activo 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="config.activo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
              {{ config.activo ? 'Servicio Activo' : 'Servicio Desactivado' }}
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Módulo exclusivo del Super Administrador para gobernar el flujo de alertas y métricas en Telegram.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button
          @click="enviarPruebaTelegram"
          :disabled="testing || loading || !config.activo"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-iecm-morado/40 bg-iecm-morado/10 hover:bg-iecm-morado/20 text-iecm-morado dark:text-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Envía una prueba con las métricas institucionales actuales"
        >
          <Zap class="w-4 h-4" :class="{'animate-bounce': testing}" />
          <span>{{ testing ? 'Enviando...' : 'Enviar Prueba' }}</span>
        </button>

        <button
          @click="guardarConfiguracion"
          :disabled="saving || loading"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-iecm-morado hover:bg-iecm-morado-600 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          <RefreshCw class="w-4 h-4" :class="{'animate-spin': saving}" />
          <span>{{ saving ? 'Guardando...' : 'Guardar Cambios' }}</span>
        </button>
      </div>
    </div>

    <!-- Spinner si está cargando -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <RefreshCw class="w-8 h-8 animate-spin text-iecm-morado" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Columna Izquierda: Interruptor Maestro (2 columnas en desktop) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Tarjeta de Interruptor Maestro -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Notificaciones Globales de Telegram
                </span>
                <span 
                  class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
                  :class="config.activo ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
                >
                  {{ config.activo ? 'Habilitado' : 'Silenciado' }}
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                Al desactivar este interruptor, el bot de Telegram se silenciará por completo y no enviará métricas automáticas, avisos de administradores ni alertas de errores.
              </p>
            </div>

            <!-- Switch Master -->
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                v-model="config.activo" 
                class="sr-only peer"
              >
              <div class="w-14 h-8 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-iecm-morado"></div>
            </label>
          </div>
        </div>

        <!-- Preferencias por Tipo de Notificación -->
        <div 
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5 transition-opacity"
          :class="{'opacity-50 pointer-events-none': !config.activo}"
        >
          <div class="border-b border-slate-100 dark:border-white/5 pb-3">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Canales y Tipos de Mensajes Habilitados
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Personaliza individualmente qué eventos deben enviarse al chat del bot.
            </p>
          </div>

          <!-- Switch 1: Resumen Diario de Métricas -->
          <div class="flex items-center justify-between gap-4 py-2">
            <div class="flex items-start gap-3">
              <div class="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                <Bell class="w-5 h-5" />
              </div>
              <div>
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Resumen de Métricas Automático (Cortes 09:00 y 18:00 hrs)
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  Envía el conteo de Acciones Totales, Sin capturar, Capturadas/Finalizadas y Encuestas respondidas.
                </span>
              </div>
            </div>

            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                v-model="config.resumen_diario" 
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-iecm-morado"></div>
            </label>
          </div>

          <!-- Switch 2: Mensajes de Admin al Superadmin -->
          <div class="flex items-center justify-between gap-4 py-2 border-t border-slate-100 dark:border-white/5">
            <div class="flex items-start gap-3">
              <div class="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-iecm-morado dark:text-purple-400 shrink-0">
                <MessageSquare class="w-5 h-5" />
              </div>
              <div>
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Mensajes de Administradores dirigidos al Superadmin
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  Envía instantáneamente a Telegram las notificaciones internas enviadas por administradores u operadores hacia el Superadmin.
                </span>
              </div>
            </div>

            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                v-model="config.alertas_admin" 
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-iecm-morado"></div>
            </label>
          </div>

          <!-- Switch 3: Alertas de Errores Críticos -->
          <div class="flex items-center justify-between gap-4 py-2 border-t border-slate-100 dark:border-white/5">
            <div class="flex items-start gap-3">
              <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle class="w-5 h-5" />
              </div>
              <div>
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Alertas de Errores en Servidor (Fallas 500)
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  Despacha alertas inmediatas con origen, ubicación en código y detalle cuando ocurre un fallo no controlado.
                </span>
              </div>
            </div>

            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                v-model="config.alertas_errores" 
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-iecm-morado"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Información del Entorno y Estado -->
      <div class="space-y-6">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-iecm-morado" />
            Parámetros de Conexión
          </h3>

          <div class="space-y-3 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span class="text-slate-400 block font-medium">Ambiente Activo:</span>
              <span class="font-mono font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                🧪 {{ config.ambiente || 'development' }}
              </span>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span class="text-slate-400 block font-medium">Estado del Token:</span>
              <span class="font-bold flex items-center gap-1.5 mt-0.5" :class="config.bot_configurado ? 'text-emerald-500' : 'text-rose-500'">
                <CheckCircle2 v-if="config.bot_configurado" class="w-4 h-4" />
                <XCircle v-else class="w-4 h-4" />
                {{ config.bot_configurado ? 'Token Configurado (Válido)' : 'Token No Encontrado en .env' }}
              </span>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span class="text-slate-400 block font-medium">Chat ID Destino:</span>
              <span class="font-mono font-bold text-slate-700 dark:text-slate-300">
                {{ config.chat_id ? 'Configurado (' + config.chat_id.slice(0, 5) + '...)' : 'Sin configurar' }}
              </span>
            </div>

            <div v-if="config.fecha_modif" class="text-[11px] text-slate-400 text-right">
              Último cambio: {{ new Date(config.fecha_modif).toLocaleString('es-MX') }}
            </div>
          </div>
        </div>

        <!-- Vista Previa del Formato -->
        <div class="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-white/10 shadow-lg space-y-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-purple-400">
            <Send class="w-3.5 h-3.5" />
            <span>Formato de Mensaje Telegram:</span>
          </div>
          <pre class="text-[11px] font-mono leading-relaxed bg-black/40 p-3 rounded-lg border border-white/5 text-slate-300 whitespace-pre-wrap select-all">
🧪 [DEVELOPMENT]
 SICECyCC 2027
🕐 Fecha y Hora: 25/11/2026 09:00:00
🏷️ Corte: 🌅 Turno Matutino (09:00 hrs)

✅ Acciones Totales: 1328
📚 Sin capturar: 662
👥 Capturadas o finalizadas: 665
📝 Encuestas respondidas: 994

🔵 Reportes: 0</pre>
        </div>
      </div>
    </div>
  </div>
</template>
