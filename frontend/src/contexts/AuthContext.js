import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for demo/guest session in localStorage
    const savedDemoUser = localStorage.getItem('stock_market_demo_user');
    if (savedDemoUser) {
      try {
        setUser(JSON.parse(savedDemoUser));
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('stock_market_demo_user');
      }
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          localStorage.removeItem('stock_market_demo_user');
        } else if (!savedDemoUser) {
          setUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } catch (e) {
      console.warn('Firebase auth initialization note:', e);
      setLoading(false);
    }
  }, []);

  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    localStorage.removeItem('stock_market_demo_user');
    setUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore if not logged in via Firebase
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const loginAsGuest = () => {
    const demoUser = {
      uid: 'demo-user-123',
      email: 'demo.investor@stockmarketfuture.ai',
      displayName: 'Demo Investor',
      isAnonymous: true,
    };
    localStorage.setItem('stock_market_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const value = {
    user,
    signup,
    login,
    logout,
    loginWithGoogle,
    loginAsGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
