<template>
  <div class="container py-4">
    <section class="hero p-4 mb-4">
      <div class="d-flex flex-column flex-md-row align-items-md-center gap-3">
        <div class="flex-grow-1">
          <h1 class="h3 mb-0">NFP Health Initiative</h1>
        </div>

        <div class="ms-md-auto d-flex align-items-center gap-2">
          <template v-if="auth.user">
            <span class="small">Hello, {{ auth.user.name }}</span>
            <router-link class="btn btn-sm btn-light" to="/dashboard">Dashboard</router-link>
            <router-link v-if="hasRole('admin')" class="btn btn-sm btn-warning" to="/admin">Admin</router-link>
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
      <span>© {{ year }} NFP Health Initiative</span>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { authState as auth, logout, hasRole } from './authentication'

const year = new Date().getFullYear()
const router = useRouter()
function handleLogout() { logout(); router.push('/') }
</script>
