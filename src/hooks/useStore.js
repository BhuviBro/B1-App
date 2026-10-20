import { useState, useEffect } from 'react';
import { useFirestore } from './useFirestore';
import {
  getMonthWithCarryForward, uid, uid_radar,
  monthKey, DEFAULT_CATEGORIES, DEFAULT_CATEGORIES_BUSINESS, DEFAULT_BUSINESS_PARTNERS,
  SHEET_ENTRIES_OCT_2026, mergeCategories, PROFILES, nowTimeStr, todayStr
} from '../utils/storage';

const now = new Date();
const INIT_KEY = monthKey(now.getFullYear(), now.getMonth() + 1);

export function useStore(uid_user, activeProfileId = 'personal') {
  const currentProfile = PROFILES.find(p => p.id === activeProfileId) || PROFILES[0];
  const { data, ready, syncing, update } = useFirestore(uid_user, currentProfile.docId, currentProfile.id);
  const [currentKey, setCurrentKey] = useState(INIT_KEY);
  const [theme, setTheme] = useState(() => localStorage.getItem('b1-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('b1-theme', theme);
  }, [theme]);

  const defCategories = currentProfile.id === 'business' ? DEFAULT_CATEGORIES_BUSINESS : DEFAULT_CATEGORIES;
  const safeData = data || { months: {}, categories: defCategories, partners: [], recurring: [], radar: [], trash: [], expected: [] };
  const monthData  = getMonthWithCarryForward(JSON.parse(JSON.stringify(safeData)), currentKey);
  const categories = mergeCategories(safeData.categories, currentProfile.id);
  const partners   = safeData.partners   || (currentProfile.id === 'business' ? DEFAULT_BUSINESS_PARTNERS : []);
  const recurring  = safeData.recurring  || [];
  const radar      = safeData.radar      || [];
  const trash      = safeData.trash      || [];
  const expected   = safeData.expected   || [];

  function changeMonth(dir) {
    const [y, m] = currentKey.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentKey(monthKey(d.getFullYear(), d.getMonth() + 1));
  }

  function addEntry(entry) {
    update(d => {
      getMonthWithCarryForward(d, currentKey).entries.push({ ...entry, id: uid(), returns: [] });
    });
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
        if (entryId) {
          const mo = getMonthWithCarryForward(d, currentKey);
          mo.entries = mo.entries.filter(e => e.id !== entryId);
          delete r._entryId[currentKey];
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
    update(d => {
      if (!d.months) d.months = {};
      d.months['2026-10'] = {
        basepower: 0,
        entries: JSON.parse(JSON.stringify(SHEET_ENTRIES_OCT_2026)),
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

  return {
    data: safeData, monthData, currentKey, changeMonth, ready, syncing,
    addEntry, editEntry, deleteEntry, setBasepower, addReturn, addRepayment,
    trash, moveToTrash, restoreEntry, deleteEntryPermanent, clearTrash,
    categories, saveCategory, deleteCategory, reorderCategories,
    recurring, addRecurring, editRecurring, deleteRecurring, markRecurring,
    radar, addRadarItem, markRadarBought, discardRadarItem,
    expected, addExpectedItem, editExpectedItem, deleteExpectedItem, markExpectedReceived,
    theme, toggleTheme,
    activeProfile: currentProfile, profiles: PROFILES,
    partners, importSheetData, clearProfileData,
  };
}