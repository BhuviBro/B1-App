import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, provider } from '../firebase';

function getFriendlyErrorMessage(err) {
  if (!err) return null;
  switch (err.code) {
    case 'auth/popup-closed-by-user':
      // User closed the popup window intentionally; do not show an alarming red error
      return null;
    case 'auth/cancelled-popup-request':
      // Another popup was triggered or previous request was cancelled
      return null;
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups or try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Console. Please add it under Authentication > Settings > Authorized domains.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    default:
      return err.message || 'Unable to sign in. Please try again.';
  }
}

export function useAuth() {
  const [user, setUser]       = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Process redirect result if signInWithRedirect was used
    getRedirectResult(auth)
      .catch(err => {
        const msg = getFriendlyErrorMessage(err);
        if (msg) setError(msg);
      });

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
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        // User intentionally closed or dismissed the popup; silently clear error
        return;
      }
      if (e.code === 'auth/popup-blocked') {
        // If popup was blocked (e.g. mobile Safari / PWA), automatically fall back to redirect
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          setError(getFriendlyErrorMessage(redirectErr));
          return;
        }
      }
      setError(getFriendlyErrorMessage(e));
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return { user, loading, error, signIn, signOut: signOutUser };
}