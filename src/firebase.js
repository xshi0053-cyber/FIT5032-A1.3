// src/firebase.js
import {initializeApp, getApps, getApp} from "firebase/app";
import {getAuth, connectAuthEmulator} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

/**
 * Firebase config for project: npf-web-app
 * NOTE: Public web keys are safe to ship; security is enforced by rules.
 */
const firebaseConfig = {
  apiKey: "AIzaSyC6iW6z3ilVnaIbUJmXW5UYCCK3pgVANt4",
  authDomain: "npf-web-app.firebaseapp.com",
  projectId: "npf-web-app",
  storageBucket: "npf-web-app.appspot.com",
  messagingSenderId: "796920122315",
  appId: "1:796920122315:web:cb4f13558dc6cbc916044e",
  measurementId: "G-1VNC53VKRP",
};

/** Avoid re-initializing during HMR */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Optional: connect to local emulators during development.
 * Enable by setting VITE_USE_EMULATORS=true in .env.local
 */
const useEmu = import.meta?.env?.VITE_USE_EMULATORS === "true";
if (import.meta?.env?.DEV && useEmu) {
  try {
    // Firestore emulator (default port 8080)
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch (_) {
    // ignore if already connected
  }
  try {
    // Auth emulator (default port 9099)
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {disableWarnings: true});
  } catch (_) {
    // ignore if already connected
  }
}

const firebaseExports = {app, auth, db};
export default firebaseExports;
