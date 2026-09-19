import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseEnabled, googleProvider } from '../firebase/config';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [profile, setProfile] = useState(null); const [loading, setLoading] = useState(firebaseEnabled);
  useEffect(() => { if (!auth) { setLoading(false); return undefined; } return onAuthStateChanged(auth, async (next) => { setUser(next); if (next && db) { const snap = await getDoc(doc(db, 'users', next.uid)); setProfile(snap.exists() ? snap.data() : null); } else setProfile(null); setLoading(false); }); }, []);
  const value = useMemo(() => ({ user, profile, loading, firebaseEnabled,
    async register(data) { if (!auth) throw new Error('Configure Firebase to enable authentication.'); const result = await createUserWithEmailAndPassword(auth, data.email, data.password); await setDoc(doc(db, 'users', result.user.uid), { uid: result.user.uid, name: data.name, email: data.email, role: data.role, createdAt: serverTimestamp() }); return result.user; },
    login: (email, password) => auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject(new Error('Configure Firebase to enable authentication.')),
    googleLogin: () => auth ? signInWithPopup(auth, googleProvider) : Promise.reject(new Error('Configure Firebase to enable authentication.')),
    resetPassword: (email) => auth ? sendPasswordResetEmail(auth, email) : Promise.reject(new Error('Configure Firebase to enable authentication.')),
    logout: () => auth ? signOut(auth) : Promise.resolve(),
  }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
