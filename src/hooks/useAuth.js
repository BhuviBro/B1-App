import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from '../firebase';

export function useAuth() {
  const [user, setUser]     = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(e.message);
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return { user, loading, error, signIn, signOut: signOutUser };
}