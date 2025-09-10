// src/auth.js
import { reactive } from 'vue'


export const authState = reactive({
  user: null,         // { id, email, name }
  token: null         
})


async function hashPassword(plain) {
  const enc = new TextEncoder().encode(plain)
  const buf = await crypto.subtle.digest('SHA-256', enc)

  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('')
}


const LS_USERS = 'nfp_users'
const LS_SESSION = 'nfp_session'

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS)) ?? [] } catch { return [] }
}
function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users))
}

function persistSession() {
  localStorage.setItem(LS_SESSION, JSON.stringify({ user: authState.user, token: authState.token }))
}
function restoreSession() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_SESSION))
    if (s?.user && s?.token) {
      authState.user = s.user
      authState.token = s.token
    }
  } catch {}
}


export async function register({ name, email, password }) {
  const users = loadUsers()
  if (users.some(u => u.email === email)) throw new Error('Email already registered.')
  const passwordHash = await hashPassword(password)
  const user = { id: crypto.randomUUID(), name, email, passwordHash, createdAt: Date.now() }
  users.push(user)
  saveUsers(users)
  return { id: user.id, name: user.name, email: user.email }
}

export async function login({ email, password }) {
  const users = loadUsers()
  const user = users.find(u => u.email === email)
  if (!user) throw new Error('Invalid email or password.')
  const passwordHash = await hashPassword(password)
  if (passwordHash !== user.passwordHash) throw new Error('Invalid email or password.')
  authState.user = { id: user.id, name: user.name, email: user.email }
  authState.token = crypto.randomUUID()
  persistSession()
  return authState.user
}

export function logout() {
  authState.user = null
  authState.token = null
  localStorage.removeItem(LS_SESSION)
}

export function isAuthenticated() {
  return !!authState.token && !!authState.user
}


restoreSession()
