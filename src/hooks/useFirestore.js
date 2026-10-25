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

function userDocRef(uid, docId = 'personal') {
  return doc(db, 'users', uid, 'data', docId);
}

// Detection helpers to strictly isolate data
export function isBusinessEntry(e) {
  if (!e) return false;
  const cat = String(e.category || '').toLowerCase();
  const lbl = String(e.label || '').toLowerCase();
  return (
    cat === 'raw_materials' ||
    cat === 'sale' ||
    cat === 'investment' ||
    cat === 'share_distribution' ||
    cat === 'food_travel' ||
    cat === 'materials' ||
    cat === 'marketing' ||
    cat === 'software' ||
    cat === 'salaries' ||
    lbl.includes('nfc') ||
    lbl.includes('naivedyam') ||
    lbl.includes('testing 1') ||
    lbl.includes('acrylic') ||
    lbl.includes('k2n') ||
    lbl.includes('temple') ||
    lbl === 'kjf' ||
    lbl.includes('kushal petrol') ||
    lbl.includes('bhuvan petrol') ||
    lbl.includes('first day sale') ||
    lbl.includes('way back to hassan')
  );
}

export function isPersonalEntry(e) {
  if (!e) return false;
  const lbl = String(e.label || '').toLowerCase();
  const cat = String(e.category || '').toLowerCase();
  return (
    lbl.includes('egg roll') ||
    lbl.includes('dosa tindi') ||
    lbl.includes('amma gym') ||
    lbl.includes('laptop battery') ||
    lbl.includes('gowri') ||
    lbl.includes('power bank') ||
    lbl.includes('resume print') ||
    lbl.includes('emi —') ||
    lbl.includes('slice -') ||
    lbl.includes('bmtc') ||
    lbl.includes('lenkart') ||
    lbl.includes('adjusting to current balance') ||
    lbl.includes('puff and juice') ||
    cat === 'slice' ||
    cat === 'repayment' ||
    cat === 'borrow_cash'
  );
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
      localStorage.removeItem(`b1-v2-${uid}`);
    } catch (_) {}

    // If account is bhuvan1624@gmail.com, purge its local caches immediately
    if (isWipedUser) {
      try {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`b1-v2-personal-${uid}`);
        localStorage.removeItem(`b1-v2-business-${uid}`);
      } catch (_) {}
    }

    // Try loading profile-specific cache with strict validation
    try {
      const cached = !isWipedUser ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        const octEntries = parsed?.months?.['2026-10']?.entries || [];
        // If cached personal has business entries or cached business has personal entries, discard cache
        if (profileId === 'personal' && octEntries.some(isBusinessEntry)) {
          localStorage.removeItem(cacheKey);
          setData(emptyData());
        } else if (profileId === 'business' && octEntries.some(isPersonalEntry)) {
          localStorage.removeItem(cacheKey);
          setData(emptyData());
        } else {
          setData(parsed);
        }
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

        // --- BUSINESS PROFILE VALIDATION & PURGE ---
        if (profileId === 'business' && isOwner) {
          let updated = false;
          const octEntries = months['2026-10']?.entries || [];
          const hasPersonalInOct = octEntries.some(isPersonalEntry);

          if (hasPersonalInOct) {
            // Remove any personal entries that accidentally leaked into business
            months['2026-10'].entries = octEntries.filter(e => !isPersonalEntry(e));
            updated = true;
          }

          if ((months['2026-10']?.entries?.length || 0) === 0) {
            months['2026-10'] = { basepower: 0, entries: [...SHEET_ENTRIES_OCT_2026] };
            updated = true;
          }

          if (!partners || partners.length === 0) {
            partners = DEFAULT_BUSINESS_PARTNERS;
            updated = true;
          }

          if (updated) {
            setDoc(ref, {
              months,
              categories: mergeCategories(d.categories, 'business'),
              partners,
              recurring: d.recurring || [],
              radar: d.radar || [],
              trash: d.trash || [],
              expected: d.expected || [],
              sheetWebhookUrl: d.sheetWebhookUrl || '',
            }).catch(e => console.warn('Cleaning business doc error:', e));
          }
        }

        // --- PERSONAL PROFILE VALIDATION & PURGE ---
        if (profileId === 'personal' && isOwner) {
          let updated = false;

          // Check if October 2026 has business entries or missing personal entries
          const octEntries = months['2026-10']?.entries || [];
          const hasBusinessInOct = octEntries.some(isBusinessEntry);

          if (hasBusinessInOct || octEntries.length < 20) {
            months['2026-10'] = {
              basepower: 15917,
              basepowerAutoFilled: false,
              entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_OCT_2026)),
            };
            updated = true;
          }

          // Check if September 2026 is missing or has business entries
          const sepEntries = months['2026-09']?.entries || [];
          if (!months['2026-09'] || !sepEntries || sepEntries.length === 0 || sepEntries.some(isBusinessEntry)) {
            months['2026-09'] = {
              basepower: 0,
              basepowerAutoFilled: false,
              entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_SEP_2026)),
            };
            updated = true;
          }

          // Check recurring EMIs
          if (!recurring || recurring.length === 0) {
            recurring = JSON.parse(JSON.stringify(PERSONAL_RECURRING_EMIS));
            updated = true;
          }

          // Personal must NEVER have partners
          if (partners && partners.length > 0) {
            partners = [];
            updated = true;
          }

          if (updated) {
            setDoc(ref, {
              months,
              categories: mergeCategories(d.categories, 'personal'),
              partners: [],
              recurring,
              radar: d.radar || [],
              trash: d.trash || [],
              expected: d.expected || [],
            }).catch(e => console.warn('Purging business data from personal doc error:', e));
          }
        }

        const nextData = {
          ...d,
          months,
          categories: mergeCategories(d.categories, profileId),
          partners:   profileId === 'business' ? (partners || DEFAULT_BUSINESS_PARTNERS) : [],
          recurring:  recurring,
          radar:      d.radar      || [],
          trash:      d.trash      || [],
          expected:   d.expected   || [],
          sheetWebhookUrl: profileId === 'business' ? (d.sheetWebhookUrl || '') : '',
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
            const octEntries = months['2026-10']?.entries || [];
            if (octEntries.some(isPersonalEntry)) {
              months['2026-10'].entries = octEntries.filter(e => !isPersonalEntry(e));
            }
            if ((months['2026-10']?.entries?.length || 0) === 0) {
              months['2026-10'] = { basepower: 0, entries: [...SHEET_ENTRIES_OCT_2026] };
            }
            if (!partners || partners.length === 0) {
              partners = DEFAULT_BUSINESS_PARTNERS;
            }
          }

          if (profileId === 'personal' && isOwner) {
            const octEntries = months['2026-10']?.entries || [];
            if (octEntries.some(isBusinessEntry) || octEntries.length < 20) {
              months['2026-10'] = {
                basepower: 15917,
                basepowerAutoFilled: false,
                entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_OCT_2026)),
              };
            }
            if (!months['2026-09'] || !months['2026-09'].entries || months['2026-09'].entries.length === 0) {
              months['2026-09'] = {
                basepower: 0,
                basepowerAutoFilled: false,
                entries: JSON.parse(JSON.stringify(PERSONAL_ENTRIES_SEP_2026)),
              };
            }
            if (!recurring || recurring.length === 0) {
              recurring = JSON.parse(JSON.stringify(PERSONAL_RECURRING_EMIS));
            }
            partners = [];
          }

          setData({
            ...parsed,
            months,
            partners: profileId === 'business' ? (partners || DEFAULT_BUSINESS_PARTNERS) : [],
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