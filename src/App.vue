<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppRadialExcepcion from './components/ui/AppRadialExcepcion.vue'
import { useThemeStore } from './stores/themeStore.js'

const route = useRoute()
const isAuthRoute = computed(() => route.name === 'login')

const themeStore = useThemeStore()
themeStore.applyTheme()
</script>

<template>
  <div class="flex min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 selection:bg-purple-100 selection:text-purple-800 transition-colors duration-150">
    <!-- Sidebar -->
    <AppSidebar v-if="!isAuthRoute" />
    
    <!-- Contenido principal -->
    <div class="flex flex-1 flex-col min-w-0 bg-white dark:bg-slate-950">
      <!-- Topbar -->
      <AppNavbar v-if="!isAuthRoute" />
      
      <!-- Área principal -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden bg-white dark:bg-slate-950">
        <router-view v-slot="{ Component, route }">
          <transition name="vista" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Indicador Radial de Habilitaciones Activas -->
    <AppRadialExcepcion />
  </div>
</template>
