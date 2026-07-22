import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMpz0rjC2QhCEOD5C03JZVFAiAxTSfsrU",
  authDomain: "treinamentoscmpc.firebaseapp.com",
  projectId: "treinamentoscmpc",
  storageBucket: "treinamentoscmpc.firebasestorage.app",
  messagingSenderId: "1033583878405",
  appId: "1:1033583878405:web:d22e2b7814555b7f85d76c",
  measurementId: "G-F3ZNJ872XP"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
