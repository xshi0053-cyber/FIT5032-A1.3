// src/authentication.js
// 统一鉴权与用户管理工具

import { reactive } from 'vue';
import { auth, db } from './firebase'; // ← 与你的 src/firebase.js 对齐

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query as fsQuery,
  orderBy as fsOrderBy,
  limit as fsLimit,
  startAfter as fsStartAfter,
  where as fsWhere,
  updateDoc,
} from 'firebase/firestore';

// =================== 常量与状态 ===================

// 管理员邮箱域名（满足 D.1：特定域名自动授予 admin）
export const ADMIN_DOMAIN = (import.meta.env.VITE_ADMIN_DOMAIN || 'monash.edu').toLowerCase();

// 首轮鉴权就绪 Promise（main.js / router.js 会等待它）
let _resolveReady;
export const onAuthReady = new Promise((r) => (_resolveReady = r));

// 响应式鉴权状态
export const authState = reactive({
  ready: false,   // 首轮 onAuthStateChanged 完成
  user: null,     // Firebase User
  role: 'member', // 标准化为小写
  profile: null,  // Firestore 用户档案
});

// 统一规范化：角色转小写（容错）
function normalizeRole(r) {
  if (!r) return 'member';
  return String(r).trim().toLowerCase();
}

// 监听登录状态变化
onAuthStateChanged(auth, async (fbUser) => {
  authState.user = fbUser;
  authState.role = 'member';
  authState.profile = null;

  if (fbUser) {
    const snap = await getDoc(doc(db, 'users', fbUser.uid));
    if (snap.exists()) {
      const data = snap.data() || {};
      authState.profile = data;

      // 支持 profile.role 或 profile.roles（数组）两种形态
      let role = 'member';
      if (Array.isArray(data.roles) && data.roles.length) {
        role = data.roles[0]; // 取第一个
      } else if (data.role) {
        role = data.role;
      }
      authState.role = normalizeRole(role);
    }
  }

  authState.ready = true;
  _resolveReady?.();
  _resolveReady = null;
});

// =================== 工具函数 ===================

export function isAuthenticated() {
  return !!authState.user;
}

/**
 * 角色判断：大小写无关；支持用户文档为 role:string 或 roles:string[]
 */
export function isAuthorized(allowedRoles = []) {
  // 未指定角色要求时，认为通过
  if (!allowedRoles || !allowedRoles.length) return true;
  if (!authState.user) return false;

  const allow = allowedRoles.map(normalizeRole);

  // 用户当前角色（优先 profile.roles）
  const userRoles = [];
  if (Array.isArray(authState?.profile?.roles)) {
    userRoles.push(...authState.profile.roles.map(normalizeRole));
  }
  userRoles.push(normalizeRole(authState.role));

  // 只要有一个匹配即可
  return userRoles.some((r) => allow.includes(r));
}

// 兼容旧代码
export function hasRole(role) {
  if (!role) return true;
  return isAuthorized([role]);
}
export function hasAnyRole(roles = []) {
  return isAuthorized(roles);
}

export function getCurrentUser() {
  return authState.user;
}
export function getCurrentRole() {
  return authState.role;
}

// =================== 业务：注册 / 登录 / 退出 ===================

export async function register({ name, email, password }) {
  // 1) Auth 创建账号
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // 2) 展示名（可选）
  try { await updateProfile(user, { displayName: name }); } catch {}

  // 3) 依据邮箱域名自动角色（小写）
  const isAdmin = email.toLowerCase().endsWith(`@${ADMIN_DOMAIN}`);
  const role = normalizeRole(isAdmin ? 'admin' : 'member');

  // 4) Firestore 写入用户档案（统一小写）
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    name,
    role,
    createdAt: serverTimestamp(),
  });

  // 5) 可选：发送验证邮件（失败忽略）
  try { await sendEmailVerification(user); } catch {}

  return { user, role };
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

// =================== Admin：读取用户（分页 / 全量） ===================

export async function getUsers({ pageSize = 20, cursor = null } = {}) {
  const col = collection(db, 'users');

  // 按 email 升序，避免 createdAt 缺失带来的查询问题
  let q = fsQuery(col, fsOrderBy('email', 'asc'), fsLimit(pageSize));
  if (cursor) {
    q = fsQuery(col, fsOrderBy('email', 'asc'), fsStartAfter(cursor), fsLimit(pageSize));
  }

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

  return { items, cursor: nextCursor };
}

// 小规模作业：一次性拉全量（演示够用）
export async function listUsers() {
  const { items } = await getUsers({ pageSize: 200 });
  return items;
}

// ===== Admin：按 email 修改用户角色 =====
// 规则：邮箱以 @ADMIN_DOMAIN 结尾的账号，不允许降级为 member
export async function setUserRole(email, role) {
  const mail = (email || '').toLowerCase();
  const nextRole = normalizeRole(role);

  if (nextRole !== 'admin' && mail.endsWith(`@${ADMIN_DOMAIN}`)) {
    throw new Error(`域名为 @${ADMIN_DOMAIN} 的账号必须保持 admin，无法降级。`);
  }

  // 找到该 email 对应的用户文档
  const col = collection(db, 'users');
  const q = fsQuery(col, fsWhere('email', '==', mail), fsLimit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('未找到该用户');

  // 更新角色（统一小写）
  const docRef = snap.docs[0].ref;
  await updateDoc(docRef, { role: nextRole });

  // 如果改的是当前登录用户，则同步到本地状态，避免需要刷新
  if (authState.user && authState.user.uid === snap.docs[0].id) {
    authState.role = nextRole;
    if (authState.profile) authState.profile.role = nextRole;
  }

  return { id: snap.docs[0].id, email: mail, role: nextRole };
}
