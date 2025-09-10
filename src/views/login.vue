<template>
  <div class="container py-5" style="max-width: 520px;">
    <h1 class="h4 mb-4">Sign in</h1>

    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleLogin" novalidate>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" type="email" v-model.trim="email" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input id="password" type="password" v-model="password" class="form-control" required />
          </div>

          <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

          <button class="btn btn-primary w-100" :disabled="!email || !password">Sign in</button>
        </form>
        <p class="mt-3 mb-0 small">
          No account?
          <router-link to="/register">Create one</router-link>
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

async function handleLogin() {
  error.value = ''
  try {
    await login({ email: email.value, password: password.value })
    const to = route.query.redirect || '/'
    router.replace(to)
  } catch (e) {
    error.value = e.message || 'Login failed.'
  }
}
</script>
