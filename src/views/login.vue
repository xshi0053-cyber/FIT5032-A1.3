<template>
  <div class="container py-5" style="max-width:520px;">
    <h1 class="h4 mb-4">Sign in</h1>

    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleLogin" novalidate>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input
              id="email"
              type="email"
              v-model.trim="email"
              class="form-control"
              autocomplete="email"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input
              id="password"
              type="password"
              v-model="password"
              class="form-control"
              autocomplete="current-password"
              required
            />
          </div>

          <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

          <button class="btn btn-primary w-100" :disabled="submitting || !email || !password">
            <span v-if="submitting">Signing in…</span>
            <span v-else>Sign in</span>
          </button>
        </form>

        <p class="mt-3 mb-0 small">
          No account? <router-link to="/register">Create one</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { login } from '../authentication'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleLogin() {
  error.value = ''
  submitting.value = true
  try {
    // ✅ 传入两个“字符串”参数，而不是对象
    await login(email.value.trim(), password.value)

    const to = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(to)
  } catch (e) {
    error.value = e?.message || 'Login failed.'
  } finally {
    submitting.value = false
  }
}
</script>
