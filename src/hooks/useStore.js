import { useState, useEffect, useRef } from 'react';
import { useFirestore } from './useFirestore';
import {
  getMonthWithCarryForward, uid, uid_radar,
  monthKey, DEFAULT_CATEGORIES, DEFAULT_CATEGORIES_BUSINESS, DEFAULT_BUSINESS_PARTNERS,
  SHEET_ENTRIES_OCT_2026, mergeCategories, PROFILES, nowTimeStr, todayStr,
  PERSONAL_RECURRING_EMIS, PERSONAL_ENTRIES_OCT_2026, PERSONAL_ENTRIES_SEP_2026,
  isBelowThreeEmi
} from '../utils/storage';
import {
  fetchFromGoogleSheet, pushToGoogleSheet, normalizeSheetDate, parseSheetAmount, CATEGORY_MAP
} from '../utils/googleSheetSync';

const now = new Date();
const INIT_KEY = monthKey(now.getFullYear(), now.getMonth() + 1);

export function useStore(uid_user, activeProfileId = 'personal', userEmail = '') {
  const isOwner = userEmail?.toLowerCase() === 'bhuvibhuvan1624@gmail.com';
  const allowedProfiles = isOwner ? PROFILES : PROFILES.filter(p => p.id === 'personal');
  const effectiveProfileId = isOwner ? activeProfileId : 'personal';
  const currentProfile = allowedProfiles.find(p => p.id === effectiveProfileId) || allowedProfiles[0];
  const { data, ready, syncing, update } = useFirestore(uid_user, currentProfile.docId, currentProfile.id, userEmail);
  const [currentKey, setCurrentKey] = useState(INIT_KEY);
  const [theme, setTheme] = useState(() => localStorage.getItem('b1-theme') || 'dark');

  const activeProfileIdRef = useRef(activeProfileId);
  useEffect(() => {
    activeProfileIdRef.current = activeProfileId;
  }, [activeProfileId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('b1-theme', theme);
  }, [theme]);

  // Personal & Business profile data is now authoritative in Firestore.
  // No hardcoded hooks will overwrite live user additions, edits, or deletions.


  const defCategories = currentProfile.id === 'business' ? DEFAULT_CATEGORIES_BUSINESS : DEFAULT_CATEGORIES;
  const safeData = data || { months: {}, categories: defCategories, partners: [], recurring: [], radar: [], trash: [], expected: [] };
  const monthData  = getMonthWithCarryForward(JSON.parse(JSON.stringify(safeData)), currentKey);
  const categories = mergeCategories(safeData.categories, currentProfile.id);
  const partners   = safeData.partners   || (currentProfile.id === 'business' ? DEFAULT_BUSINESS_PARTNERS : []);
  const recurring  = currentProfile.id === 'personal'
    ? (safeData.recurring || []).filter(r => !isBelowThreeEmi(r))
    : (safeData.recurring || []);
  const radar      = safeData.radar      || [];
  const trash      = safeData.trash      || [];
  const expected   = safeData.expected   || [];

  function changeMonth(dir) {
    const [y, m] = currentKey.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentKey(monthKey(d.getFullYear(), d.getMonth() + 1));
  }

  function addEntry(entry) {
    const newId = uid();
    const entryDate = entry.date || todayStr();
    const targetMonthKey = entryDate.slice(0, 7) || currentKey;

    update(d => {
      getMonthWithCarryForward(d, targetMonthKey).entries.push({ ...entry, id: newId, returns: [] });
      if (entry.recurringId) {
        const r = (d.recurring || []).find(x => x.id === entry.recurringId);
        if (r) {
          if (!r._entryId) r._entryId = {};
          r._entryId[targetMonthKey] = newId;
        }
      }
    });

    const activeWebhook = sheetWebhookUrl || data?.sheetWebhookUrl;
    if (activeProfileIdRef.current === 'business' && activeWebhook) {
      pushToGoogleSheet(activeWebhook, entry).catch(e => console.warn('Google Sheet push error:', e));
    }

    return newId;
  }

  function editEntry(id, entry) {
    update(d => {
      // search all months for the entry
      for (const mo of Object.values(d.months || {})) {
        const idx = (mo.entries || []).findIndex(e => e.id === id);
        if (idx >= 0) { mo.entries[idx] = { ...mo.entries[idx], ...entry }; return; }
      }
    });
  }

  function moveToTrash(id) {
    update(d => {
      if (!d.trash) d.trash = [];
      let found = null;
      let foundMonthKey = currentKey;

      // find and remove from all months
      for (const [k, mo] of Object.entries(d.months || {})) {
        const entry = (mo.entries || []).find(e => e.id === id);
        if (entry) {
          found = entry;
          foundMonthKey = k;
          // if deleting a return credit, also undo the return on the returnable entry
          if (entry.isReturnCredit && entry.linkedReturnableId) {
            for (const mo2 of Object.values(d.months || {})) {
              const returnable = (mo2.entries || []).find(e => e.id === entry.linkedReturnableId);
              if (returnable) {
                returnable.returns = (returnable.returns || []).filter(r => r.amount !== entry.amount);
              }
            }
          }
          // if deleting a borrow repayment debit, also undo the repayment on the borrowed entry
          if (entry.isBorrowRepayment && entry.linkedBorrowedId) {
            for (const mo2 of Object.values(d.months || {})) {
              const borrowed = (mo2.entries || []).find(e => e.id === entry.linkedBorrowedId);
              if (borrowed) {
                borrowed.returns = (borrowed.returns || []).filter(r => r.amount !== entry.amount);
              }
            }
          }
          // if deleting a recurring payment entry, remove its link and unmark history if no others remain this month
          if (entry.recurringId) {
            const r = (d.recurring || []).find(x => x.id === entry.recurringId);
            if (r && r.history) {
              const hasOther = (mo.entries || []).some(e => e.id !== id && e.recurringId === entry.recurringId);
              if (!hasOther) {
                r.history[foundMonthKey] = null;
                if (r._entryId) delete r._entryId[foundMonthKey];
              }
            }
          }
          mo.entries = mo.entries.filter(e => e.id !== id);
          break;
        }
      }

      if (found) {
        d.trash.push({ ...found, deletedAt: todayStr(), deletedFromMonth: foundMonthKey });
      }
    });
  }

  function restoreEntry(id) {
    update(d => {
      const item = (d.trash || []).find(e => e.id === id);
      if (!item) return;
      const { deletedAt, deletedFromMonth, ...entry } = item;
      const mo = getMonthWithCarryForward(d, deletedFromMonth || currentKey);
      mo.entries.push(entry);
      d.trash = d.trash.filter(e => e.id !== id);
    });
  }

  function deleteEntryPermanent(id) {
    update(d => { d.trash = (d.trash || []).filter(e => e.id !== id); });
  }

  function clearTrash() {
    update(d => { d.trash = []; });
  }

  // kept for compatibility but now moveToTrash is used
  function deleteEntry(id) {
    moveToTrash(id);
  }

  function setBasepower(val) {
    update(d => {
      const mo = getMonthWithCarryForward(d, currentKey);
      mo.basepower = parseFloat(val) || 0;
      mo.basepowerAutoFilled = false;
    });
  }

  function addReturn(entryId, ret) {
    update(d => {
      let targetKey = currentKey;
      for (const [k, mo] of Object.entries(d.months || {})) {
        if ((mo.entries || []).find(x => x.id === entryId)) { targetKey = k; break; }
      }
      const mo = getMonthWithCarryForward(d, targetKey);
      const entry = mo.entries.find(x => x.id === entryId);
      if (!entry) return;
      if (!entry.returns) entry.returns = [];
      const retObj = { ...ret, id: uid() };
      entry.returns.push(retObj);

      const currentMo = getMonthWithCarryForward(d, currentKey);
      currentMo.entries.push({
        id: uid(),
        label: `Return — ${entry.label}${entry.person ? ` (${entry.person})` : ''}`,
        amount: ret.amount,
        type: 'credit',
        category: 'received',
        date: ret.date,
        time: ret.time || nowTimeStr(),
        subItems: [],
        returns: [],
        isReturnCredit: true,
        linkedReturnableId: entryId,
      });
    });
  }

  function addRepayment(entryId, rep) {
    update(d => {
      let targetKey = currentKey;
      for (const [k, mo] of Object.entries(d.months || {})) {
        if ((mo.entries || []).find(x => x.id === entryId)) { targetKey = k; break; }
      }
      const mo = getMonthWithCarryForward(d, targetKey);
      const entry = mo.entries.find(x => x.id === entryId);
      if (!entry) return;
      if (!entry.returns) entry.returns = [];
      const repObj = { ...rep, id: uid() };
      entry.returns.push(repObj);

      const currentMo = getMonthWithCarryForward(d, currentKey);
      currentMo.entries.push({
        id: uid(),
        label: `Repaid — ${entry.label}${entry.person ? ` (${entry.person})` : ''}`,
        amount: rep.amount,
        type: 'debit',
        category: 'repayment',
        date: rep.date,
        time: rep.time || nowTimeStr(),
        subItems: [],
        returns: [],
        isBorrowRepayment: true,
        linkedBorrowedId: entryId,
      });
    });
  }

  function saveCategory(type, cat) {
    update(d => {
      if (!d.categories) d.categories = JSON.parse(JSON.stringify(defCategories));
      if (!d.categories[type]) d.categories[type] = [];
      const idx = d.categories[type].findIndex(c => c.id === cat.id);
      if (idx >= 0) d.categories[type][idx] = cat;
      else d.categories[type].push({ ...cat, id: uid() });
    });
  }

  function deleteCategory(type, catId) {
    update(d => {
      if (!d.categories?.[type]) return;
      d.categories[type] = d.categories[type].filter(c => c.id !== catId);
    });
  }

  function reorderCategories(type, fromIdx, toIdx) {
    update(d => {
      if (!d.categories) d.categories = JSON.parse(JSON.stringify(defCategories));
      const cats = d.categories[type] || [];
      const moved = cats.splice(fromIdx, 1)[0];
      cats.splice(toIdx, 0, moved);
      d.categories[type] = cats;
    });
  }

  function addRecurring(rec) {
    update(d => {
      if (!d.recurring) d.recurring = [];
      d.recurring.push({ ...rec, id: uid(), history: {} });
    });
  }

  function editRecurring(id, rec) {
    update(d => {
      const idx = (d.recurring || []).findIndex(r => r.id === id);
      if (idx >= 0) d.recurring[idx] = { ...d.recurring[idx], ...rec };
    });
  }

  function deleteRecurring(id) {
    update(d => { d.recurring = (d.recurring || []).filter(r => r.id !== id); });
  }

  function markRecurring(id, status) {
    update(d => {
      const r = (d.recurring || []).find(x => x.id === id);
      if (!r) return;
      if (!r.history) r.history = {};
      if (status === null) {
        const entryId = r._entryId?.[currentKey];
        const mo = getMonthWithCarryForward(d, currentKey);
        if (entryId) {
          mo.entries = mo.entries.filter(e => e.id !== entryId);
          delete r._entryId[currentKey];
        } else {
          mo.entries = mo.entries.filter(e => e.recurringId !== id);
        }
        r.history[currentKey] = null;
      } else {
        r.history[currentKey] = status;
      }
    });
  }

  function addRadarItem(item) {
    update(d => {
      if (!d.radar) d.radar = [];
      d.radar.push({ ...item, id: uid_radar(), bought: false, boughtDate: null, createdDate: todayStr() });
    });
  }

  function markRadarBought(id) {
    update(d => {
      const item = (d.radar || []).find(x => x.id === id);
      if (item) { item.bought = true; item.boughtDate = todayStr(); }
    });
  }

  function discardRadarItem(id) {
    update(d => { d.radar = (d.radar || []).filter(x => x.id !== id); });
  }

  function addExpectedItem(item) {
    update(d => {
      if (!d.expected) d.expected = [];
      d.expected.push({
        ...item,
        id: uid(),
        status: 'pending',
        receivedDate: null,
        createdAt: todayStr(),
      });
    });
  }

  function editExpectedItem(id, item) {
    update(d => {
      const idx = (d.expected || []).findIndex(x => x.id === id);
      if (idx >= 0) d.expected[idx] = { ...d.expected[idx], ...item };
    });
  }

  function deleteExpectedItem(id) {
    update(d => {
      d.expected = (d.expected || []).filter(x => x.id !== id);
    });
  }

  function markExpectedReceived(id) {
    update(d => {
      const item = (d.expected || []).find(x => x.id === id);
      if (item) {
        item.status = 'received';
        item.receivedDate = todayStr();
      }
    });
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  function importSheetData() {
    if (activeProfileId !== 'business') return;
    update(d => {
      if (!d.months) d.months = {};
      const mo = d.months['2026-10'] || { basepower: 0, entries: [] };
      const existing = mo.entries || [];
      const sheetFPs = new Set(
        SHEET_ENTRIES_OCT_2026.map(se => `${se.date}_${se.type}_${se.amount}_${(se.label || '').toLowerCase().trim()}`)
      );
      const preserved = existing.filter(ee => {
        if (ee.id && ee.id.startsWith('sh_')) return false;
        const fp = `${ee.date}_${ee.type}_${ee.amount}_${(ee.label || '').toLowerCase().trim()}`;
        return !sheetFPs.has(fp);
      });
      d.months['2026-10'] = {
        basepower: mo.basepower || 0,
        entries: [...JSON.parse(JSON.stringify(SHEET_ENTRIES_OCT_2026)), ...preserved],
      };
      d.categories = mergeCategories(d.categories, 'business');
      d.partners = JSON.parse(JSON.stringify(DEFAULT_BUSINESS_PARTNERS));
    });
  }

  function clearProfileData() {
    update(d => {
      d.months = {};
      d.recurring = [];
      d.radar = [];
      d.trash = [];
      d.expected = [];
      d.categories = currentProfile.id === 'business' ? DEFAULT_CATEGORIES_BUSINESS : DEFAULT_CATEGORIES;
      if (currentProfile.id === 'business') {
        d.partners = DEFAULT_BUSINESS_PARTNERS;
      }
    });
  }

  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [sheetWebhookUrl, setSheetWebhookUrlState] = useState(() => localStorage.getItem('b1-sheet-webhook-url') || '');

  // Re-hydrate webhook URL from Firestore cloud document if localStorage was wiped
  useEffect(() => {
    if (data?.sheetWebhookUrl && data.sheetWebhookUrl !== sheetWebhookUrl) {
      setSheetWebhookUrlState(data.sheetWebhookUrl);
      localStorage.setItem('b1-sheet-webhook-url', data.sheetWebhookUrl);
    }
  }, [data?.sheetWebhookUrl]);

  function setSheetWebhookUrl(url) {
    const trimmed = (url || '').trim();
    setSheetWebhookUrlState(trimmed);
    localStorage.setItem('b1-sheet-webhook-url', trimmed);
    update(d => {
      d.sheetWebhookUrl = trimmed;
    });
  }

  // Sync Google Sheet strictly when on the Business profile
  async function syncGoogleSheet(customUrl) {
    // Tier 1: Guard before initiating network call
    if (activeProfileIdRef.current !== 'business') {
      console.warn('Google Sheet sync aborted: active profile is not business');
      return { success: false, count: 0, isLive: false };
    }

    const url = (customUrl !== undefined ? customUrl : (sheetWebhookUrl || data?.sheetWebhookUrl))?.trim();
    if (!url) {
      const hasAnyEntries = Object.values(data?.months || {}).some(m => (m.entries || []).length > 0);
      if (!hasAnyEntries) {
        importSheetData();
      }
      return { success: true, count: SHEET_ENTRIES_OCT_2026.length, isLive: false };
    }

    setSheetSyncing(true);
    try {
      const result = await fetchFromGoogleSheet(url);

      // Tier 2: Guard immediately after async network call finishes
      if (activeProfileIdRef.current !== 'business') {
        console.warn('Google Sheet sync discarded: user switched away from business profile');
        setSheetSyncing(false);
        return { success: false, count: 0, isLive: false };
      }

      const rawTx = result.transactions || [];
      const partnersList = result.partners || [];

      const mappedEntries = rawTx.map((tx, idx) => {
        const { date, time } = normalizeSheetDate(tx.date || tx.dateTime, tx.time);
        const amt = parseSheetAmount(tx.amount);
        const type = String(tx.type || '').trim().toLowerCase() === 'credit' ? 'credit' : 'debit';
        const rawCat = String(tx.category || '').trim().toLowerCase();
        const catId = CATEGORY_MAP[rawCat] || (type === 'credit' ? 'sale' : 'other_d');

        return {
          id: `sh_live_${idx + 1}`,
          type,
          label: tx.description || (type === 'credit' ? 'Income' : 'Expense'),
          amount: amt,
          category: catId,
          partner: tx.partner || '',
          date,
          time,
          returns: [],
        };
      });

      // Tier 3: Guard inside the update callback
      update(d => {
        if (activeProfileIdRef.current !== 'business') return;
        if (!d.months) d.months = {};

        // Group entries dynamically by month key
        const sheetByMonth = {};
        mappedEntries.forEach(entry => {
          const mKey = (entry.date && entry.date.slice(0, 7)) || '2026-10';
          if (!sheetByMonth[mKey]) sheetByMonth[mKey] = [];
          sheetByMonth[mKey].push(entry);
        });

        if (!sheetByMonth['2026-10']) sheetByMonth['2026-10'] = [];

        Object.entries(sheetByMonth).forEach(([mKey, sheetEntries]) => {
          d.months[mKey] = {
            basepower: 0,
            entries: sheetEntries,
          };
        });

        if (partnersList.length > 0) {
          const colorMap = {
            bhuvan: '#a78bfa',
            kushal: '#38bdf8',
            amulya: '#fbbf24',
            deepika: '#f472b6',
            anagha: '#34d399',
          };
          const defaultPctMap = {
            bhuvan: 38.0,
            kushal: 15.5,
            amulya: 15.5,
            deepika: 15.5,
            anagha: 15.5,
          };
          d.partners = partnersList.map(p => {
            const id = p.name.toLowerCase().trim();
            const pctVal = parseSheetAmount(p.sharePct);
            const sharePct = pctVal > 0 ? pctVal : (defaultPctMap[id] || 0);
            return {
              id,
              name: p.name,
              sharePct,
              withdrawn: parseSheetAmount(p.withdrawn),
              allocated: parseSheetAmount(p.allocated),
              available: parseSheetAmount(p.available),
              color: colorMap[id] || '#60a5fa',
            };
          });
        }
      });

      return { success: true, count: mappedEntries.length, isLive: true };
    } finally {
      setSheetSyncing(false);
    }
  }

  return {
    data: safeData, monthData, currentKey, changeMonth, ready, syncing,
    addEntry, editEntry, deleteEntry, setBasepower, addReturn, addRepayment,
    trash, moveToTrash, restoreEntry, deleteEntryPermanent, clearTrash,
    categories, saveCategory, deleteCategory, reorderCategories,
    recurring, addRecurring, editRecurring, deleteRecurring, markRecurring,
    radar, addRadarItem, markRadarBought, discardRadarItem,
    expected, addExpectedItem, editExpectedItem, deleteExpectedItem, markExpectedReceived,
    theme, toggleTheme,
    activeProfile: currentProfile, profiles: allowedProfiles,
    partners, importSheetData, clearProfileData,
    sheetWebhookUrl, setSheetWebhookUrl, syncGoogleSheet, sheetSyncing,
  };
}