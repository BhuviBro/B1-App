const KEY = 'b1-v2';

export const DEFAULT_CATEGORIES = {
  debit: [
    { id: 'food',      name: 'Food',      icon: 'food',      type: 'debit' },
    { id: 'fuel',      name: 'Fuel',      icon: 'fuel',      type: 'debit' },
    { id: 'travel',    name: 'Travel',    icon: 'travel',    type: 'debit' },
    { id: 'shopping',  name: 'Shopping',  icon: 'shopping',  type: 'debit' },
    { id: 'rent',      name: 'Rent',      icon: 'rent',      type: 'debit' },
    { id: 'medical',   name: 'Medical',   icon: 'medical',   type: 'debit' },
    { id: 'repayment', name: 'Repayment', icon: 'repayment', type: 'debit' },
    { id: 'daily',     name: 'Daily',     icon: 'other',     type: 'debit' },
    { id: 'other_d',   name: 'Other',     icon: 'other',     type: 'debit' },
  ],
  credit: [
    { id: 'salary',    name: 'Salary',    icon: 'salary',    type: 'credit' },
    { id: 'received',  name: 'Received',  icon: 'received',  type: 'credit' },
    { id: 'freelance', name: 'Freelance', icon: 'salary',    type: 'credit' },
    { id: 'bonus',     name: 'Bonus',     icon: 'salary',    type: 'credit' },
    { id: 'other_c',   name: 'Other',     icon: 'other',     type: 'credit' },
  ],
  returnable: [
    { id: 'lent_cash', name: 'Cash',  icon: 'repayment', type: 'returnable' },
    { id: 'lent_upi',  name: 'UPI',   icon: 'received',  type: 'returnable' },
    { id: 'lent_other',name: 'Other', icon: 'other',     type: 'returnable' },
  ],
};

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    const old = localStorage.getItem('b1-v1');
    if (old) {
      const parsed = JSON.parse(old);
      const migrated = { months: parsed.months || {}, categories: DEFAULT_CATEGORIES, recurring: [] };
      saveData(migrated);
      return migrated;
    }
    return { months: {}, categories: DEFAULT_CATEGORIES, recurring: [] };
  } catch { return { months: {}, categories: DEFAULT_CATEGORIES, recurring: [] }; }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getMonthWithCarryForward(data, key) {
  if (!data.months[key]) {
    const prevKey = prevMonthKey(key);
    const prevClosing = getClosingBalance(data, prevKey);
    data.months[key] = {
      basepower: prevClosing !== null ? Math.max(0, prevClosing) : 0,
      entries: [],
      basepowerAutoFilled: prevClosing !== null,
    };
  }
  return data.months[key];
}

export function getClosingBalance(data, key) {
  const md = data.months?.[key];
  if (!md) return null;
  return calcSummary(md, data.months).remaining;
}

export function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d.getFullYear(), d.getMonth() + 1);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function fmtDate(str) {
  if (!str) return '';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [, m, d] = str.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

export function fmtDateTime(date, time) {
  const d = fmtDate(date);
  if (!time) return d;
  const [h, min] = time.split(':');
  const hr = parseInt(h);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const h12 = hr % 12 || 12;
  return `${d} · ${h12}:${min} ${ampm}`;
}

export function fmt(n) {
  return '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
}

export function calcSummary(monthData, allMonthsData) {
  const entries = monthData.entries || [];
  const income  = entries.filter(e => e.type === 'credit' && !e.isReturnCredit).reduce((s, e) => s + e.amount, 0);
  const spent   = entries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);

  // netLent — only current month's pending
  const lent     = entries.filter(e => e.type === 'returnable').reduce((s, e) => s + e.amount, 0);
  const returned = entries.filter(e => e.type === 'returnable').reduce((s, e) =>
    s + (e.returns || []).reduce((rs, r) => rs + r.amount, 0), 0);
  const netLent = Math.max(0, lent - returned);

  // netLent across ALL months for display in Lent card
  let totalNetLent = netLent;
  if (allMonthsData) {
    totalNetLent = 0;
    Object.values(allMonthsData).forEach(mo => {
      (mo.entries || []).filter(e => e.type === 'returnable').forEach(e => {
        const ret = (e.returns || []).reduce((s, r) => s + r.amount, 0);
        totalNetLent += Math.max(0, e.amount - ret);
      });
    });
  }

  const totalBalance = (monthData.basepower || 0) + income;
  // remaining uses only current month netLent — previous months already baked into opening balance
  const remaining    = totalBalance - spent - netLent;
  return { totalBalance, income, spent, netLent: totalNetLent, remaining };
}
export function calcOverallBalance(data) {
  let total = 0;
  Object.values(data.months || {}).forEach(m => {
    const e = m.entries || [];
    total += (m.basepower || 0);
    total += e.filter(x => x.type === 'credit').reduce((s, x) => s + x.amount, 0);
    total -= e.filter(x => x.type === 'debit').reduce((s, x) => s + x.amount, 0);
    const lent = e.filter(x => x.type === 'returnable').reduce((s, x) => s + x.amount, 0);
    const ret  = e.filter(x => x.type === 'returnable').reduce((s, x) =>
      s + (x.returns || []).reduce((r, rv) => r + rv.amount, 0), 0);
    total -= (lent - ret);
  });
  // avoid double counting basepowers — only keep current month's
  const monthKeys = Object.keys(data.months || {}).sort();
  if (monthKeys.length > 1) {
    monthKeys.slice(0, -1).forEach(k => {
      total -= (data.months[k].basepower || 0);
    });
  }
  return total;
}

export function getCategoryDef(categoryId, type, customCategories) {
  const cats = customCategories?.[type] || DEFAULT_CATEGORIES[type] || [];
  return cats.find(c => c.id === categoryId || c.name?.toLowerCase() === categoryId?.toLowerCase()) || null;
}

export function getRecurringDueStatus(rec, mKey) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m] = mKey.split('-').map(Number);
  const dueDate  = new Date(y, m - 1, rec.dueDay);
  const alertDate = new Date(dueDate);
  alertDate.setDate(alertDate.getDate() - (rec.alertDaysBefore ?? 5));
  const isPaid    = rec.history?.[mKey] === 'paid';
  const isSkipped = rec.history?.[mKey] === 'skipped';
  const isOverdue = !isPaid && !isSkipped && today > dueDate;
  const isDueSoon = !isPaid && !isSkipped && today >= alertDate && today <= dueDate;
  return { isPaid, isSkipped, isOverdue, isDueSoon };
}

export function uid_radar() {
  return 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export function buildSmartLabel(label, categoryId, type, customCategories) {
  const cats = customCategories?.[type] || DEFAULT_CATEGORIES[type] || [];
  const cat = cats.find(c => c.id === categoryId);
  const catName = cat?.name || '';
  const trimmed = label?.trim() || '';
  if (!trimmed && catName) return catName;
  if (trimmed && catName) return `${catName} — ${trimmed}`;
  return trimmed || catName || 'Entry';
}
