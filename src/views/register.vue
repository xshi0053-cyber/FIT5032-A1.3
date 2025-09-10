<template>
  <div class="container py-5" style="max-width: 520px;">
    <h1 class="h4 mb-4">Create account</h1>

    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleRegister" novalidate>
          <div class="mb-3">
            <label class="form-label" for="name">Full name</label>
            <input id="name" type="text" v-model.trim="name" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" type="email" v-model.trim="email" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input id="password" type="password" v-model="password" class="form-control" required />
            <div class="form-text">At least 6 characters.</div>
          </div>

          <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
          <div v-if="ok" class="alert alert-success py-2">Registration successful. You can sign in now.</div>

          <button class="btn btn-primary w-100" :disabled="!canSubmit">Create account</button>
        </form>
        <p class="mt-3 mb-0 small">
          Already have an account?
          <router-link to="/login">Sign in</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { register } from '../authentication'

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const ok = ref(false)

const canSubmit = computed(() =>
  name.value.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.value) && password.value.length >= 6
)

async function handleRegister() {
  error.value = ''; ok.value = false
  try {
    await register({ name: name.value, email: email.value, password: password.value })
    ok.value = true
  } catch (e) {
    error.value = e.message || 'Registration failed.'
  }
}
</script>
