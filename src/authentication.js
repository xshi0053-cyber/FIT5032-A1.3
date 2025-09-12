// src/authentication.js
import { reactive } from 'vue'

export const ROLES = { ADMIN: 'admin', MEMBER: 'member' }

export const authState = reactive({
  user: null,   // { id, name, email, role }
  token: null
})

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function hashPassword(plain) {
  const enc = new TextEncoder().encode(plain)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

const LS_USERS   = 'nfp_users'
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
    if (s?.user && s?.token) { authState.user = s.user; authState.token = s.token }
  } catch {}
}


export async function register({ name, email, password }) {
  const users = loadUsers()
  if (users.some(u => u.email === email)) throw new Error('Email already registered.')
  const passwordHash = await hashPassword(password)
  const role = users.length === 0 ? ROLES.ADMIN : ROLES.MEMBER
  const user = { id: uuid(), name, email, passwordHash, role, createdAt: Date.now() }
  users.push(user)
  saveUsers(users)
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export async function login({ email, password }) {
  const users = loadUsers()
  const user = users.find(u => u.email === email)
  if (!user) throw new Error('Invalid email or password.')
  const passwordHash = await hashPassword(password)
  if (passwordHash !== user.passwordHash) throw new Error('Invalid email or password.')

  authState.user  = { id: user.id, name: user.name, email: user.email, role: user.role }
  authState.token = uuid()
  persistSession()
  return authState.user
}

export function logout() {
  authState.user = null
  authState.token = null
  localStorage.removeItem(LS_SESSION)
}

export function isAuthenticated() {
  return !!authState.user && !!authState.token
}
export function hasRole(role) {
  return !!authState.user && authState.user.role === role
}
export function isAuthorized(roles = []) {
  if (!roles.length) return true
  return !!authState.user && roles.includes(authState.user.role)
}


export function getUsers() {
  
  return loadUsers().map(u => ({
    id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt
  }))
}
export function setUserRole(email, role) {
  const users = loadUsers()
  const u = users.find(x => x.email === email)
  if (!u) throw new Error('User not found.')
  u.role = role
  saveUsers(users)
  if (authState.user && authState.user.email === email) {
    authState.user.role = role
    persistSession()
  }
}


restoreSession()
