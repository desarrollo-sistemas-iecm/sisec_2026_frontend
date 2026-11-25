import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import ProgramacionView from '../views/ProgramacionView.vue'
import CapturaView from '../views/CapturaView.vue'
import EncuestaView from '../views/EncuestaView.vue'
import ReportesView from '../views/ReportesView.vue'
import AdministracionView from '../views/AdministracionView.vue'
import NotificacionesView from '../views/NotificacionesView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { requiresAuth: false } },
  { path: '/', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true, roles: [2, 3] } },
  { path: '/programacion', name: 'programacion', component: ProgramacionView, meta: { requiresAuth: true, roles: [1, 2, 3] } },
  { path: '/captura', name: 'captura', component: CapturaView, meta: { requiresAuth: true, roles: [1, 2, 3] } },
  { path: '/encuesta', name: 'encuesta', component: EncuestaView, meta: { requiresAuth: true, roles: [1, 2, 3] } },
  { path: '/reportes', name: 'reportes', component: ReportesView, meta: { requiresAuth: true, roles: [1, 2, 3] } },
  { path: '/notificaciones', name: 'notificaciones', component: NotificacionesView, meta: { requiresAuth: true, roles: [1, 2, 3] } },
  { 
    path: '/administracion', 
    name: 'administracion', 
    component: AdministracionView, 
    meta: { requiresAuth: true, roles: [2, 3] },
    redirect: (to) => {
      const authStore = useAuthStore()
      const permiso = Number(authStore.user?.permiso || authStore.user?.idpermiso || 1)
      return permiso === 3 ? '/administracion/usuarios' : '/administracion/restricciones'
    },
    children: [
      { path: 'usuarios', name: 'admin-usuarios', component: () => import('../views/admin/UsuariosView.vue'), meta: { roles: [3] } },
      { path: 'restricciones', name: 'admin-restricciones', component: () => import('../views/admin/RestriccionesView.vue'), meta: { roles: [2, 3] } },
      { path: 'archivos', name: 'admin-archivos', component: () => import('../views/admin/ArchivosView.vue'), meta: { roles: [2, 3] } },
      { path: 'formatos', name: 'admin-formatos', component: () => import('../views/admin/FormatosView.vue'), meta: { roles: [3] } },
      { path: 'cursos', name: 'admin-cursos', component: () => import('../views/admin/CursosView.vue'), meta: { roles: [2, 3] } },
      { path: 'mensajes', name: 'admin-mensajes', component: () => import('../views/admin/MensajesPredeterminadosView.vue'), meta: { roles: [3] } },
      { path: 'telegram', name: 'admin-telegram', component: () => import('../views/admin/TelegramConfigView.vue'), meta: { roles: [3] } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const moduleRouteOrder = [
  { mod: 'dashboard', name: 'dashboard' },
  { mod: 'programacion', name: 'programacion' },
  { mod: 'captura', name: 'captura' },
  { mod: 'encuestas', name: 'encuesta' },
  { mod: 'reportes', name: 'reportes' },
  { mod: 'administracion', name: 'administracion' }
]

const routeToModuleMap = {
  dashboard: 'dashboard',
  programacion: 'programacion',
  captura: 'captura',
  encuesta: 'encuestas',
  reportes: 'reportes',
  administracion: 'administracion',
  'admin-usuarios': 'administracion',
  'admin-restricciones': 'administracion',
  'admin-archivos': 'administracion',
  'admin-formatos': 'administracion',
  'admin-cursos': 'administracion',
  'admin-mensajes': 'administracion',
  'admin-telegram': 'administracion'
}

router.beforeEach((to) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }
  
  if (to.name === 'login' && authStore.isAuthenticated) {
    const firstAllowed = moduleRouteOrder.find(item => authStore.hasModulo(item.mod))
    return firstAllowed ? { name: firstAllowed.name } : { name: 'programacion' }
  }

  // Verificación de acceso por módulo asignado
  if (authStore.isAuthenticated && routeToModuleMap[to.name]) {
    const requiredModule = routeToModuleMap[to.name]
    if (!authStore.hasModulo(requiredModule)) {
      const firstAllowed = moduleRouteOrder.find(item => authStore.hasModulo(item.mod))
      return firstAllowed ? { name: firstAllowed.name } : { name: 'login' }
    }
  }

  // Verificación adicional de roles (si está definido en la ruta)
  if (to.meta.roles && authStore.isAuthenticated) {
    const userPermiso = Number(authStore.user?.permiso || authStore.user?.idpermiso)
    if (!to.meta.roles.includes(userPermiso)) {
      const firstAllowed = moduleRouteOrder.find(item => authStore.hasModulo(item.mod))
      return firstAllowed ? { name: firstAllowed.name } : { name: 'login' }
    }
  }

  return true
})

export default router
