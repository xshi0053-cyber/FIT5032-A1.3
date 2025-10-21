<!-- src/views/FirebaseRegisterView.vue -->
<template>
  <main class="container py-5" style="max-width:520px">
    <h1 class="h5 mb-3">Create an Account (Firebase Demo)</h1>

    <p class="mb-2">
      <input type="text" class="form-control" placeholder="Email" v-model="email" />
    </p>
    <p class="mb-2">
      <input type="password" class="form-control" placeholder="Password" v-model="password" />
    </p>
    <p>
      <button class="btn btn-primary" @click="register" :disabled="loading">
        {{ loading ? 'Saving…' : 'Save to Firebase' }}
      </button>
    </p>

    <p class="text-danger" v-if="err">{{ err }}</p>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase' // 复用你的 firebase.js
import { createUserWithEmailAndPassword } from 'firebase/auth'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const err = ref('')

const register = async () => {
  err.value = ''
  loading.value = true
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value)
    console.log('Firebase Register Successful!')
    router.push('/login') // 按教程注册成功后跳到登录
  } catch (e) {
    console.log(e.code || e.message)
    err.value = e.code || e.message
  } finally {
    loading.value = false
  }
}
</script>
