<!-- src/views/FirebaseSigninView.vue -->
<template>
  <main class="container p-4" style="max-width:480px">
    <h2 class="mb-3">Firebase Login</h2>

    <div v-if="user" class="alert alert-success">
      已登录：{{ user.email }}（角色：{{ role }}）
    </div>

    <form @submit.prevent="handleLogin" class="mb-3">
      <div class="mb-2">
        <label class="form-label">Email</label>
        <input v-model="email" type="email" class="form-control" required />
      </div>
      <div class="mb-2">
        <label class="form-label">Password</label>
        <input v-model="password" type="password" class="form-control" required />
      </div>
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-primary" type="submit" :disabled="loading">
          登录
        </button>
        <button class="btn btn-outline-secondary" type="button" @click="handleRegister" :disabled="loading">
          注册（默认 user 角色）
        </button>
        <button class="btn btn-outline-danger ms-auto" type="button" @click="handleLogout" :disabled="!user || loading">
          退出
        </button>
      </div>
      <div v-if="err" class="text-danger mt-2">{{ err }}</div>
    </form>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

const router = useRouter();
const route  = useRoute();

const email = ref('');
const password = ref('');
const loading = ref(false);
const err = ref('');

const user = ref(null);
const role = ref('guest');

onAuthStateChanged(auth, async (u) => {
  user.value = u;
  role.value = 'guest';
  if (u) {
    const snap = await getDoc(doc(db, 'users', u.uid));
    role.value = snap.exists() ? (snap.data().role || 'user') : 'user';
  }
});

async function handleLogin() {
  try {
    loading.value = true; err.value = '';
    await signInWithEmailAndPassword(auth, email.value, password.value);
    const redirect = route.query.redirect || '/dashboard';
    router.push(redirect);
  } catch (e) {
    err.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  try {
    loading.value = true; err.value = '';
    const { user: u } = await createUserWithEmailAndPassword(auth, email.value, password.value);
    await setDoc(doc(db, 'users', u.uid), {
      email: email.value,
      role: 'user',          
      createdAt: serverTimestamp()
    });
    router.push('/dashboard');
  } catch (e) {
    err.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  await signOut(auth);
}
</script>
