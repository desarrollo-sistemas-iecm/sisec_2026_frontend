<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  isOpen: { type: Boolean, default: undefined }, // Compatibilidad con vistas que usan isOpen
  title: { type: String, default: '' },
  size: { type: String, default: '' }, // sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, full
  maxWidth: { type: String, default: '' },
  zIndex: { type: String, default: 'z-50' },
  showCloseButton: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true }
})

const emit = defineEmits(['close'])

const isVisible = computed(() => {
  return props.isOpen !== undefined ? props.isOpen : props.open
})

// Mapeo exhaustivo de tamaños para responsividad y espacio óptimo
const computedMaxWidth = computed(() => {
  if (props.maxWidth) return props.maxWidth
  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    '4xl': 'max-w-5xl',
    '5xl': 'max-w-6xl',
    '6xl': 'max-w-7xl',
    '7xl': 'max-w-[1440px]',
    full: 'max-w-[96vw]'
  }
  if (props.size && sizeMap[props.size]) {
    return sizeMap[props.size]
  }
  return 'max-w-2xl'
})

const onKeydown = (e) => {
  if (e.key === 'Escape' && isVisible.value) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isVisible"
        class="fixed inset-0 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
        :class="props.zIndex || 'z-50'"
        @click.self="handleBackdropClick"
      >
        <div
          class="modal-crystal w-full flex flex-col rounded-3xl overflow-hidden my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] transition-all relative"
          :class="computedMaxWidth"
        >
          <!-- Borde biselado superior sutil de cristal líquido -->
          <div class="absolute inset-x-12 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none z-30"></div>

          <!-- Botón de cerrar flotante si el modal no cuenta con header -->
          <button
            v-if="(!($slots.header || props.title)) && props.showCloseButton"
            type="button"
            @click="emit('close')"
            class="absolute top-4 right-4 z-20 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            title="Cerrar ventana"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- HEADER: Cristalino, moderno y limpio -->
          <div
            v-if="$slots.header || props.title"
            class="modal-crystal-header text-slate-900 dark:text-white px-6 py-4 flex items-center justify-between shrink-0"
          >
            <div class="flex-1 min-w-0 pr-4">
              <slot name="header">
                <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">{{ props.title }}</h3>
              </slot>
            </div>

            <button
              v-if="props.showCloseButton"
              type="button"
              @click="emit('close')"
              class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              title="Cerrar ventana"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- BODY CON SCROLLBAR ELEGANTE Y RESPONSIVA -->
          <div class="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-purple-200 dark:scrollbar-thumb-purple-900/40">
            <slot />
          </div>

          <!-- FOOTER: Cristalino pinned al fondo con slot #footer -->
          <div
            v-if="$slots.footer"
            class="modal-crystal-footer px-6 py-4 shrink-0 flex items-center justify-between gap-4"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

