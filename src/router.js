// src/router.js
import { createRouter, createWebHistory } from 'vue-router'

// views
import Home from './views/Home.vue'
import Login from './views/login.vue'
import Register from './views/register.vue'
import Dashboard from './views/dashboard.vue'
import Admin from './views/Admin.vue'
import FirebaseRegisterView from './views/FirebaseRegisterView.vue'
import FirebaseSigninView from './views/FirebaseSigninView.vue'
import TablesView from './views/TablesView.vue'
import MapView from './views/MapView.vue'
import BookingView from './views/BookingView.vue'
import EmailCampaigns from './views/EmailCampaigns.vue'

// auth helpers
import { onAuthReady, isAuthenticated, isAuthorized } from './authentication'

const routes = [
  { path: '/',          name: 'home',       component: Home },
  { path: '/login',     name: 'login',      component: Login,    meta: { guestOnly: true } },
  { path: '/register',  name: 'register',   component: Register, meta: { guestOnly: true } },

  { path: '/FireRegister', name: 'FireRegister', component: FirebaseRegisterView, meta: { guestOnly: true } },
  { path: '/FireLogin',    name: 'FireLogin',    component: FirebaseSigninView,  meta: { guestOnly: true } },

  { path: '/tables',    name: 'tables',     component: TablesView },
  { path: '/map',       name: 'map',        component: MapView },

  { path: '/dashboard', name: 'dashboard',  component: Dashboard, meta: { requiresAuth: true } },
  { path: '/admin',     name: 'admin',      component: Admin,     meta: { requiresAuth: true, roles: ['admin'] } },

  // 业务页
  { path: '/booking',           name: 'booking',          component: BookingView },
  { path: '/email-campaigns',   name: 'email-campaigns',  component: EmailCampaigns,
    meta: { requiresAuth: true, roles: ['admin'] } },

  // ⛑️ 通配符必须放在最后！
  { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  await onAuthReady

  const needAuth  = !!to.meta?.requiresAuth
  const guestOnly = !!to.meta?.guestOnly
  const roles     = Array.isArray(to.meta?.roles) ? to.meta.roles : []

  if (guestOnly && isAuthenticated()) return { name: 'home' }
  if (needAuth && !isAuthenticated()) return { name: 'login', query: { redirect: to.fullPath } }
  if (roles.length && !isAuthorized(roles)) return { name: 'home' }

  return true
})

export default router
