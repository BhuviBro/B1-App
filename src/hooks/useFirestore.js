import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORIES_BUSINESS,
  DEFAULT_BUSINESS_PARTNERS,
  SHEET_ENTRIES_OCT_2026,
  mergeCategories
} from "../utils/storage";

function userDocRef(uid, docId = 'main') {
  return doc(db, 'users', uid, 'data', docId);
}

export function useFirestore(uid, docId = 'main', profileId = 'personal') {
  const [data, setData]       = useState(null);
  const [ready, setReady]     = useState(false);
  const [syncing, setSyncing] = useState(false);

  const cacheKey = docId === 'main' ? 'b1-v2' : `b1-v2-${docId}`;
  const defCategories = profileId === 'business' ? DEFAULT_CATEGORIES_BUSINESS : DEFAULT_CATEGORIES;

  function emptyData() {
    if (profileId === 'business') {
      return {
        months: {
          '2026-10': { basepower: 0, entries: [...SHEET_ENTRIES_OCT_2026] }
        },
        categories: defCategories,
        partners: DEFAULT_BUSINESS_PARTNERS,
        recurring: [],
        radar: [],
        trash: [],
        expected: []
      };
    }
    return { months: {}, categories: defCategories, recurring: [], radar: [], trash: [], expected: [] };
  }

  useEffect(() => {
    if (!uid) return;
    // Load cached data for this docId immediately so switching profiles is instant with no flicker
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        setReady(true);
      } else {
        setData(null);
        setReady(false);
      }
    } catch (_) {
      setData(null);
      setReady(false);
    }

    const ref = userDocRef(uid, docId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        let months = d.months || {};
        let partners = d.partners;
        if (profileId === 'business') {
          const totalEntries = Object.values(months).reduce((acc, m) => acc + (m.entries?.length || 0), 0);
          if (totalEntries === 0) {
            months = {
              '2026-10': { basepower: 0, entries: [...SHEET_ENTRIES_OCT_2026] }
            };
            if (!partners || partners.length === 0) {
              partners = DEFAULT_BUSINESS_PARTNERS;
            }
            // Auto-persist seeded sheet data to Firestore
            setDoc(ref, {
              months,
              categories: mergeCategories(d.categories, profileId),
              partners,
              recurring: d.recurring || [],
              radar: d.radar || [],
              trash: d.trash || [],
              expected: d.expected || [],
            }).catch(e => console.warn('Seeding business doc error:', e));
          }
          if (!partners || partners.length === 0) {
            partners = DEFAULT_BUSINESS_PARTNERS;
          }
        }
        const nextData = {
          ...d,
          months,
          categories: mergeCategories(d.categories, profileId),
          partners:   partners || (profileId === 'business' ? DEFAULT_BUSINESS_PARTNERS : []),
          recurring:  d.recurring  || [],
          radar:      d.radar      || [],
          trash:      d.trash      || [],
          expected:   d.expected   || [],
          sheetWebhookUrl: d.sheetWebhookUrl || '',
        };
        try { localStorage.setItem(cacheKey, JSON.stringify(nextData)); } catch (_) {}
        setData(nextData);
      } else {
        const empty = emptyData();
        setDoc(ref, empty);
        try { localStorage.setItem(cacheKey, JSON.stringify(empty)); } catch (_) {}
        setData(empty);
      }
      setReady(true);
    }, err => {
      console.warn('Firestore snapshot error:', err.code);
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          let months = parsed.months || {};
          let partners = parsed.partners;
          if (profileId === 'business') {
            const totalEntries = Object.values(months).reduce((acc, m) => acc + (m.entries?.length || 0), 0);
            if (totalEntries === 0) {
              months = {
                '2026-10': { basepower: 0, entries: [...SHEET_ENTRIES_OCT_2026] }
              };
            }
            if (!partners || partners.length === 0) {
              partners = DEFAULT_BUSINESS_PARTNERS;
            }
          }
          setData({
            ...parsed,
            months,
            partners: partners || (profileId === 'business' ? DEFAULT_BUSINESS_PARTNERS : []),
            categories: mergeCategories(parsed.categories, profileId),
            trash: parsed.trash || [],
            expected: parsed.expected || [],
          });
        } else {
          setData(emptyData());
        }
      } catch { setData(emptyData()); }
      setReady(true);
    });
    return unsub;
  }, [uid, docId, profileId, cacheKey]);

  const save = useCallback(async (newData) => {
    if (!uid) return;
    setSyncing(true);
    // Sanitize any potential undefined values which cause Firestore setDoc rejections
    const cleanData = JSON.parse(JSON.stringify(newData));
    try { localStorage.setItem(cacheKey, JSON.stringify(cleanData)); } catch (_) {}
    try {
      await setDoc(userDocRef(uid, docId), cleanData);
    } catch (e) {
      console.warn('Firestore write queued (offline):', e.code);
    } finally {
      setSyncing(false);
    }
  }, [uid, docId, cacheKey]);

  const update = useCallback((fn) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev || emptyData()));
      fn(next);
      save(next);
      return next;
    });
  }, [save, defCategories]);

  return { data, ready, syncing, update };
}