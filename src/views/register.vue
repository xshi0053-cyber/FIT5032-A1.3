<template>
  <div class="container py-5">
    <!-- Header / Hero -->
    <section class="hero p-3 mb-4 text-center" style="background:#0d6efd;color:#fff;border-radius:1rem;">
      <div class="d-flex justify-content-center align-items-center gap-2 flex-wrap">
        <h1 class="h5 mb-0">NFP Health Initiative</h1>
        <div class="ms-2 d-flex gap-2">
          <router-link class="btn btn-sm btn-light" to="/">Home</router-link>
          <router-link class="btn btn-sm btn-light" to="/login">Sign in</router-link>
          <router-link class="btn btn-sm btn-outline-light" to="/register">Register</router-link>
        </div>
      </div>
    </section>

    <h2 class="h5 text-center mb-3">Create account</h2>

    <!-- Teacher/marker note about admin email domain -->
    <div class="alert alert-info py-2 small mb-3 text-center">
      Marker note: use an email ending with
      <code>@{{ ADMIN_DOMAIN }}</code>
      to create an <b>admin</b> account. Otherwise the role will be <b>member</b>.
    </div>

    <div class="mx-auto" style="max-width:520px;">
      <div class="card">
        <div class="card-body">
          <form @submit.prevent="handleRegister" novalidate>
            <!-- name -->
            <div class="mb-3">
              <label class="form-label" for="name">Full name</label>
              <input
                id="name"
                class="form-control"
                type="text"
                v-model.trim="name"
                :aria-invalid="!!fieldErrors.name"
              />
              <div class="invalid-feedback d-block" v-if="fieldErrors.name">
                {{ fieldErrors.name }}
              </div>
            </div>

            <!-- email -->
            <div class="mb-3">
              <label class="form-label" for="email">Email</label>
              <input
                id="email"
                class="form-control"
                type="email"
                v-model.trim="email"
                :aria-invalid="!!fieldErrors.email"
              />
              <div class="form-text">
                Tip: to register an <b>admin</b>, use an email that ends with
                <code>@{{ ADMIN_DOMAIN }}</code>.
              </div>
              <div class="invalid-feedback d-block" v-if="fieldErrors.email">
                {{ fieldErrors.email }}
              </div>
            </div>

            <!-- password -->
            <div class="mb-3">
              <label class="form-label" for="password">Password</label>
              <input
                id="password"
                class="form-control"
                type="password"
                v-model="password"
                autocomplete="new-password"
                :aria-invalid="!!fieldErrors.password"
              />
              <div class="form-text">At least 6 characters.</div>
              <div class="invalid-feedback d-block" v-if="fieldErrors.password">
                {{ fieldErrors.password }}
              </div>
            </div>

            <div class="d-grid gap-2">
              <button class="btn btn-primary" :disabled="loading">
                {{ loading ? 'Creating…' : 'Create account' }}
              </button>
              <router-link class="small text-center" to="/login">
                Already have an account? <b>Sign in</b>
              </router-link>
            </div>

            <div class="alert alert-danger mt-3 py-2 mb-0" v-if="error">
              {{ error }}
            </div>
          </form>
        </div>
      </div>

      <p class="text-center text-muted small mt-3">
        © {{ year }} NFP Health Initiative
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { register as doRegister, ADMIN_DOMAIN } from '../authentication'

const router = useRouter()
const route = useRoute()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({ name: '', email: '', password: '' })
const year = new Date().getFullYear()

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

function validate() {
  fieldErrors.value = { name: '', email: '', password: '' }

  if (!name.value || name.value.trim().length < 2) {
    fieldErrors.value.name = 'Please enter at least 2 characters.'
  }
  if (!emailRegex.test(email.value)) {
    fieldErrors.value.email = 'Please enter a valid email address.'
  }
  if (!password.value || password.value.length < 6) {
    fieldErrors.value.password = 'Password must be at least 6 characters.'
  }

  return !Object.values(fieldErrors.value).some(Boolean)
}

async function handleRegister() {
  error.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await doRegister({
      name: name.value,
      email: email.value,
      password: password.value
    })
    // success → go back to redirect or home
    const redirect = route.query.redirect || '/'
    router.push(String(redirect))
  } catch (e) {
    error.value = e?.message || 'Failed to create account.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.hero { border-radius: 1rem; }
</style>
