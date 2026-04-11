import { useState, useEffect } from 'react';
import { useFirestore } from './useFirestore';
import {
  getMonthWithCarryForward, uid, uid_radar,
  monthKey, DEFAULT_CATEGORIES, nowTimeStr, todayStr
} from '../utils/storage';

const now = new Date();
const INIT_KEY = monthKey(now.getFullYear(), now.getMonth() + 1);

export function useStore(uid_user) {
  const { data, ready, syncing, update } = useFirestore(uid_user);
  const [currentKey, setCurrentKey] = useState(INIT_KEY);
  const [theme, setTheme] = useState(() => localStorage.getItem('b1-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('b1-theme', theme);
  }, [theme]);

  // ── All hooks above this line — no early returns before hooks ──

  const safeData = data || { months: {}, categories: DEFAULT_CATEGORIES, recurring: [], radar: [] };
  const monthData  = getMonthWithCarryForward(JSON.parse(JSON.stringify(safeData)), currentKey);
  const categories = safeData.categories || DEFAULT_CATEGORIES;
  const recurring  = safeData.recurring  || [];
  const radar      = safeData.radar      || [];

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
      const mo = getMonthWithCarryForward(d, currentKey);
      const idx = mo.entries.findIndex(e => e.id === id);
      if (idx >= 0) mo.entries[idx] = { ...mo.entries[idx], ...entry };
    });
  }

  function deleteEntry(id) {
    update(d => {
      const mo = getMonthWithCarryForward(d, currentKey);
      mo.entries = mo.entries.filter(e => e.id !== id);
    });
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
      const mo = getMonthWithCarryForward(d, currentKey);
      const entry = mo.entries.find(x => x.id === entryId);
      if (!entry) return;
      if (!entry.returns) entry.returns = [];
      entry.returns.push({ ...ret, id: uid() });
      mo.entries.push({
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

  function saveCategory(type, cat) {
    update(d => {
      if (!d.categories) d.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
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
      if (!d.categories) d.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
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
      if (r) { if (!r.history) r.history = {}; r.history[currentKey] = status; }
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

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  return {
    data: safeData, monthData, currentKey, changeMonth, ready, syncing,
    addEntry, editEntry, deleteEntry, setBasepower, addReturn,
    categories, saveCategory, deleteCategory, reorderCategories,
    recurring, addRecurring, editRecurring, deleteRecurring, markRecurring,
    radar, addRadarItem, markRadarBought, discardRadarItem,
    theme, toggleTheme,
  };
}