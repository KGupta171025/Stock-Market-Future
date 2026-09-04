import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile document in Firestore
  const syncUserProfile = async (firebaseUser) => {
    if (!firebaseUser?.uid || !db) return null;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const initialProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Investor'),
          photoURL: firebaseUser.photoURL || null,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          currency: 'INR',
          watchlist: ['RELIANCE', 'TCS', 'HDFCBANK', 'NIFTY 50', 'SENSEX'],
          preferences: {
            chartType: 'candlestick',
            timeframe: '1day',
          },
        };
        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);
        return initialProfile;
      } else {
        const data = userSnap.data();
        await updateDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
        });
        setUserProfile(data);
        return data;
      }
    } catch (err) {
      console.warn('Firestore profile sync note (check rules if permission denied):', err);
      return null;
    }
  };

  useEffect(() => {
    // Check for demo/guest session in localStorage
    const savedDemoUser = localStorage.getItem('stock_market_demo_user');
    if (savedDemoUser) {
      try {
        const parsed = JSON.parse(savedDemoUser);
        setUser(parsed);
        setUserProfile(parsed);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('stock_market_demo_user');
      }
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          localStorage.removeItem('stock_market_demo_user');
          await syncUserProfile(firebaseUser);
        } else if (!savedDemoUser) {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } catch (e) {
      console.warn('Firebase auth initialization note:', e);
      setLoading(false);
    }
  }, []);

  const signup = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
    return cred;
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
    return cred;
  };

  const logout = async () => {
    localStorage.removeItem('stock_market_demo_user');
    setUser(null);
    setUserProfile(null);
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore if not logged in via Firebase
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
    return cred;
  };

  const loginWithApple = async () => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      await syncUserProfile(cred.user);
    }
    return cred;
  };

  const loginAsGuest = () => {
    const demoUser = {
      uid: 'demo-guest-investor',
      email: 'demo.investor@stockmarketfuture.ai',
      displayName: 'Demo Investor',
      isAnonymous: true,
      watchlist: ['RELIANCE', 'TCS', 'HDFCBANK', 'NIFTY 50', 'SENSEX'],
      currency: 'INR',
    };
    localStorage.setItem('stock_market_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    setUserProfile(demoUser);
    return demoUser;
  };

  const updateUserProfileData = async (fields) => {
    if (!user?.uid || user.isAnonymous) {
      setUserProfile(prev => ({ ...prev, ...fields }));
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, fields);
      setUserProfile(prev => ({ ...prev, ...fields }));
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  };

  const value = {
    user,
    userProfile,
    signup,
    login,
    logout,
    loginWithGoogle,
    loginWithApple,
    loginAsGuest,
    updateUserProfileData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
