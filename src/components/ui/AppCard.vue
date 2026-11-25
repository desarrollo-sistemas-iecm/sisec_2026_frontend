<script setup>
defineProps({
  noPadding: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="card-iecm overflow-hidden transition-colors duration-200">
    <div v-if="$slots.header" class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-slate-800 dark:bg-slate-900/60 dark:border-white/10 dark:text-slate-100">
      <slot name="header"></slot>
    </div>
    
    <div :class="['px-5 py-5', { 'p-0': noPadding }]">
      <slot></slot>
    </div>
    
    <div v-if="$slots.footer" class="border-t border-slate-200/80 bg-slate-50/60 px-5 py-3 text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
