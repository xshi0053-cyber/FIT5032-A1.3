import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'          
import Login from './views/login.vue'
import Register from './views/register.vue'
import Dashboard from './views/dashboard.vue'
import Admin from './views/Admin.vue'
import { isAuthenticated, isAuthorized } from './authentication'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
  { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: Admin, meta: { requiresAuth: true, roles: ['admin'] } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && isAuthenticated()) {
    return { name: 'home' }
  }
  if (to.meta.roles && !isAuthorized(to.meta.roles)) {
    return { name: 'home' }
  }
})

export default router
