// src/authentication.js
import { reactive } from 'vue';

export const ADMIN_DOMAIN = 'admin.nfp';

const USERS_KEY = 'nfp_users';
const AUTH_KEY  = 'nfp_auth_user';

/* ---------- utils ---------- */
const safeParse = (json, fb) => { try { return JSON.parse(json ?? ''); } catch { return fb; } };
const readUsers  = () => safeParse(localStorage.getItem(USERS_KEY), []);
const writeUsers = (arr) => localStorage.setItem(USERS_KEY, JSON.stringify(arr || []));
const saveAuthUser = (u) => localStorage.setItem(AUTH_KEY, JSON.stringify(u ?? null));
const isAdminEmail = (email) => String(email || '').toLowerCase().trim().endsWith(`@${ADMIN_DOMAIN}`);

function cryptoId() {
  try {
    return Array.from(crypto.getRandomValues(new Uint32Array(3)))
      .map(n => n.toString(36)).join('');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}


export const authState = reactive({
  user: safeParse(localStorage.getItem(AUTH_KEY), null), // {name, email, role} | null
});

/* ---------- helpers ---------- */
export const isAuthenticated = () => !!authState.user;
export const hasRole        = (role) => !!authState.user && authState.user.role === role;
export const isAuthorized   = (roles = []) =>
  !!authState.user && (roles.length === 0 || roles.includes(authState.user.role));

export const getUsers = () => readUsers();


export function setUserRole(email, role) {
  const users = readUsers();
  const e = String(email || '').toLowerCase().trim();
  const u = users.find(x => x.email === e);
  if (!u) return;

  if (role === 'admin'  && !isAdminEmail(e)) return;
  if (role === 'member' &&  isAdminEmail(e)) return;

  u.role = role;
  writeUsers(users);

 
  if (authState.user && authState.user.email === e) {
    authState.user = { ...authState.user, role: u.role };
    saveAuthUser(authState.user);
  }
}

/* ---------- actions ---------- */
export async function register({ name, email, password }) {
  const users = readUsers();
  const e = String(email || '').toLowerCase().trim();
  if (users.some(u => u.email === e)) throw new Error('Email already exists.');

  const role = isAdminEmail(e) ? 'admin' : 'member';
  const user = {
    id: cryptoId(),
    name: String(name || '').trim(),
    email: e,
    password,
    role,
    createdAt: Date.now(),
  };
  users.push(user);
  writeUsers(users);

  authState.user = { name: user.name, email: user.email, role: user.role };
  saveAuthUser(authState.user);
  return authState.user;
}

export async function login({ email, password }) {
  const users = readUsers();
  const e = String(email || '').toLowerCase().trim();
  const u = users.find(x => x.email === e && x.password === password);
  if (!u) throw new Error('Invalid credentials.');

 
  const expected = isAdminEmail(e) ? 'admin' : 'member';
  if (u.role !== expected) { u.role = expected; writeUsers(users); }

  authState.user = { name: u.name, email: u.email, role: u.role };
  saveAuthUser(authState.user);
  return authState.user;
}

export function logout() {
  authState.user = null;
  saveAuthUser(null);
}

/* ---------- cross-tab sync ---------- */
window.addEventListener('storage', (e) => {
  if (e.key === AUTH_KEY) {
    authState.user = safeParse(e.newValue, null);
  }
});
