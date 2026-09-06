import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Load Firebase configuration from environment variables
// Never expose raw secrets or hardcoded API keys in source control
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "smf-ai.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "smf-ai",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "smf-ai.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "255290909772",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:255290909772:web:046710ca7c8265cc46c0e9",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-6VSXXMV3CG"
};

let app;
let auth;
let db;

try {
  // Safe initialization avoiding duplicate instances or missing key crashes
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase client initialization:", e.message);
}

export { auth, db };
export default app;
