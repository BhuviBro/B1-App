import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORIES_BUSINESS,
  DEFAULT_BUSINESS_PARTNERS,
  SHEET_ENTRIES_OCT_2026,
  PERSONAL_ENTRIES_OCT_2026,
  PERSONAL_ENTRIES_SEP_2026,
  PERSONAL_RECURRING_EMIS,
  mergeCategories,
  isBelowThreeEmi
} from "../utils/storage";

function userDocRef(uid, docId = 'personal') {
  return doc(db, 'users', uid, 'data', docId);
}

export function useFirestore(uid, docId = 'personal', profileId = 'personal', userEmail = '') {
  const [data, setData]       = useState(null);
  const [ready, setReady]     = useState(false);
  const [syncing, setSyncing] = useState(false);

  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const isOwner = normalizedEmail === 'bhuvibhuvan1624@gmail.com';
  const isWipedUser = normalizedEmail === 'bhuvan1624@gmail.com';

  const cacheKey = `b1-v2-${docId}-${uid}`;
  const defCategories = profileId === 'business' ? DEFAULT_CATEGORIES_BUSINESS : DEFAULT_CATEGORIES;

  // Active Key references to lock against stale-closure writes across profile switches
  const activeDocIdRef = useRef(docId);
  const activeProfileIdRef = useRef(profileId);

  useEffect(() => {
    activeDocIdRef.current = docId;
    activeProfileIdRef.current = profileId;
    // On profile switch, immediately clear data so stale profile state can never leak
    setData(null);
    setReady(false);
  }, [docId, profileId]);

  function emptyData() {
    if (profileId === 'business' && isOwner) {
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
    if (profileId === 'personal' && isOwner) {
      return {
        months: {
          '2026-09': { basepower: 0, entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_SEP_2026)) },
          '2026-10': { basepower: 15917, entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_OCT_2026)) },
        },
        categories: defCategories,
        partners: [],
        recurring: JSON.parse(JSON.stringify(PERSONAL_RECURRING_EMIS)),
        radar: [],
        trash: [],
        expected: []
      };
    }
    // Clean empty template for all other users / non-owner accounts
    return { months: {}, categories: defCategories, recurring: [], partners: [], radar: [], trash: [], expected: [] };
  }

  useEffect(() => {
    if (!uid) return;

    // Purge deprecated shared storage keys that cause bleed
    try {
      localStorage.removeItem('b1-v2');
      localStorage.removeItem('b1-v2-main');
    } catch (_) {}

    // If account is bhuvan1624@gmail.com, purge its local caches immediately
    if (isWipedUser) {
      try {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`b1-v2-personal-${uid}`);
        localStorage.removeItem(`b1-v2-business-${uid}`);
      } catch (_) {}
    }

    // Load profile-specific cache for instant UI response
    try {
      const cached = !isWipedUser ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (profileId === 'business') {
          parsed.recurring = [];
        }
        if (profileId === 'personal' && Array.isArray(parsed.recurring)) {
          parsed.recurring = parsed.recurring.filter(r => !isBelowThreeEmi(r));
        }
        setData(parsed);
        setReady(true);
      } else {
        setData(emptyData());
        setReady(true);
      }
    } catch (_) {
      setData(emptyData());
      setReady(true);
    }

    const ref = userDocRef(uid, docId);
    const unsub = onSnapshot(ref, snap => {
      // Guard: ignore snapshot if user already switched to another profile
      if (activeDocIdRef.current !== docId || activeProfileIdRef.current !== profileId) {
        return;
      }

      if (snap.exists()) {
        const d = snap.data();
        let months = d.months || {};
        let partners = d.partners;
        let recurring = d.recurring || [];

        // Specifically wipe any cloud data linked to bhuvan1624@gmail.com
        if (isWipedUser) {
          const hasData = Object.keys(months).length > 0 || recurring.length > 0 || (d.trash && d.trash.length > 0);
          if (hasData) {
            const cleanEmpty = {
              months: {},
              categories: defCategories,
              partners: [],
              recurring: [],
              radar: [],
              trash: [],
              expected: []
            };
            setDoc(ref, cleanEmpty).catch(e => console.warn('Wiping bhuvan1624 doc error:', e));
            try {
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(`b1-v2-personal-${uid}`);
              localStorage.removeItem(`b1-v2-business-${uid}`);
            } catch (_) {}
            setData(cleanEmpty);
            setReady(true);
            return;
          }
        }

        // --- BUSINESS PROFILE ---
        if (profileId === 'business' && isOwner) {
          // If Business has any recurring EMIs, move them to Personal and clear Business
          if (recurring && recurring.length > 0) {
            const personalRef = userDocRef(uid, 'personal');
            setDoc(personalRef, { recurring: recurring }, { merge: true })
              .catch(e => console.warn('Moving recurring from business to personal error:', e));
            setDoc(ref, { recurring: [] }, { merge: true })
              .catch(e => console.warn('Clearing recurring in business doc error:', e));
            recurring = [];
          }

          if (!partners || partners.length === 0) {
            partners = DEFAULT_BUSINESS_PARTNERS;
          }

          if ((months['2026-10']?.entries?.length || 0) === 0) {
            months['2026-10'] = { basepower: 0, entries: [...SHEET_ENTRIES_OCT_2026] };
          }
        }

        // --- PERSONAL PROFILE ---
        if (profileId === 'personal') {
          partners = []; // Personal never has partners

          // Delete the below 3 EMIs ('EMI — 5236', 'EMI — 2094', 'EMI — 733') and retain the above 3
          if (Array.isArray(recurring) && recurring.length > 0) {
            const cleanedRec = recurring.filter(r => !isBelowThreeEmi(r));
            if (cleanedRec.length !== recurring.length) {
              recurring = cleanedRec;
              if (isOwner) {
                setDoc(ref, { recurring: cleanedRec }, { merge: true })
                  .catch(e => console.warn('Syncing cleaned personal recurring error:', e));
              }
            }
          }

          // If months had 0 entries, populate default personal template
          if (months['2026-10'] && (months['2026-10'].entries?.length || 0) === 0) {
            months['2026-10'] = {
              basepower: 15917,
              basepowerAutoFilled: false,
              entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_OCT_2026)),
            };
          }
          if (months['2026-09'] && (months['2026-09'].entries?.length || 0) === 0) {
            months['2026-09'] = {
              basepower: 0,
              basepowerAutoFilled: false,
              entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_SEP_2026)),
            };
          }
        }

        const nextData = {
          ...d,
          months,
          categories: mergeCategories(d.categories, profileId),
          partners:   profileId === 'business' ? (partners || DEFAULT_BUSINESS_PARTNERS) : [],
          recurring:  profileId === 'business' ? [] : (profileId === 'personal' ? recurring.filter(r => !isBelowThreeEmi(r)) : recurring),
          radar:      d.radar      || [],
          trash:      d.trash      || [],
          expected:   d.expected   || [],
          sheetWebhookUrl: profileId === 'business' ? (d.sheetWebhookUrl || '') : '',
        };

        try { localStorage.setItem(cacheKey, JSON.stringify(nextData)); } catch (_) {}
        setData(nextData);
      } else {
        // Document does not exist yet: initialize cleanly
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
          setData({
            ...parsed,
            recurring: profileId === 'business' ? [] : (parsed.recurring || []),
            partners: profileId === 'business' ? (parsed.partners || DEFAULT_BUSINESS_PARTNERS) : [],
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
    // Guard: ensure save target matches current active profile key
    const targetDocId = activeDocIdRef.current;
    const targetProfileId = activeProfileIdRef.current;
    if (docId !== targetDocId || profileId !== targetProfileId) {
      console.warn('Save aborted: profile key mismatch during active switch');
      return;
    }

    setSyncing(true);
    const cleanData = JSON.parse(JSON.stringify(newData));
    if (targetProfileId === 'business') {
      cleanData.recurring = [];
    }
    try { localStorage.setItem(cacheKey, JSON.stringify(cleanData)); } catch (_) {}
    try {
      await setDoc(userDocRef(uid, targetDocId), cleanData);
    } catch (e) {
      console.warn('Firestore write queued (offline):', e.code);
    } finally {
      setSyncing(false);
    }
  }, [uid, docId, cacheKey, profileId]);

  const update = useCallback((fn) => {
    // Guard: ignore updates if docId mismatch
    if (activeDocIdRef.current !== docId || activeProfileIdRef.current !== profileId) {
      return;
    }
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev || emptyData()));
      fn(next);
      save(next);
      return next;
    });
  }, [save, defCategories, docId, profileId]);

  return { data, ready, syncing, update };
}