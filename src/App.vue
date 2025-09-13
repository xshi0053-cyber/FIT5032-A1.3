<template>
  <div class="container py-4">
    
    <section class="hero p-4 mb-4">
      <div class="d-flex flex-column flex-md-row align-items-md-center gap-3">
        <div class="flex-grow-1">
          
          <h1 class="h3 mb-0">
            <router-link to="/" class="text-white text-decoration-none">
              NFP Health Initiative
            </router-link>
          </h1>
        </div>

        
        <div class="ms-md-auto d-flex align-items-center gap-2">
          
          <router-link class="btn btn-sm btn-outline-light" to="/">Home</router-link>

          <template v-if="auth.user">
            <span class="small">Hello, {{ auth.user.name }}</span>
            <router-link class="btn btn-sm btn-light" to="/dashboard">Dashboard</router-link>
            <router-link
              v-if="auth.user.role === 'admin'"
              class="btn btn-sm btn-warning"
              to="/admin"
            >
              Admin
            </router-link>
            <button class="btn btn-sm btn-outline-light" @click="handleLogout">Logout</button>
          </template>

          <template v-else>
            <router-link class="btn btn-sm btn-light" to="/login">Sign in</router-link>
            <router-link class="btn btn-sm btn-outline-light" to="/register">Register</router-link>
          </template>
        </div>
      </div>
    </section>

    
    <router-view />

    <footer class="text-center text-muted small py-3">
      © {{ year }} NFP Health Initiative
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authState as auth, logout } from './authentication'

const router = useRouter()

function handleLogout() {
  logout()
  router.push('/')          
}

const year = new Date().getFullYear()


</script>

<style scoped>
.hero { background: #0d6efd; color: #fff; border-radius: 1rem; }
</style>
