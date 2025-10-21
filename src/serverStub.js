// src/serverStub.js

// ========== 本地存储键 ==========
const SUBMIT_KEY  = 'nfp_server_submissions';
const RATINGS_KEY = 'nfp_program_ratings';

// ========== 小工具 ==========
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const readList  = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const writeList = (key, arr) => localStorage.setItem(key, JSON.stringify(arr || []));

function sanitizePlain(text = '') {
  return String(text)
    .replace(/<[^>]*>/g, '')          // 去标签
    .replace(/javascript:/gi, '')     // 去协议注入
    .replace(/on\w+\s*=/gi, '')       // 去事件注入
    .trim();
}
function appendErr(prev, msg) { return prev ? `${prev} ${msg}` : msg; }

// ========== E.1: 提交表单（优先云函数，失败回退本地） ==========
export async function submitEnquiryToServer(payload = {}) {
  // 轻量校验
  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const tagRegex   = /<[^>]*>/;
  const urlRegex   = /https?:\/\/\S+/i;
  const repeat3    = /(.)\1{2,}/;

  const name    = String(payload.name ?? '').trim();
  const email   = String(payload.email ?? '').trim();
  // 统一传参：program（旧字段 topic 仍兼容）
  const program = String(payload.program ?? payload.topic ?? '').trim();
  const message = String(payload.message ?? '');
  const consent = !!payload.consent;

  if (!name)  errors.name  = 'Server: name is required.';
  if (!email || !emailRegex.test(email)) errors.email = 'Server: valid email required.';
  if (!program) errors.program = 'Server: program is required.';
  if (!message) errors.message = 'Server: message is required.';
  if (tagRegex.test(message))  errors.message = appendErr(errors.message, 'Server: HTML is not allowed.');
  if (urlRegex.test(message))  errors.message = appendErr(errors.message, 'Server: URLs are not allowed.');
  if (repeat3.test(message))   errors.message = appendErr(errors.message, 'Server: avoid repeated characters.');
  if (message.length < 20)     errors.message = appendErr(errors.message, 'Server: message must be at least 20 characters.');
  if (message.length > 500)    errors.message = appendErr(errors.message, 'Server: message exceeds 500 characters.');

  // 2分钟去重（按 email + program）
  const list = readList(SUBMIT_KEY);
  const dup  = list.find(
    x => x.email === email && (x.program || x.topic) === program && (Date.now() - (x.createdAt || 0) < 2 * 60 * 1000)
  );
  if (dup) errors._global = 'Server: duplicate submission within 2 minutes.';

  if (Object.keys(errors).length) throw { errors };

  // 统一构造本地写入记录（无论云/本地）
  const makeRecord = (source = 'local') => ({
    name:    sanitizePlain(name),
    email:   sanitizePlain(email),
    program: sanitizePlain(program),   // ✅ 与表格列对齐
    topic:   sanitizePlain(program),   // ✅ 兼容旧字段（仅为历史读取）
    consent: !!consent,                // ✅ 新增字段
    message: sanitizePlain(message),
    createdAt: Date.now(),
    source,
  });

  // 先尝试云函数（可选）
  const url = import.meta.env.VITE_CF_SUBMIT_URL;
  if (url) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, program, message, consent }),
      });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) throw (data || { message: res.statusText || 'Server error' });

      // 成功则本地也写一份，保证 /tables 可见
      list.push(makeRecord('cloud'));
      writeList(SUBMIT_KEY, list);

      // 广播“已创建”事件（表格页自动刷新）
      window.dispatchEvent(new CustomEvent('enquiry:created'));
      return data || { ok: true };
    } catch (e) {
      console.warn('Cloud Function failed, fallback to local.', e);
      // 继续回退到本地
    }
  }

  // 回退：本地写入
  await delay(300);
  list.push(makeRecord('local'));
  writeList(SUBMIT_KEY, list);

  // 广播“已创建”事件（表格页自动刷新）
  window.dispatchEvent(new CustomEvent('enquiry:created'));

  return { ok: true, fallback: true };
}

// ========== D.3 评分（本地） ==========
export function getProgramRating(programId, userId) {
  const list  = readList(RATINGS_KEY);
  const items = list.filter(x => x.programId === programId);
  const count = items.length;
  const avg   = count ? items.reduce((s, x) => s + Number(x.stars || 0), 0) / count : 0;
  const my    = (items.find(x => x.userId === userId) || {}).stars || 0;
  return { avg, count, my };
}

export async function submitProgramRating({ programId, userId, stars, comment = '' }) {
  await delay(300);

  const errors = {};
  const s = Number(stars);
  if (!programId) errors._global = appendErr(errors._global, 'Server: program id required.');
  if (!userId)    errors._global = appendErr(errors._global, 'Server: user id required.');
  if (!(s >= 1 && s <= 5)) errors.stars = 'Server: rating must be from 1 to 5.';
  if (/<[^>]*>/.test(comment || '')) errors.comment = 'Server: HTML not allowed in comment.';
  if (Object.keys(errors).length) throw { errors };

  const list = readList(RATINGS_KEY);
  const idx  = list.findIndex(x => x.programId === programId && x.userId === userId);

  const entry = {
    programId,
    userId,
    stars: s,
    comment: sanitizePlain(comment),
    updatedAt: Date.now(),
  };

  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push({ ...entry, createdAt: Date.now() });

  writeList(RATINGS_KEY, list);
  return getProgramRating(programId, userId);
}

// ========== 表格读取：原始+规范化 ==========
export function getLocalSubmissions() {
  return readList(SUBMIT_KEY);
}

export function getLocalSubmissionsNormalized() {
  const rows = getLocalSubmissions();
  return (rows || []).map(x => ({
    timeStr : new Date(x.createdAt || Date.now()).toLocaleString(),
    name    : x.name || '',
    email   : x.email || '',
    program : x.program || x.topic || '-',
    consent : typeof x.consent === 'boolean' ? (x.consent ? 'Yes' : 'No') : '-',
    message : x.message || '',
    _raw    : x, // 调试用（可删除）
  }));
}
