// src/serverStub.js

const SUBMIT_KEY  = 'nfp_server_submissions';
const RATINGS_KEY = 'nfp_program_ratings';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const readList  = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const writeList = (key, arr) => localStorage.setItem(key, JSON.stringify(arr || []));


function sanitizePlain(text = '') {
  return String(text)
    .replace(/<[^>]*>/g, '')          
    .replace(/javascript:/gi, '')     
    .replace(/on\w+\s*=/gi, '')       
    .trim();
}


export async function submitEnquiryToServer(payload) {
  await delay(600);

  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const tagRegex   = /<[^>]*>/;
  const urlRegex   = /https?:\/\/\S+/i;
  const repeat3    = /(.)\1{2,}/;

  const name    = String(payload?.name ?? '').trim();
  const email   = String(payload?.email ?? '').trim();
  const topic   = String(payload?.topic ?? '').trim();
  const message = String(payload?.message ?? '');

  
  if (!name)  errors.name  = 'Server: name is required.';
  if (!email || !emailRegex.test(email)) errors.email = 'Server: valid email required.';
  if (!topic) errors.topic = 'Server: topic is required.';

  
  if (!message) errors.message = 'Server: message is required.';
  if (tagRegex.test(message))  errors.message = appendErr(errors.message, 'Server: HTML is not allowed.');
  if (urlRegex.test(message))  errors.message = appendErr(errors.message, 'Server: URLs are not allowed.');
  if (repeat3.test(message))   errors.message = appendErr(errors.message, 'Server: avoid repeated characters.');
  if (message.length < 20)     errors.message = appendErr(errors.message, 'Server: message must be at least 20 characters.');
  if (message.length > 500)    errors.message = appendErr(errors.message, 'Server: message exceeds 500 characters.');

  
  const list = readList(SUBMIT_KEY);
  const dup  = list.find(x => x.email === email && x.topic === topic && (Date.now() - x.createdAt < 2 * 60 * 1000));
  if (dup) errors._global = 'Server: duplicate submission within 2 minutes.';

  if (Object.keys(errors).length) throw { errors };

  
  list.push({
    name: sanitizePlain(name),
    email: sanitizePlain(email),
    topic: sanitizePlain(topic),
    message: sanitizePlain(message),
    createdAt: Date.now()
  });
  writeList(SUBMIT_KEY, list);

  return { ok: true };
}

function appendErr(prev, msg) { return prev ? `${prev} ${msg}` : msg; }


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
    updatedAt: Date.now()
  };

  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push({ ...entry, createdAt: Date.now() });

  writeList(RATINGS_KEY, list);
  return getProgramRating(programId, userId);
}
