import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "",
  authDomain: "smf-ai.firebaseapp.com",
  projectId: "smf-ai",
  storageBucket: "smf-ai.firebasestorage.app",
  messagingSenderId: "255290909772",
  appId: "1:255290909772:web:046710ca7c8265cc46c0e9",
  measurementId: "G-6VSXXMV3CG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
