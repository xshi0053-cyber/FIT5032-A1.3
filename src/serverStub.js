// src/serverStub.js


const SUBMIT_KEY  = 'nfp_server_submissions';
const RATINGS_KEY = 'nfp_program_ratings';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const safeParse = (json, fallback = []) => {
  try {
    return JSON.parse(json ?? '');
  } catch {
    return fallback;
  }
};

const readList  = (key)      => safeParse(localStorage.getItem(key), []);
const writeList = (key, arr) => localStorage.setItem(key, JSON.stringify(arr));


function sanitizePlain(text = '') {
  return String(text)
    .replace(/[<>]/g, '')          
    .replace(/javascript:/gi, '')  
    .replace(/on\w+\s*=/gi, '')    
    .trim();
}


export async function submitEnquiryToServer(payload) {
  await delay(600);

  const errors = {};
  const name    = String(payload?.name ?? '').trim();
  const email   = String(payload?.email ?? '').trim();
  const topic   = String(payload?.topic ?? '').trim();
  const message = String(payload?.message ?? '');


  if (!name)  errors.name  = 'Server: name is required.';
  if (!email) errors.email = 'Server: email is required.';
  if (!topic) errors.topic = 'Server: topic is required.';

  if (message.length > 500) {
    errors.message = 'Server: message exceeds 500 characters.';
  }
  if (/https?:\/\/\S+/i.test(message)) {
    errors.message = (errors.message ? errors.message + ' ' : '') + 'Server: URLs are not allowed.';
  }


  const submits = readList(SUBMIT_KEY);
  const duplicate = submits.find(
    x => x.email === email && x.topic === topic && (Date.now() - x.createdAt) < 2 * 60 * 1000
  );
  if (duplicate) {
    errors._global = 'Server: duplicate submission within 2 minutes.';
  }

  if (Object.keys(errors).length) {
    return Promise.reject({ errors });
  }


  submits.push({
    name:    sanitizePlain(name),
    email:   sanitizePlain(email),
    topic:   sanitizePlain(topic),
    message: sanitizePlain(message),
    createdAt: Date.now(),
  });
  writeList(SUBMIT_KEY, submits);

  return { ok: true };
}


export function getProgramRating(programId, userId) {
  const list  = readList(RATINGS_KEY);
  const items = list.filter(x => x.programId === programId);
  const count = items.length;
  const sum   = items.reduce((s, x) => s + Number(x.stars || 0), 0);
  const avg   = count ? sum / count : 0;
  const my    = userId ? (items.find(x => x.userId === userId)?.stars || 0) : 0;
  return { avg, count, my };
}


export async function submitProgramRating({ programId, userId, stars, comment = '' }) {
  await delay(300);

  const errors = {};
  const s = Number(stars);

  if (!programId) errors._global = 'Server: program id required.';
  if (!userId)    errors._global = (errors._global ? errors._global + ' ' : '') + 'Server: user required.';
  if (!(s >= 1 && s <= 5)) errors.stars = 'Server: rating must be from 1 to 5.';

  if (Object.keys(errors).length) {
    return Promise.reject({ errors });
  }

  const list = readList(RATINGS_KEY);
  const idx  = list.findIndex(x => x.programId === programId && x.userId === userId);

  const entry = {
    programId,
    userId,
    stars: s,
    comment: sanitizePlain(comment),
    createdAt: Date.now(),
  };

  if (idx >= 0) list[idx] = entry;
  else          list.push(entry);

  writeList(RATINGS_KEY, list);

  return getProgramRating(programId, userId);
}
