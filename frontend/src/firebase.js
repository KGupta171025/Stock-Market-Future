import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "",
  authDomain: "stock-market-future.firebaseapp.com",
  projectId: "stock-market-future",
  storageBucket: "stock-market-future.firebasestorage.app",
  messagingSenderId: "967571762986",
  appId: "1:967571762986:web:c3d29ecfc19eac25927853",
  measurementId: "G-XYXN6TL8P4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
