<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { ArrowRight, ChevronLeft, Building, Zap, ShieldCheck } from '@lucide/vue'
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
  const PARTICLE_COUNT = isSmallScreen ? 55 : 120
  const CONNECTION_DIST = isSmallScreen ? 110 : 155
  
  // Tonos institucionales: Morado #9358B8, Dorado IECM y Blanco brillante
  const COLORS = {
    particle: 'rgba(147, 88, 184,',   // #9358B8
    line: 'rgba(147, 88, 184,',
    accent: 'rgba(245, 166, 35,',     // Dorado IECM
    white: 'rgba(255, 255, 255,'
  }

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    radius: (Math.random() * 2.0 + 1.8) * 0.52,
    isGold: i < 8,
    isBright: i % 7 === 0
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
          const alpha = (1 - dist / CONNECTION_DIST) * 0.38
          ctx.beginPath()
          ctx.strokeStyle = `${COLORS.line}${alpha})`
          ctx.lineWidth = 0.6
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }

    // Dibujar nodos con resplandor fino
    particles.forEach((p) => {
      let baseColor = COLORS.particle
      let haloAlpha = 0.18
      let coreAlpha = 0.92

      if (p.isGold) {
        baseColor = COLORS.accent
        haloAlpha = 0.22
      } else if (p.isBright) {
        baseColor = COLORS.white
        haloAlpha = 0.20
      }

      // Halo de resplandor exterior fino
      ctx.beginPath()
      ctx.fillStyle = `${baseColor}${haloAlpha})`
      ctx.arc(p.x, p.y, p.radius * 1.7, 0, Math.PI * 2)
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

    <!-- Resplandores ambientales cósmicos de fondo -->
    <div class="fixed -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[160px] pointer-events-none"></div>
    <div class="fixed -bottom-40 -right-40 w-[650px] h-[650px] bg-[#9358B8]/18 rounded-full blur-[180px] pointer-events-none"></div>
    <div class="fixed top-1/2 left-1/3 -translate-y-1/2 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"></div>

    <!-- Contenedor Pantalla Partida (Split Screen) alineado perfectamente en el centro vertical -->
    <div class="relative z-10 w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 items-center flex-1">
      
      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <!-- COLUMNA IZQUIERDA: Identidad Institucional, Título Hero y Cards       -->
      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <section class="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 relative min-h-screen">
        
        <!-- Bloque Central: Logo Oficial, Título Grande, Cards y Botón Entrar (Centrado y Elevado) -->
        <div ref="heroBlockRef" class="relative z-10 my-auto max-w-3xl w-full flex flex-col items-center text-center -translate-y-2 sm:-translate-y-4 lg:-translate-y-6">
          
          <!-- Logotipo Oficial IECM en blanco normal: Tamaño equilibrado y mayor presencia -->
          <div class="w-full flex items-center justify-center mb-6 sm:mb-8">
            <img
              :src="logoBlanco"
              alt="Instituto Electoral Ciudad de México"
              class="w-[230px] sm:w-[270px] md:w-[320px] lg:w-[360px] max-w-[85vw] h-auto object-contain filter drop-shadow-[0_4px_28px_rgba(147,88,184,0.5)] select-none pointer-events-none"
            />
          </div>

          <!-- Badge de Versión y Estado Centrado Más Grande -->
          <div class="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-white/[0.07] border border-white/15 backdrop-blur-md mb-5 shadow-xs mx-auto">
            <span class="w-2.5 h-2.5 rounded-full bg-[#9358B8] animate-pulse"></span>
            <span class="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-purple-200">Plataforma Institucional 2027</span>
          </div>

          <!-- Título Hero Principal Centrado Más Grande -->
          <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.05] drop-shadow-[0_4px_35px_rgba(0,0,0,0.95)] text-center">
            SISECyCC <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#9358B8] via-[#D946EF] to-[#F472B6] drop-shadow-[0_2px_20px_rgba(217,70,239,0.4)]">2027</span>
          </h1>

          <!-- Subtítulo Centrado Más Grande -->
          <h2 class="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-[#D8B4E2] tracking-[0.26em] uppercase font-black drop-shadow-md text-center">
            Sistema de Seguimiento y Control
          </h2>

          <!-- Breve síntesis Centrada Más Grande -->
          <p class="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base md:text-lg text-slate-200/90 leading-relaxed font-normal text-center mx-auto">
            Plataforma institucional para la planeación operativa, monitoreo distrital y captura de evidencia de las acciones de educación cívica y construcción de ciudadanía del IECM.
          </p>

          <!-- 3 Tarjetas de características clave: PUROS ICONOS VECTORIALES, Más Grandes y Espaciosas -->
          <div class="mt-7 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mx-auto">
            
            <!-- Card 1: Órganos Distritales -->
            <div class="group relative p-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 hover:border-purple-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_35px_rgba(147,88,184,0.3)] text-left flex flex-col justify-between overflow-hidden">
              <div class="absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:via-purple-400/60 transition-all"></div>
              <div>
                <div class="flex items-center justify-between mb-3.5">
                  <div class="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-200 group-hover:scale-105 transition-transform duration-200 shadow-inner">
                    <Building class="w-5 h-5 text-purple-200" />
                  </div>
                  <span class="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/25 text-purple-200 border border-purple-400/30">
                    33 Sedes
                  </span>
                </div>
                <h3 class="text-sm sm:text-base font-bold text-white tracking-wide">Órganos Distritales</h3>
                <p class="text-xs sm:text-sm text-slate-300/85 mt-1.5 leading-relaxed">Cobertura integral en las 33 Direcciones.</p>
              </div>
            </div>

            <!-- Card 2: Captura en Tiempo Real -->
            <div class="group relative p-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 hover:border-emerald-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_35px_rgba(16,185,129,0.3)] text-left flex flex-col justify-between overflow-hidden">
              <div class="absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:via-emerald-400/60 transition-all"></div>
              <div>
                <div class="flex items-center justify-between mb-3.5">
                  <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-200 group-hover:scale-105 transition-transform duration-200 shadow-inner">
                    <Zap class="w-5 h-5 text-emerald-200" />
                  </div>
                  <span class="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                    En vivo
                  </span>
                </div>
                <h3 class="text-sm sm:text-base font-bold text-white tracking-wide">Captura en Tiempo Real</h3>
                <p class="text-xs sm:text-sm text-slate-300/85 mt-1.5 leading-relaxed">Validación con folios institucionales.</p>
              </div>
            </div>

            <!-- Card 3: Acceso Seguro -->
            <div class="group relative p-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 hover:border-amber-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_35px_rgba(245,158,11,0.3)] text-left flex flex-col justify-between overflow-hidden">
              <div class="absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:via-amber-400/60 transition-all"></div>
              <div>
                <div class="flex items-center justify-between mb-3.5">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-200 group-hover:scale-105 transition-transform duration-200 shadow-inner">
                    <ShieldCheck class="w-5 h-5 text-amber-200" />
                  </div>
                  <span class="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/30">
                    Blindado
                  </span>
                </div>
                <h3 class="text-sm sm:text-base font-bold text-white tracking-wide">Acceso Seguro</h3>
                <p class="text-xs sm:text-sm text-slate-300/85 mt-1.5 leading-relaxed">Control estricto de autenticación.</p>
              </div>
            </div>

          </div>

          <!-- Botón de acción: Entrar al sistema Más Grande y Heroico -->
          <div v-show="!isLoginActive" class="mt-8 sm:mt-9 flex items-center justify-center w-full">
            <button
              ref="btnEntrarRef"
              @click="handleEntrar"
              type="button"
              class="btn-entrar group relative inline-flex items-center gap-4 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#9358B8] via-[#A855F7] to-[#D946EF] text-white font-extrabold text-lg sm:text-xl shadow-[0_0_40px_rgba(147,88,184,0.55)] hover:shadow-[0_0_60px_rgba(217,70,239,0.85)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 border border-white/30 cursor-pointer overflow-hidden select-none"
            >
              <!-- Shimmer luminoso interactivo -->
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>
              
              <span class="tracking-wide">Entrar al sistema</span>
              <ArrowRight class="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1.5" />
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
