import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // Inicialización: Por defecto MODO OSCURO
  if (localStorage.getItem('theme_initialized_light')) {
    localStorage.removeItem('theme_initialized_light')
  }

  if (!localStorage.getItem('theme_initialized_dark_v1')) {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('theme_initialized_dark_v1', '1')
  }

  const isDark = ref(localStorage.getItem('theme') !== 'light')

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
  }

  return {
    isDark,
    toggleTheme,
    applyTheme
  }
})
