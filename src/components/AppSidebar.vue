<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, CalendarDays, Edit3, ClipboardList, BarChart3, LogOut, Menu, X, ChevronLeft, ChevronRight, Settings } from '@lucide/vue'
import { useAuth } from '../composables/useAuth.js'
import { useGsapAnimations } from '../composables/useGsapAnimations.js'
import { useThemeStore } from '../stores/themeStore.js'
import { getSocket } from '../services/socket.js'
import AppBadge from './ui/AppBadge.vue'
import api from '../services/api.js'
import Swal from 'sweetalert2'
import logoBlanco from '../assets/logos/iecm-blanco.png'
import logoNegro from '../assets/logos/iecm-negro.png'

const router = useRouter()
const route = useRoute()
const { authStore, logout } = useAuth()
const { animarSidebar } = useGsapAnimations()
const themeStore = useThemeStore()

const sidebarRef = ref(null)
const isMobileOpen = ref(false)
const isCollapsed = ref(false)
const canvasRef = ref(null)
let animFrameId = null

const userName = computed(() => authStore.user?.nombre ?? 'Usuario')
const userRoleName = computed(() => {
  if (authStore.isSuperAdmin) return 'Super Admin'
  if (authStore.isAdmin) return 'Administrador'
  return 'Distrito'
})

const menuItems = computed(() => {
  const allItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard, iconColor: 'text-blue-600 dark:text-blue-400' },
    { id: 'programacion', name: 'Programacion', path: '/programacion', icon: CalendarDays, iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'captura', name: 'Captura', path: '/captura', icon: Edit3, iconColor: 'text-amber-500 dark:text-amber-400' },
    { id: 'encuestas', name: 'Encuestas', path: '/encuesta', icon: ClipboardList, iconColor: 'text-rose-600 dark:text-rose-400' },
    { id: 'reportes', name: 'Reportes', path: '/reportes', icon: BarChart3, iconColor: 'text-teal-600 dark:text-teal-400' },
    { id: 'administracion', name: 'Administracion', path: '/administracion', icon: Settings, iconColor: 'text-purple-700 dark:text-purple-300' },
  ]
  return allItems.filter(item => authStore.hasModulo(item.id))
})

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return () => {}
  const ctx = canvas.getContext('2d')
  const parent = canvas.parentElement

  const resize = () => {
    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight
  }
  
  const observer = new ResizeObserver(() => resize())
  observer.observe(parent)

  const PARTICLE_COUNT = 48
  const CONNECTION_DIST = 110

  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * (parent.clientWidth || 256),
    y: Math.random() * (parent.clientHeight || window.innerHeight),
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    radius: Math.random() * 2.0 + 1.8
  }))

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // En modo oscuro: Moradas #9358B8 (RGB: 147, 88, 184)
    // En modo claro: Moradas finas #6B2D8B (RGB: 107, 45, 139) sobre fondo #DDD1E6
    const isDark = themeStore.isDark
    const colorRGB = isDark ? '147, 88, 184' : '107, 45, 139'

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1
    })

    // Líneas de conexión (finitas y elegantes para modo claro y oscuro)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * (isDark ? 0.40 : 0.38)
          ctx.beginPath()
          ctx.strokeStyle = `rgba(${colorRGB}, ${alpha})`
          ctx.lineWidth = 0.6
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }

    // Partículas (más finitas, sutiles y elegantes en ambos modos)
    particles.forEach(p => {
      const radius = p.radius * 0.52

      // Halo resplandor
      ctx.beginPath()
      ctx.fillStyle = `rgba(${colorRGB}, ${isDark ? 0.20 : 0.16})`
      ctx.arc(p.x, p.y, radius * 1.7, 0, Math.PI * 2)
      ctx.fill()

      // Núcleo brillante
      ctx.beginPath()
      ctx.fillStyle = `rgba(${colorRGB}, ${isDark ? 0.92 : 0.88})`
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    animFrameId = requestAnimationFrame(draw)
  }

  draw()
  return () => observer.disconnect()
}

const windowWidth = ref(window.innerWidth)
let socketInstance = null
let cleanupCanvas = null
let handleResize = null

onMounted(() => {
  handleResize = () => {
    windowWidth.value = window.innerWidth
  }
  window.addEventListener('resize', handleResize)
  
  if (sidebarRef.value && window.innerWidth > 1024) {
    animarSidebar(sidebarRef.value)
  }
  cleanupCanvas = initCanvas()
  
  if (authStore.isAuthenticated) {
    fetchSidebarConfigs()
  }

  // Escuchar cambios en vivo por Socket.IO
  try {
    socketInstance = getSocket()
    if (socketInstance) {
      socketInstance.on('config:manual', (data) => {
        isManualHabilitado.value = Boolean(data?.habilitado)
      })
      socketInstance.on('config:ultima_actualizacion', (data) => {
        isUltimaActHabilitado.value = Boolean(data?.habilitado)
        if (data?.fecha) {
          ultimaActFecha.value = data.fecha
        }
      })
    }
  } catch (err) {
    console.warn('[SOCKET] Error escuchando configs en sidebar:', err)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  if (cleanupCanvas) cleanupCanvas()
  if (handleResize) window.removeEventListener('resize', handleResize)
  if (socketInstance) {
    socketInstance.off('config:manual')
    socketInstance.off('config:ultima_actualizacion')
  }
})

const isManualHabilitado = ref(false)
const isUltimaActHabilitado = ref(false)
const ultimaActFecha = ref('')

const fetchSidebarConfigs = async () => {
  try {
    if (!authStore.isAuthenticated) return
    const manualRes = await api.get('/admin/manual-config')
    if (manualRes.data.success) {
      isManualHabilitado.value = manualRes.data.habilitado
    }
    const updateRes = await api.get('/admin/ultima-actualizacion-config')
    if (updateRes.data.success) {
      isUltimaActHabilitado.value = updateRes.data.habilitado
      ultimaActFecha.value = updateRes.data.fecha
    }
  } catch (error) {
    console.error('Error fetching sidebar configs:', error)
  }
}

const verManual = async () => {
  try {
    const response = await api.get('/uploads/manual/descargar', { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'No disponible',
      text: 'El manual de usuario no está habilitado o no se encuentra en el servidor.',
      confirmButtonColor: '#6B2D8B'
    })
  }
}

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

watch(() => authStore.isAuthenticated, (newVal) => {
  if (newVal) {
    fetchSidebarConfigs()
  }
})

const isDesktop = computed(() => windowWidth.value >= 1024)
const effectiveCollapsed = computed(() => isDesktop.value && isCollapsed.value)

// Cerrar sidebar en móvil al cambiar de ruta
router.afterEach(() => {
  isMobileOpen.value = false
})
</script>

<template>
  <!-- Hamburger móvil -->
  <button 
    v-if="!isMobileOpen"
    class="lg:hidden fixed top-4 left-4 z-50 p-2 text-slate-900 dark:text-white rounded-md shadow-md border border-white/40 backdrop-blur-sm sicec-sidebar"
    @click="isMobileOpen = true"
  >
    <Menu class="w-6 h-6" />
  </button>

  <!-- Overlay móvil -->
  <div 
    v-if="isMobileOpen" 
    class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
    @click="isMobileOpen = false"
  ></div>

  <!-- Sidebar -->
  <aside 
    ref="sidebarRef"
    :class="[
      'sicec-sidebar fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 overflow-hidden lg:sticky lg:top-0 lg:h-screen lg:shrink-0 border-r border-white/20 dark:border-white/10 shadow-xl',
      isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      effectiveCollapsed ? 'w-20' : 'w-64'
    ]"
    :style="{ backgroundColor: themeStore.isDark ? '#080412' : '#DDD1E6' }"
  >
    <!-- Fondo Canvas Partículas (Moradas #9358B8 en oscuro, moradas finitas #6B2D8B en claro) -->
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-100"></canvas>
    
    <!-- Contenido encima del canvas -->
    <div class="relative z-10 flex flex-col h-full w-full">
      <!-- Logo area -->
      <div class="h-24 flex items-center justify-between px-4 relative">
        <img 
          v-if="!effectiveCollapsed" 
          :src="themeStore.isDark ? logoBlanco : logoNegro" 
          alt="IECM Logo" 
          :class="[
            'h-auto object-contain transition-all duration-300 drop-shadow-xs mx-auto',
            themeStore.isDark ? 'w-[82%] max-w-[190px] max-h-20' : 'w-[68%] max-w-[165px] max-h-[92px]'
          ]" 
        />
        <div v-else class="w-10 h-10 rounded-full bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20 flex items-center justify-center font-black text-slate-900 dark:text-white text-sm shadow-md mx-auto backdrop-blur-xs">
          IE
        </div>
        
        <!-- Botón cerrar (Móvil) -->
        <button 
          @click="isMobileOpen = false"
          class="lg:hidden p-1.5 text-slate-900 dark:text-white hover:bg-white/20 rounded-lg transition-colors absolute right-4"
        >
          <X class="w-6 h-6" />
        </button>
        
        <!-- Toggle Collapse Button (Desktop) -->
        <button 
          @click="isCollapsed = !isCollapsed"
          class="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/95 dark:bg-[#161028] border border-white dark:border-white/20 text-slate-900 dark:text-white rounded-full items-center justify-center shadow-md hover:bg-white hover:scale-110 transition-all z-50 cursor-pointer"
        >
          <component :is="isCollapsed ? 'ChevronRight' : 'ChevronLeft'" class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Navegación con Botones Cristalinos (Efecto Liquid Crystal Glass) -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
        <RouterLink 
          v-for="item in menuItems" 
          :key="item.path" 
          :to="item.path"
          class="btn-crystal-menu group flex items-center px-3 py-2.5"
          :class="[
            route.path === item.path ? 'active' : '',
            effectiveCollapsed ? 'justify-center' : 'gap-3'
          ]"
          :title="effectiveCollapsed ? item.name : ''"
        >
          <!-- Contenedor del ícono cristalino -->
          <div 
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 border border-white/20 dark:border-white/10"
            :class="route.path === item.path 
              ? 'bg-white/90 dark:bg-white/20 shadow-xs' 
              : 'bg-white/30 dark:bg-white/[0.06] group-hover:bg-white/50 dark:group-hover:bg-white/[0.14]'"
          >
            <component 
              :is="item.icon" 
              class="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110" 
              :class="item.iconColor"
            />
          </div>
          <!-- Nombre de la opción -->
          <span v-if="!effectiveCollapsed" class="whitespace-nowrap tracking-tight font-extrabold text-sm">{{ item.name }}</span>
          
          <!-- Indicador activo sutil -->
          <span 
            v-if="!effectiveCollapsed && route.path === item.path" 
            class="ml-auto w-1.5 h-4 rounded-full bg-[#6B2D8B] dark:bg-[#9358B8]"
          ></span>
        </RouterLink>
      </nav>

      <!-- Botón Manual de Usuario Translúcido -->
      <div v-if="isManualHabilitado" class="px-3 py-2">
        <button
          type="button"
          @click="verManual"
          class="flex items-center rounded-xl px-3 py-2.5 text-sm font-extrabold text-slate-900 dark:text-slate-100 bg-white/40 hover:bg-white/60 dark:bg-white/[0.04] dark:hover:bg-white/[0.10] border border-white/60 hover:border-white/80 dark:border-white/10 dark:hover:border-white/25 backdrop-blur-[1.5px] transition-all w-full cursor-pointer hover:scale-[1.01]"
          :class="effectiveCollapsed ? 'justify-center' : 'gap-3'"
          title="Ver manual de usuario"
        >
          <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/50 dark:bg-white/[0.06] group-hover:bg-white/70 dark:group-hover:bg-white/[0.12]">
            <ClipboardList class="w-4.5 h-4.5 shrink-0 text-[#FF0000]" />
          </div>
          <span v-if="!effectiveCollapsed" class="whitespace-nowrap">Ver manual de usuario</span>
        </button>
      </div>

      <!-- Sección de abajo: Mismo fondo que todo (sin caja separada), las partículas fluyen libremente -->
      <div class="p-4 bg-transparent">
        <!-- Última actualización (Sin caja gris, integrado al mismo fondo) -->
        <div v-if="isUltimaActHabilitado && !effectiveCollapsed" class="text-center mb-3 px-2 py-0.5 bg-transparent">
          <p class="text-[9px] text-slate-900 dark:text-slate-400 uppercase tracking-wider font-extrabold">Última actualización</p>
          <p class="text-xs text-emerald-800 dark:text-emerald-400 font-black mt-0.5">{{ formatDateString(ultimaActFecha) }}</p>
        </div>

        <!-- Usuario y Super Admin (Integrado al mismo fondo) -->
        <div class="flex items-center gap-3 mb-4" :class="effectiveCollapsed ? 'justify-center px-0' : 'px-2'">
          <!-- Avatar con borde rojo #FF0000 -->
          <div class="h-10 w-10 shrink-0 rounded-full bg-white/95 dark:bg-transparent flex items-center justify-center border-2 border-[#FF0000] font-black text-slate-900 dark:text-white shadow-sm">
            {{ userName.charAt(0).toUpperCase() }}
          </div>
          <div v-if="!effectiveCollapsed" class="min-w-0 flex-1 transition-opacity duration-300">
            <!-- Nombre de usuario -->
            <p class="truncate text-sm font-extrabold text-slate-900 dark:text-white">{{ userName }}</p>
            <!-- Badge Super Admin con color #FF0000 -->
            <div 
              v-if="authStore.isSuperAdmin"
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-0.5 rounded-full border-2 border-[#FF0000] bg-white/95 dark:bg-transparent shadow-xs text-xs font-black text-slate-900 dark:text-white"
            >
              <span class="w-2 h-2 rounded-full bg-[#FF0000] shrink-0 animate-pulse"></span>
              <span>Super Admin</span>
            </div>
            <AppBadge v-else :variant="authStore.isAdmin ? 'warning' : 'info'" class="mt-0.5 scale-90 origin-left font-bold text-slate-900 dark:text-white">
              {{ userRoleName }}
            </AppBadge>
          </div>
        </div>
        
        <!-- Lo ÚNICO translúcido abajo: Botón Cerrar Sesión con letras en #FF0000 -->
        <button
          type="button"
          @click="handleLogout"
          class="flex items-center justify-center rounded-xl bg-white/40 hover:bg-white/60 dark:bg-white/[0.05] dark:hover:bg-white/[0.12] border border-white/60 dark:border-white/15 hover:border-white/80 dark:hover:border-white/30 backdrop-blur-[1.5px] transition-all cursor-pointer shadow-xs hover:shadow-md"
          :class="effectiveCollapsed ? 'w-full py-2.5' : 'w-full gap-2 px-4 py-2.5 text-sm font-extrabold'"
          :title="effectiveCollapsed ? 'Cerrar sesión' : ''"
        >
          <LogOut class="w-4 h-4 shrink-0 text-[#FF0000]" />
          <span v-if="!effectiveCollapsed" class="whitespace-nowrap font-extrabold text-[#FF0000]">Cerrar sesión</span>
        </button>
      </div>
    </div>
  </aside>
</template>
