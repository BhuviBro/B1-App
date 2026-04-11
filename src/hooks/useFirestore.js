import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
// import { DEFAULT_CATEGORIES } from './storage';
import { DEFAULT_CATEGORIES } from "../utils/storage";

function emptyData() {
  return { months: {}, categories: DEFAULT_CATEGORIES, recurring: [], radar: [] };
}

function userDocRef(uid) {
  return doc(db, 'users', uid, 'data', 'main');
}

export function useFirestore(uid) {
  const [data, setData]       = useState(null);
  const [ready, setReady]     = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const ref = userDocRef(uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setData({
          months:     d.months     || {},
          categories: d.categories || DEFAULT_CATEGORIES,
          recurring:  d.recurring  || [],
          radar:      d.radar      || [],
        });
      } else {
        const empty = emptyData();
        setDoc(ref, empty);
        setData(empty);
      }
      setReady(true);
    }, err => {
      console.warn('Firestore snapshot error:', err.code);
      try {
        const raw = localStorage.getItem('b1-v2');
        setData(raw ? JSON.parse(raw) : emptyData());
      } catch { setData(emptyData()); }
      setReady(true);
    });
    return unsub;
  }, [uid]);

  const save = useCallback(async (newData) => {
    if (!uid) return;
    setSyncing(true);
    localStorage.setItem('b1-v2', JSON.stringify(newData));
    try {
      await setDoc(userDocRef(uid), newData);
    } catch (e) {
      console.warn('Firestore write queued (offline):', e.code);
    } finally {
      setSyncing(false);
    }
  }, [uid]);

  const update = useCallback((fn) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev || emptyData()));
      fn(next);
      save(next);
      return next;
    });
  }, [save]);

  return { data, ready, syncing, update };
}