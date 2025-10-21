<!-- src/App.vue -->
<template>
  <div class="container py-4">
    <!-- Accessible skip link -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <!-- Top navigation -->
    <section class="hero p-4 mb-4" role="navigation" aria-label="Primary">
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
          <!-- NEW: Booking entry always visible -->
          <router-link class="btn btn-sm btn-outline-light" to="/booking">Booking</router-link>

          <template v-if="auth.user">
            <span class="small text-white-50">Hello, {{ auth.user.name }}</span>

            <router-link class="btn btn-sm btn-light" to="/dashboard">Dashboard</router-link>

            <!-- Optional: email campaigns for admins -->
            <router-link
              v-if="auth.user.role === 'admin'"
              class="btn btn-sm btn-info"
              to="/email-campaigns"
            >
              Email Campaigns
            </router-link>

            <!-- Existing public entry (kept as-is) -->
            <router-link class="btn btn-sm btn-outline-light" to="/email-campaigns">
              Email Campaigns
            </router-link>

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

    <!-- Main content (target of skip link) -->
    <main id="main-content" role="main">
      <!-- NEW: Global online/offline banner -->
      <OnlineBanner />

      <router-view />
    </main>

    <footer class="text-center text-muted small py-3" role="contentinfo">
      © {{ year }} NFP Health Initiative
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { authState as auth, logout } from './authentication'
import OnlineBanner from './components/OnlineBanner.vue'
import { setupOutboxAutoFlush } from './utils/outbox'

const router = useRouter()

function handleLogout () {
  logout()
  router.push('/') // back to home
}

const year = new Date().getFullYear()

// Initialize auto-flush for offline outbox once at app bootstrap
setupOutboxAutoFlush()
</script>

<style scoped>
.hero {
  background: #0d6efd;
  color: #fff;
  border-radius: 1rem;
}

/* Accessibility: visible focus & skip link */
:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 2px;
}
.skip-link {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 10000;
  background: #0d6efd;
  color: #fff;
  padding: .35rem .6rem;
  border-radius: .25rem;
  text-decoration: none;
  transform: translateY(-160%);
  transition: transform .15s ease;
}
.skip-link:focus {
  transform: translateY(0);
}
</style>
