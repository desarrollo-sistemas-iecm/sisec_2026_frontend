<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import BaseInput from '../ui/BaseInput.vue'
import PasswordInput from '../ui/PasswordInput.vue'
import BaseButton from '../ui/BaseButton.vue'
import AlertMessage from '../ui/AlertMessage.vue'
import { useLogin } from '../../composables/useLogin.js'
import { useLoginAnimations } from '../../composables/useLoginAnimations.js'
import { authService } from '../../services/authService.js'
import { getSocket } from '../../services/socket.js'

const props = defineProps({
  scopeRef: {
    type: Object,
    default: null
  }
})

const router = useRouter()
const cardRef = ref(null)

const {
  usuario,
  contrasena,
  loading,
  isSuccess,
  errorMessage,
  isRateLimited,
  countdown,
  handleLogin
} = useLogin()

// Animaciones GSAP encapsuladas
const { triggerShake } = useLoginAnimations(props.scopeRef || cardRef, cardRef)

// Estado para bloque de última actualización
const isUltimaActHabilitado = ref(false)
const ultimaActFecha = ref('')

// Configuración de SweetAlert2 Toast para notificaciones elegantes
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: {
    popup: 'sicec-toast-popup'
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  }
})

const formatDateString = (dateString) => {
  if (!dateString) return ''
  const parts = dateString.split('-')
  if (parts.length === 3) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const year = parts[0]
    const month = months[parseInt(parts[1], 10) - 1]
    const day = parts[2]
    return `${day}/${month}/${year}`
  }
  return dateString
}

let socketInstance = null

onMounted(async () => {
  const config = await authService.getUltimaActualizacion()
  isUltimaActHabilitado.value = Boolean(config?.habilitado)
  if (config?.fecha) {
    ultimaActFecha.value = config.fecha
  }

  try {
    socketInstance = getSocket()
    if (socketInstance) {
      socketInstance.on('config:ultima_actualizacion', (data) => {
        isUltimaActHabilitado.value = Boolean(data?.habilitado)
        if (data?.fecha) ultimaActFecha.value = data.fecha
      })
    }
  } catch (err) {
    console.warn('[SOCKET] Error escuchando en login card:', err)
  }
})

onUnmounted(() => {
  if (socketInstance) {
    socketInstance.off('config:ultima_actualizacion')
  }
})

const onSubmit = async () => {
  // Validación rápida de campos requeridos
  if (!usuario.value.trim() || !contrasena.value) {
    Toast.fire({
      icon: 'warning',
      title: 'Campos requeridos',
      text: 'Por favor ingresa tu usuario y contraseña.'
    })
    triggerShake()
    return
  }

  await handleLogin({
    onSuccess: async (data) => {
      const nombreUsuario = data.user?.nombre ? `¡Bienvenido, ${data.user.nombre}!` : '¡Bienvenido al sistema!'
      
      // Toast de éxito
      Toast.fire({
        icon: 'success',
        title: nombreUsuario,
        text: 'Acceso autorizado correctamente.'
      })

      setTimeout(async () => {
        if (data.mostrarAlertaLogin) {
          await Swal.fire({
            icon: 'info',
            title: 'Manual de Usuario',
            text: 'Por favor, consulte el manual de usuario en el menú lateral para una correcta navegación en el sistema.',
            confirmButtonColor: '#6B2D8B',
            confirmButtonText: 'Entendido'
          })
        }
        const userPermiso = Number(data.user?.permiso || data.user?.id_tipousuario || 1)
        await router.push({ name: userPermiso === 1 ? 'programacion' : 'dashboard' })
      }, 650)
    },
    onError: (err) => {
      triggerShake()
      const mensaje = err?.message || errorMessage.value || 'Usuario o contraseña incorrectos. Verifica tus credenciales.'
      
      // Toast de error
      Toast.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: mensaje
      })
    }
  })
}
</script>

<template>
  <div
    ref="cardRef"
    class="login-card-crystal relative z-10 w-full max-w-[460px] rounded-[32px] p-7 sm:p-9 md:p-10 transition-all duration-300"
  >
    <!-- Borde biselado superior brillante de cristal -->
    <div class="absolute inset-x-8 top-0 h-[2.8px] bg-gradient-to-r from-transparent via-white/100 to-transparent pointer-events-none"></div>

    <!-- Encabezado de Sesión Cristalino -->
    <div class="anim-header text-center mb-6 pt-1">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.10] border border-white/25 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_20px_rgba(0,0,0,0.3)] mb-3">
        <svg class="w-7 h-7 text-white drop-shadow-[0_2px_8px_rgba(147,88,184,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 class="text-2xl sm:text-[27px] font-black text-white tracking-tight leading-tight drop-shadow-sm">
        Iniciar sesión
      </h2>
      <p class="text-xs sm:text-sm text-purple-200/80 mt-1.5 font-normal">
        Ingresa tus credenciales para acceder al sistema.
      </p>
    </div>

    <!-- Formulario Semántico -->
    <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
      <!-- Mensaje de Error Accesible en tarjeta -->
      <transition
        enter-active-class="transition duration-250 ease-out"
        enter-from-class="opacity-0 -translate-y-2 scale-98"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 scale-98"
      >
        <div v-if="errorMessage" class="anim-error">
          <AlertMessage variant="error" :message="errorMessage" />
        </div>
      </transition>

      <!-- Campo Usuario -->
      <div class="anim-field">
        <BaseInput
          id="login-usuario"
          v-model="usuario"
          label="Usuario del sistema"
          placeholder="Ej. dtto01"
          :disabled="loading || isRateLimited"
          required
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          :has-error="Boolean(errorMessage)"
        >
          <template #iconLeft>
            <svg
              class="w-5 h-5 text-purple-300/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </template>
        </BaseInput>
      </div>

      <!-- Campo Contraseña -->
      <div class="anim-field">
        <PasswordInput
          id="login-password"
          v-model="contrasena"
          label="Contraseña"
          placeholder="••••••••"
          :disabled="loading || isRateLimited"
          :has-error="Boolean(errorMessage)"
        />
      </div>

      <!-- Botón de Envío con Estados -->
      <div class="anim-btn pt-2">
        <BaseButton
          type="submit"
          :loading="loading"
          :success="isSuccess"
          :disabled="isRateLimited"
        >
          <span v-if="isRateLimited">Reintentar en {{ countdown }}s</span>
          <span v-else class="font-extrabold tracking-wide">Acceder al sistema</span>
        </BaseButton>
      </div>

      <!-- Bloque: Última actualización -->
      <div
        v-if="isUltimaActHabilitado"
        class="anim-update text-center pt-2 mt-4 border-t border-white/5"
      >
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xs">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <p class="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
            Última actualización:
            <span class="text-emerald-400 font-black ml-0.5">{{ formatDateString(ultimaActFecha) }}</span>
          </p>
        </div>
      </div>
    </form>
  </div>
</template>
