// src/firebase/init.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 推荐：从 .env 读取（Vite 变量必须以 VITE_ 开头）
const firebaseConfig = {
  apiKey:        import.meta.env.VITE_FB_API_KEY || 'AIzaSyC6iW6z3ilVnaIbUJmXW5UYCCK3pgVANt4',
  authDomain:    import.meta.env.VITE_FB_AUTH_DOMAIN || 'npf-web-app.firebaseapp.com',
  projectId:     import.meta.env.VITE_FB_PROJECT_ID || 'npf-web-app',
  // 注意：这里必须是 *.appspot.com（桶名），不是 firebasestorage.app（下载域名）
  storageBucket: import.meta.env.VITE_FB_BUCKET || 'npf-web-app.appspot.com',
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID || '796920122315',
  appId:             import.meta.env.VITE_FB_APP_ID || '1:796920122315:web:cb4f13558dc6cbc916044e',
  // measurementId 可留空：仅 Analytics 需要
  // measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// 导出给全站使用
export const db   = getFirestore(app);
export const auth = getAuth(app);

// 如需默认导出 Firestore（对应讲义里的“export default db”）
export default db;
