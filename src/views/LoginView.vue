<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { ArrowRight, ChevronLeft, Building2, Activity, ShieldCheck } from '@lucide/vue'
import LoginCard from '../components/auth/LoginCard.vue'
import logoBlanco from '../assets/logos/iecm-blanco.png'

// Referencias del DOM y estado reactivo
const rootScopeRef = ref(null)
const canvasRef = ref(null)
const heroBlockRef = ref(null)
const loginColRef = ref(null)
const btnEntrarRef = ref(null)
const isLoginActive = ref(false)
let animFrameId = null

// ── FONDO DE PARTÍCULAS / CONSTELACIONES MEJORADO EN TODO EL FONDO ──────────
function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return () => {}
  const ctx = canvas.getContext('2d')

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const isSmallScreen = window.innerWidth < 768
  const PARTICLE_COUNT = isSmallScreen ? 28 : 55
  const CONNECTION_DIST = isSmallScreen ? 85 : 120
  
  // Tonos institucionales sutiles: Morado IECM, Dorado tenue y Blanco
  const COLORS = {
    particle: 'rgba(123, 40, 150,',
    line: 'rgba(123, 40, 150,',
    accent: 'rgba(217, 119, 6,',
    white: 'rgba(255, 255, 255,'
  }

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    radius: (Math.random() * 1.4 + 1.2) * 0.5,
    isGold: i < 5,
    isBright: i % 8 === 0
  }))

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1
    })

    // Conexiones de constelación fluidas finitas
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * 0.20
          ctx.beginPath()
          ctx.strokeStyle = `${COLORS.line}${alpha})`
          ctx.lineWidth = 0.5
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }

    // Dibujar nodos con resplandor fino
    particles.forEach((p) => {
      let baseColor = COLORS.particle
      let haloAlpha = 0.12
      let coreAlpha = 0.85

      if (p.isGold) {
        baseColor = COLORS.accent
        haloAlpha = 0.16
      } else if (p.isBright) {
        baseColor = COLORS.white
        haloAlpha = 0.14
      }

      // Halo de resplandor exterior fino
      ctx.beginPath()
      ctx.fillStyle = `${baseColor}${haloAlpha})`
      ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2)
      ctx.fill()

      // Núcleo brillante
      ctx.beginPath()
      ctx.fillStyle = `${baseColor}${coreAlpha})`
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    })

    animFrameId = requestAnimationFrame(draw)
  }

  draw()
  return () => window.removeEventListener('resize', resize)
}

// ── CÁLCULO DEL DESPLAZAMIENTO PARA CENTRADO EXACTO ─────────────────────────
function getCenterOffset() {
  if (!heroBlockRef.value) return 0
  if (window.innerWidth < 1024) return 0

  const rect = heroBlockRef.value.getBoundingClientRect()
  const currentTransform = gsap.getProperty(heroBlockRef.value, 'x') || 0
  const unshiftedCenterX = (rect.left - currentTransform) + rect.width / 2
  const targetCenterX = window.innerWidth / 2
  return Math.round(targetCenterX - unshiftedCenterX)
}

// ── ACCIÓN: ENTRAR AL SISTEMA (ANIMACIÓN AL LADO IZQUIERDO Y APERTURA DE LOGIN)
function handleEntrar() {
  if (isLoginActive.value) return
  isLoginActive.value = true

  const tl = gsap.timeline()
  const isDesktop = window.innerWidth >= 1024

  if (isDesktop) {
    // 1. Desvanecer suavemente el botón Entrar
    if (btnEntrarRef.value) {
      tl.to(btnEntrarRef.value, {
        opacity: 0,
        scale: 0.9,
        duration: 0.22,
        ease: 'power2.in'
      })
    }

    // 2. Deslizar el bloque hero desde el centro hacia la izquierda (x: 0)
    tl.to(
      heroBlockRef.value,
      {
        x: 0,
        duration: 0.85,
        ease: 'power3.inOut'
      },
      '-=0.1'
    )

    // 3. Revelar y deslizar la columna de login desde la derecha (alineada verticalmente)
    tl.fromTo(
      loginColRef.value,
      {
        x: 80,
        opacity: 0,
        pointerEvents: 'none'
      },
      {
        x: 0,
        opacity: 1,
        pointerEvents: 'auto',
        duration: 0.85,
        ease: 'power3.out'
      },
      '-=0.65'
    )
  } else {
    // En móviles / tabletas: transición vertical sutil
    if (btnEntrarRef.value) {
      tl.to(btnEntrarRef.value, { opacity: 0, duration: 0.2 })
    }
    tl.to(heroBlockRef.value, { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' })
    tl.fromTo(
      loginColRef.value,
      { opacity: 0, y: 30, pointerEvents: 'none' },
      { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.5, ease: 'power3.out' }
    )
  }
}

// ── ACCIÓN: VOLVER A LA PANTALLA INICIAL (ANIMACIÓN INVERSA AL CENTRO) ─────────
function handleVolver() {
  if (!isLoginActive.value) return
  isLoginActive.value = false

  const tl = gsap.timeline()
  const isDesktop = window.innerWidth >= 1024

  if (isDesktop) {
    const offset = getCenterOffset()

    // 1. Ocultar la columna de login hacia la derecha
    tl.to(loginColRef.value, {
      x: 80,
      opacity: 0,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: () => {
        if (loginColRef.value) {
          loginColRef.value.style.pointerEvents = 'none'
        }
      }
    })

    // 2. Regresar el bloque hero al centro de la pantalla
    tl.to(
      heroBlockRef.value,
      {
        x: offset,
        duration: 0.85,
        ease: 'power3.inOut'
      },
      '-=0.2'
    )

    // 3. Reaparecer el botón Entrar con un toque elástico sutil
    if (btnEntrarRef.value) {
      tl.fromTo(
        btnEntrarRef.value,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.4)' },
        '-=0.25'
      )
    }
  } else {
    // Móviles
    tl.to(loginColRef.value, { opacity: 0, y: 30, duration: 0.35, ease: 'power2.in' })
    tl.to(heroBlockRef.value, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' })
    if (btnEntrarRef.value) {
      tl.to(btnEntrarRef.value, { opacity: 1, duration: 0.25 })
    }
  }
}

function handleResize() {
  if (!isLoginActive.value && heroBlockRef.value && window.innerWidth >= 1024) {
    const offset = getCenterOffset()
    gsap.set(heroBlockRef.value, { x: offset })
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !isLoginActive.value) {
    handleEntrar()
  }
}

onMounted(() => {
  const cleanupCanvas = initCanvas()
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeydown)

  if (rootScopeRef.value) {
    gsap.fromTo(
      canvasRef.value,
      { opacity: 0 },
      { opacity: 1, duration: 1.4, ease: 'power2.out' }
    )

    nextTick(() => {
      const offset = getCenterOffset()
      // En estado inicial, el bloque hero está centrado horizontalmente
      gsap.set(heroBlockRef.value, { x: offset, opacity: 0 })
      // La columna de login comienza oculta
      if (loginColRef.value) {
        gsap.set(loginColRef.value, { opacity: 0, pointerEvents: 'none' })
      }

      // Entrada suave del bloque hero centrado
      gsap.to(heroBlockRef.value, {
        opacity: 1,
        duration: 0.85,
        ease: 'power2.out',
        delay: 0.1
      })
    })
  }

  onUnmounted(() => {
    cancelAnimationFrame(animFrameId)
    cleanupCanvas()
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('keydown', handleKeydown)
  })
})
</script>

<template>
  <main
    ref="rootScopeRef"
    class="fixed inset-0 z-50 w-full min-h-screen overflow-x-hidden overflow-y-auto bg-[#080412] select-none text-white flex flex-col justify-center"
  >
    <!-- Canvas de partículas en TODO el fondo de la pantalla -->
    <canvas ref="canvasRef" class="login-canvas pointer-events-none" aria-hidden="true"></canvas>

    <!-- Resplandores ambientales institucionales -->
    <div class="fixed -top-40 -left-40 w-[500px] h-[500px] bg-purple-950/40 rounded-full blur-[150px] pointer-events-none"></div>
    <div class="fixed -bottom-40 -right-40 w-[550px] h-[550px] bg-[#551A6C]/25 rounded-full blur-[160px] pointer-events-none"></div>
    <div class="fixed top-1/2 left-1/3 -translate-y-1/2 w-[380px] h-[380px] bg-amber-600/5 rounded-full blur-[140px] pointer-events-none"></div>

    <!-- Contenedor Pantalla Partida (Split Screen) alineado perfectamente en el centro vertical -->
    <div class="relative z-10 w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 items-center flex-1">
      
      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <!-- COLUMNA IZQUIERDA: Identidad Institucional, Título Hero y Cards       -->
      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <section class="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 relative min-h-screen">
        
        <!-- Bloque Central: Logo Oficial, Título, Cards y Botón Entrar (Centrado y Elevado) -->
        <div ref="heroBlockRef" class="relative z-10 my-auto max-w-3xl w-full flex flex-col items-center text-center -translate-y-2 sm:-translate-y-4 lg:-translate-y-6">
          
          <!-- Logotipo Oficial IECM en blanco -->
          <div class="w-full flex items-center justify-center mb-6 sm:mb-7">
            <img
              :src="logoBlanco"
              alt="Instituto Electoral Ciudad de México"
              class="w-[200px] sm:w-[240px] md:w-[280px] lg:w-[320px] max-w-[80vw] h-auto object-contain filter drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] select-none pointer-events-none"
            />
          </div>

          <!-- Badge de Versión y Estado -->
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/45 border border-purple-400/20 backdrop-blur-md mb-4 shadow-sm mx-auto">
            <span class="w-2 h-2 rounded-full bg-[#A855F7]"></span>
            <span class="text-xs font-semibold tracking-widest uppercase text-purple-200/90">Plataforma Institucional 2027</span>
          </div>

          <!-- Título Hero Principal -->
          <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] text-center">
            SISECyCC <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-purple-300 to-indigo-100">2027</span>
          </h1>

          <!-- Subtítulo Institucional -->
          <h2 class="mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-base text-purple-200/75 tracking-[0.28em] uppercase font-semibold text-center">
            Sistema de Seguimiento de Educación Cívica y Construcción Ciudadana
          </h2>

          <!-- Breve síntesis descriptiva -->
          <p class="mt-3.5 sm:mt-4 max-w-xl text-sm sm:text-base text-slate-300/80 leading-relaxed font-normal text-center mx-auto text-balance">
            Plataforma institucional para la planeación operativa, monitoreo distrital y captura de evidencia de las acciones de educación cívica y construcción de ciudadanía del IECM.
          </p>

          <!-- 3 Tarjetas de características clave: Cohesivas, Sobrias y Elegantes -->
          <div class="mt-7 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 max-w-3xl w-full mx-auto">
            
            <!-- Card 1: Órganos Distritales -->
            <div class="group relative p-4.5 sm:p-5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/[0.08] hover:border-purple-400/30 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-left flex flex-col justify-between overflow-hidden">
              <div class="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-purple-400/40 transition-all"></div>
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-400/20 flex items-center justify-center text-purple-300 transition-colors">
                    <Building2 class="w-4.5 h-4.5 text-purple-200" />
                  </div>
                  <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300 border border-white/10">
                    33 Sedes
                  </span>
                </div>
                <h3 class="text-sm font-semibold text-white tracking-tight">Órganos Distritales</h3>
                <p class="text-xs text-slate-300/70 mt-1 leading-relaxed">Cobertura y operación integral en las 33 Direcciones.</p>
              </div>
            </div>

            <!-- Card 2: Captura en Tiempo Real -->
            <div class="group relative p-4.5 sm:p-5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/[0.08] hover:border-purple-400/30 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-left flex flex-col justify-between overflow-hidden">
              <div class="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-purple-400/40 transition-all"></div>
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-400/20 flex items-center justify-center text-purple-300 transition-colors">
                    <Activity class="w-4.5 h-4.5 text-purple-200" />
                  </div>
                  <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300 border border-white/10">
                    Tiempo Real
                  </span>
                </div>
                <h3 class="text-sm font-semibold text-white tracking-tight">Captura en Tiempo Real</h3>
                <p class="text-xs text-slate-300/70 mt-1 leading-relaxed">Validación inmediata con folios consecutivos.</p>
              </div>
            </div>

            <!-- Card 3: Acceso y Seguridad -->
            <div class="group relative p-4.5 sm:p-5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/[0.08] hover:border-purple-400/30 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-left flex flex-col justify-between overflow-hidden">
              <div class="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-purple-400/40 transition-all"></div>
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-400/20 flex items-center justify-center text-purple-300 transition-colors">
                    <ShieldCheck class="w-4.5 h-4.5 text-purple-200" />
                  </div>
                  <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300 border border-white/10">
                    Seguridad RBAC
                  </span>
                </div>
                <h3 class="text-sm font-semibold text-white tracking-tight">Acceso Seguro</h3>
                <p class="text-xs text-slate-300/70 mt-1 leading-relaxed">Control modular y autenticación institucional.</p>
              </div>
            </div>

          </div>

          <!-- Botón de acción: Entrar al sistema Institucional -->
          <div v-show="!isLoginActive" class="mt-8 flex items-center justify-center w-full">
            <button
              ref="btnEntrarRef"
              @click="handleEntrar"
              type="button"
              class="btn-entrar group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-b from-[#7B2896] to-[#551A6C] hover:from-[#8930A6] hover:to-[#5E1E77] text-white font-semibold text-base sm:text-lg border border-purple-400/30 border-t-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.35),0_0_24px_rgba(123,40,150,0.25)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.45),0_0_30px_rgba(123,40,150,0.4)] active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden select-none"
            >
              <!-- Shimmer luminoso interactivo sutil -->
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></div>
              
              <span class="tracking-wide">Entrar al sistema</span>
              <ArrowRight class="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>

        </div>

      </section>

      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <!-- COLUMNA DERECHA: Formulario de Login Cristalino                       -->
      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <section 
        ref="loginColRef"
        class="anim-split-right lg:col-span-5 xl:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 relative min-h-screen"
      >
        <!-- Botón Volver a la pantalla de bienvenida (Flotante arriba del LoginCard) -->
        <div v-if="isLoginActive" class="w-full max-w-[420px] mb-3 flex items-center justify-start">
          <button
            @click="handleVolver"
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-purple-200 hover:text-white transition-all duration-200 cursor-pointer group shadow-xs backdrop-blur-md"
            title="Volver a la presentación inicial"
          >
            <ChevronLeft class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Volver</span>
          </button>
        </div>

        <LoginCard :scope-ref="rootScopeRef" />
      </section>

    </div>

    <!-- Footer Institucional Flotante Centrado en la parte inferior de la pantalla -->
    <footer class="absolute bottom-3 sm:bottom-4 inset-x-0 flex items-center justify-center text-center text-[11px] sm:text-xs text-white/40 pointer-events-none z-20">
      <p>&copy; 2027 Instituto Electoral de la Ciudad de México</p>
    </footer>

  </main>
</template>

<style scoped>
.login-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
}
</style>
