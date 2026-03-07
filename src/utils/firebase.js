import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "nephrology-rotation.firebaseapp.com",
  projectId: "nephrology-rotation",
  storageBucket: "nephrology-rotation.firebasestorage.app",
  messagingSenderId: "909467307131",
  appId: "1:909467307131:web:970f57ef238f7b221426de",
};

// Avoid duplicate-app error during Vite HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
