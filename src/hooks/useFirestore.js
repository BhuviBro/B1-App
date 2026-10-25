import { useState, useEffect, useCallback } from 'react';
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
  mergeCategories
} from "../utils/storage";

function userDocRef(uid, docId = 'main') {
  return doc(db, 'users', uid, 'data', docId);
}

export function useFirestore(uid, docId = 'main', profileId = 'personal', userEmail = '') {
  const [data, setData]       = useState(null);
  const [ready, setReady]     = useState(false);
  const [syncing, setSyncing] = useState(false);

  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const isOwner = normalizedEmail === 'bhuvibhuvan1624@gmail.com';
  const isWipedUser = normalizedEmail === 'bhuvan1624@gmail.com';

  const cacheKey = docId === 'main' ? 'b1-v2' : `b1-v2-${docId}`;
  const defCategories = profileId === 'business' ? DEFAULT_CATEGORIES_BUSINESS : DEFAULT_CATEGORIES;

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

    // If account is bhuvan1624@gmail.com, purge its local caches immediately
    if (isWipedUser) {
      try {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem('b1-v2');
        localStorage.removeItem('b1-v2-main');
        localStorage.removeItem('b1-v2-business');
      } catch (_) {}
    }

    // Load cached data for this docId immediately so switching profiles is instant with no flicker
    try {
      const cached = !isWipedUser ? localStorage.getItem(cacheKey) : null;
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
              localStorage.removeItem('b1-v2');
              localStorage.removeItem('b1-v2-main');
              localStorage.removeItem('b1-v2-business');
            } catch (_) {}
            setData(cleanEmpty);
            setReady(true);
            return;
          }
        }

        if (profileId === 'business' && isOwner) {
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

        if (profileId === 'personal' && isOwner) {
          let updated = false;

          // 1. Ensure 2026-09 has all 8 September entries
          if (!months['2026-09'] || !months['2026-09'].entries || months['2026-09'].entries.length === 0) {
            months['2026-09'] = {
              basepower: 0,
              basepowerAutoFilled: false,
              entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_SEP_2026)),
            };
            updated = true;
          }

          // 2. Ensure 2026-10 has all 26 October entries (if missing or wiped)
          if (!months['2026-10'] || !months['2026-10'].entries || months['2026-10'].entries.length < 20) {
            months['2026-10'] = {
              basepower: 15917,
              basepowerAutoFilled: false,
              entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_OCT_2026)),
            };
            updated = true;
          }

          // 3. Ensure recurring has all 3 EMIs with paid history
          if (!recurring || recurring.length === 0) {
            recurring = JSON.parse(JSON.stringify(PERSONAL_RECURRING_EMIS));
            updated = true;
          }

          if (updated) {
            setDoc(ref, {
              months,
              categories: mergeCategories(d.categories, profileId),
              partners: [],
              recurring,
              radar: d.radar || [],
              trash: d.trash || [],
              expected: d.expected || [],
            }).catch(e => console.warn('Syncing personal history error:', e));
          }
        }

        const nextData = {
          ...d,
          months,
          categories: mergeCategories(d.categories, profileId),
          partners:   partners || (profileId === 'business' ? DEFAULT_BUSINESS_PARTNERS : []),
          recurring:  recurring,
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
          let recurring = parsed.recurring || [];

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

          if (profileId === 'personal' && isOwner) {
            if (!months['2026-09'] || !months['2026-09'].entries || months['2026-09'].entries.length === 0) {
              months['2026-09'] = {
                basepower: 0,
                basepowerAutoFilled: false,
                entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_SEP_2026)),
              };
            }
            if (!months['2026-10'] || !months['2026-10'].entries || months['2026-10'].entries.length < 20) {
              months['2026-10'] = {
                basepower: 15917,
                basepowerAutoFilled: false,
                entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_OCT_2026)),
              };
            }
            if (!recurring || recurring.length === 0) {
              recurring = JSON.parse(JSON.stringify(PERSONAL_RECURRING_EMIS));
            }
          }

          setData({
            ...parsed,
            months,
            partners: partners || (profileId === 'business' ? DEFAULT_BUSINESS_PARTNERS : []),
            categories: mergeCategories(parsed.categories, profileId),
            recurring,
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