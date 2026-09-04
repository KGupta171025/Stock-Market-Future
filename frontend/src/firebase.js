import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "stock-market-future.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "stock-market-future",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "stock-market-future.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "967571762986",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:967571762986:web:c3d29ecfc19eac25927853",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-XYXN6TL8P4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
