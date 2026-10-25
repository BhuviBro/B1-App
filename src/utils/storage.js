const KEY = 'b1-v2';

export const DEFAULT_CATEGORIES = {
  debit: [
    { id: 'food',      name: 'Food',      icon: 'food',      type: 'debit' },
    { id: 'slice',     name: 'Slice',     icon: 'other',     type: 'debit' },
    { id: 'fuel',      name: 'Fuel',      icon: 'fuel',      type: 'debit' },
    { id: 'shopping',  name: 'Shopping',  icon: 'shopping',  type: 'debit' },
    { id: 'travel',    name: 'Travel',    icon: 'travel',    type: 'debit' },
    { id: 'daily',     name: 'Daily',     icon: 'other',     type: 'debit' },
    { id: 'rent',      name: 'Rent',      icon: 'rent',      type: 'debit' },
    { id: 'medical',   name: 'Medical',   icon: 'medical',   type: 'debit' },
    { id: 'other_d',   name: 'Other',     icon: 'other',     type: 'debit' },
    { id: 'repayment', name: 'Repayment', icon: 'repayment', type: 'debit' },
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
  borrowed: [
    { id: 'borrow_cash',  name: 'Cash',  icon: 'repayment', type: 'borrowed' },
    { id: 'borrow_upi',   name: 'UPI',   icon: 'received',  type: 'borrowed' },
    { id: 'borrow_other', name: 'Other', icon: 'other',     type: 'borrowed' },
  ],
};

export const PROFILES = [
  { id: 'personal', name: 'Personal', docId: 'personal' },
  { id: 'business', name: 'Business', docId: 'business' },
];

export const DEFAULT_BUSINESS_PARTNERS = [
  { id: 'bhuvan',  name: 'Bhuvan',  sharePct: 38.0, allocated: 1978.28, withdrawn: 567.50, available: 1410.78, color: '#a78bfa' },
  { id: 'kushal',  name: 'Kushal',  sharePct: 15.5, allocated: 806.93,  withdrawn: 567.50, available: 239.43,  color: '#38bdf8' },
  { id: 'amulya',  name: 'Amulya',  sharePct: 15.5, allocated: 806.93,  withdrawn: 0,      available: 806.93,  color: '#fbbf24' },
  { id: 'deepika', name: 'Deepika', sharePct: 15.5, allocated: 806.93,  withdrawn: 0,      available: 806.93,  color: '#f472b6' },
  { id: 'anagha',  name: 'Anagha',  sharePct: 15.5, allocated: 806.93,  withdrawn: 0,      available: 806.93,  color: '#34d399' },
];

export const SHEET_ENTRIES_OCT_2026 = [
  { id: 'sh_01', type: 'credit', label: 'Investment',                  amount: 1500,   category: 'investment',         date: '2026-10-01', time: '09:30', returns: [] },
  { id: 'sh_02', type: 'debit',  label: 'NFC Cards -1',                amount: 500,    category: 'raw_materials',      date: '2026-10-01', time: '11:15', returns: [] },
  { id: 'sh_03', type: 'debit',  label: 'Print and Acrylic 1',         amount: 1000,   category: 'raw_materials',      date: '2026-10-02', time: '10:00', returns: [] },
  { id: 'sh_04', type: 'credit', label: 'First Day Sale',              amount: 300,    category: 'sale',               date: '2026-10-02', time: '14:30', returns: [] },
  { id: 'sh_05', type: 'debit',  label: 'Temple',                      amount: 50,     category: 'raw_materials',      date: '2026-10-03', time: '09:00', returns: [] },
  { id: 'sh_06', type: 'credit', label: 'Way Back to Hassan from K2N', amount: 3200,   category: 'sale',               date: '2026-10-03', time: '12:45', returns: [] },
  { id: 'sh_07', type: 'debit',  label: 'Bhuvan Petrol',               amount: 600,    category: 'food_travel',        date: '2026-10-04', time: '10:15', returns: [] },
  { id: 'sh_08', type: 'debit',  label: 'Kushal Petrol',               amount: 150,    category: 'food_travel',        date: '2026-10-04', time: '16:00', returns: [] },
  { id: 'sh_09', type: 'credit', label: 'Advance for K2n',             amount: 2000,   category: 'sale',               date: '2026-10-05', time: '11:30', returns: [] },
  { id: 'sh_10', type: 'debit',  label: 'Advance Acrylic',             amount: 500,    category: 'raw_materials',      date: '2026-10-05', time: '15:00', returns: [] },
  { id: 'sh_11', type: 'debit',  label: 'NFC Cards -2',                amount: 510,    category: 'raw_materials',      date: '2026-10-06', time: '10:00', returns: [] },
  { id: 'sh_12', type: 'debit',  label: 'Petrol',                      amount: 100,    category: 'food_travel',        date: '2026-10-09', time: '09:00', returns: [] },
  { id: 'sh_13', type: 'debit',  label: 'balance payment to Acrylic',  amount: 500,    category: 'raw_materials',      date: '2026-10-11', time: '09:00', returns: [] },
  { id: 'sh_14', type: 'credit', label: 'Complete Balance 2000',       amount: 2000,   category: 'sale',               date: '2026-10-20', time: '09:00', returns: [] },
  { id: 'sh_15', type: 'debit',  label: 'Petrol',                      amount: 600,    category: 'food_travel',        date: '2026-10-23', time: '09:00', returns: [] },
  { id: 'sh_16', type: 'debit',  label: 'Profit Withdrawal - Kushal',  amount: 567.50, category: 'share_distribution', date: '2026-10-23', time: '10:00', returns: [], partner: 'Kushal' },
  { id: 'sh_17', type: 'debit',  label: 'Profit Withdrawal - Bhuvan',  amount: 567.50, category: 'share_distribution', date: '2026-10-23', time: '10:05', returns: [], partner: 'Bhuvan' },
  { id: 'sh_18', type: 'debit',  label: 'Petrol - Bhuvan - 100',       amount: 100,    category: 'food_travel',        date: '2026-10-24', time: '09:00', returns: [] },
  { id: 'sh_19', type: 'debit',  label: 'Bhavani Printout for Naivedyam', amount: 80,  category: 'raw_materials',      date: '2026-10-24', time: '10:00', returns: [] },
  { id: 'sh_20', type: 'debit',  label: 'Petrol-Kushal',               amount: 600,    category: 'food_travel',        date: '2026-10-24', time: '11:00', returns: [] },
  { id: 'sh_21', type: 'credit', label: 'Advance from Naivedyam 2000, Balance 2800', amount: 2000, category: 'sale',  date: '2026-10-24', time: '10:05', returns: [] },
  { id: 'sh_22', type: 'debit',  label: 'NFC Cards -3',                amount: 504,    category: 'raw_materials',      date: '2026-10-25', time: '10:05', returns: [] },
];

export const PERSONAL_RECURRING_EMIS = [
  {
    id: 'rec_emi_5236',
    label: 'EMI — 5236',
    amount: 5236,
    dueDay: 5,
    alertDaysBefore: 5,
    category: 'repayment',
    isLoan: true,
    totalBorrowed: null,
    tenureMonths: null,
    history: { '2026-09': 'paid', '2026-10': 'paid', '2026-11': 'paid' },
  },
  {
    id: 'rec_emi_2094',
    label: 'EMI — 2094',
    amount: 2094,
    dueDay: 5,
    alertDaysBefore: 5,
    category: 'repayment',
    isLoan: true,
    totalBorrowed: null,
    tenureMonths: null,
    history: { '2026-09': 'paid', '2026-10': 'paid', '2026-11': 'paid' },
  },
  {
    id: 'rec_emi_733',
    label: 'EMI — 733',
    amount: 733,
    dueDay: 5,
    alertDaysBefore: 5,
    category: 'repayment',
    isLoan: true,
    totalBorrowed: null,
    tenureMonths: null,
    history: { '2026-09': 'paid', '2026-10': 'paid', '2026-11': 'paid' },
  },
];

export const PERSONAL_ENTRIES_OCT_2026 = [
  { id: 'p_oct_01', type: 'debit',    label: 'Egg Roll',                       amount: 90,   category: 'food',        date: '2026-10-23', time: '14:15', returns: [] },
  { id: 'p_oct_02', type: 'debit',    label: 'Spent',                          amount: 92,   category: 'other_d',     date: '2026-10-23', time: '09:30', returns: [] },
  { id: 'p_oct_03', type: 'debit',    label: 'Spent',                          amount: 204,  category: 'other_d',     date: '2026-10-23', time: '09:15', returns: [] },
  { id: 'p_oct_04', type: 'debit',    label: 'Spent',                          amount: 507,  category: 'other_d',     date: '2026-10-23', time: '09:00', returns: [] },
  { id: 'p_oct_05', type: 'debit',    label: 'Adjusting to Current Balance',   amount: 167,  category: 'daily',       date: '2026-10-23', time: '00:35', returns: [] },
  { id: 'p_oct_06', type: 'debit',    label: 'Daily',                          amount: 23,   category: 'food',        date: '2026-10-23', time: '00:34', returns: [] },
  { id: 'p_oct_07', type: 'credit',   label: 'Adjsting for EMI Error',         amount: 2111, category: 'salary',      date: '2026-10-23', time: '00:33', returns: [] },
  { id: 'p_oct_08', type: 'debit',    label: 'Parking Charges',                amount: 30,   category: 'fuel',        date: '2026-10-22', time: '22:15', returns: [] },
  { id: 'p_oct_09', type: 'borrowed', label: 'Puff and Juice',                 amount: 65,   category: 'borrow_cash', date: '2026-10-22', time: '19:15', returns: [] },
  { id: 'p_oct_10', type: 'debit',    label: 'Train Ticket',                   amount: 80,   category: 'travel',      date: '2026-10-22', time: '18:45', returns: [] },
  { id: 'p_oct_11', type: 'debit',    label: 'Power Bank',                     amount: 950,  category: 'shopping',    date: '2026-10-22', time: '14:11', returns: [] },
  { id: 'p_oct_12', type: 'debit',    label: 'Resume Print Out',               amount: 30,   category: 'shopping',    date: '2026-10-22', time: '13:12', returns: [] },
  { id: 'p_oct_13', type: 'debit',    label: 'Food — Bus Charges',             amount: 83,   category: 'travel',      date: '2026-10-22', time: '12:10', returns: [], subItems: [{ id: 'sb_1', label: 'Bus Charges', amount: 83 }] },
  { id: 'p_oct_14', type: 'debit',    label: 'Dosa Tindi',                     amount: 120,  category: 'food',        date: '2026-10-22', time: '10:10', returns: [] },
  { id: 'p_oct_15', type: 'debit',    label: 'Train Ticket',                   amount: 95,   category: 'travel',      date: '2026-10-22', time: '07:09', returns: [] },
  { id: 'p_oct_16', type: 'debit',    label: 'BMTC',                           amount: 23,   category: 'travel',      date: '2026-10-22', time: '04:14', returns: [] },
  { id: 'p_oct_17', type: 'debit',    label: 'Lenkart',                        amount: 50,   category: 'food',        date: '2026-10-21', time: '20:17', returns: [] },
  { id: 'p_oct_18', type: 'borrowed', label: 'Amma Gym',                       amount: 5000, category: 'borrow_cash', date: '2026-10-21', time: '09:15', returns: [] },
  { id: 'p_oct_19', type: 'borrowed', label: 'Gowri Marriafw Gift',            amount: 1620, category: 'borrow_cash', date: '2026-10-21', time: '09:14', returns: [] },
  { id: 'p_oct_20', type: 'borrowed', label: 'Laptop Battery',                 amount: 4000, category: 'borrow_cash', date: '2026-10-21', time: '09:14', returns: [] },
  { id: 'p_oct_21', type: 'debit',    label: 'EMI — 733',                      amount: 733,  category: 'repayment',   date: '2026-10-20', time: '11:22', recurringId: 'rec_emi_733',  isRecurringEntry: true, returns: [] },
  { id: 'p_oct_22', type: 'debit',    label: 'EMI — 2094',                     amount: 2094, category: 'repayment',   date: '2026-10-20', time: '11:05', recurringId: 'rec_emi_2094', isRecurringEntry: true, returns: [] },
  { id: 'p_oct_23', type: 'debit',    label: 'EMI — 5236',                     amount: 5236, category: 'repayment',   date: '2026-10-20', time: '10:18', recurringId: 'rec_emi_5236', isRecurringEntry: true, returns: [] },
  { id: 'p_oct_24', type: 'debit',    label: 'Slice - 733',                    amount: 92,   category: 'slice',       date: '2026-10-20', time: '00:33', returns: [] },
  { id: 'p_oct_25', type: 'debit',    label: 'Slice - 5236 -Kredit Bee',       amount: 507,  category: 'slice',       date: '2026-10-20', time: '00:32', returns: [] },
  { id: 'p_oct_26', type: 'debit',    label: 'Slice - 2094 -KreditBee',        amount: 204,  category: 'slice',       date: '2026-10-20', time: '00:32', returns: [] },
];

export const PERSONAL_ENTRIES_SEP_2026 = [
  { id: 'p_sep_01', type: 'debit', label: 'EMI — 733',                amount: 733,  category: 'repayment', date: '2026-09-09', time: '15:42', recurringId: 'rec_emi_733',  isRecurringEntry: true, returns: [] },
  { id: 'p_sep_02', type: 'debit', label: 'EMI — 2094',               amount: 2094, category: 'repayment', date: '2026-09-09', time: '15:30', recurringId: 'rec_emi_2094', isRecurringEntry: true, returns: [] },
  { id: 'p_sep_03', type: 'debit', label: 'EMI — 5236',               amount: 5236, category: 'repayment', date: '2026-09-09', time: '14:15', recurringId: 'rec_emi_5236', isRecurringEntry: true, returns: [] },
  { id: 'p_sep_04', type: 'debit', label: 'Slice - 5236 -Kredit Bee', amount: 507,  category: 'slice',     date: '2026-09-09', time: '00:32', returns: [] },
  { id: 'p_sep_05', type: 'debit', label: 'Slice - 2094 -KreditBee',  amount: 204,  category: 'slice',     date: '2026-09-09', time: '00:32', returns: [] },
  { id: 'p_sep_06', type: 'debit', label: 'Slice - 733',              amount: 92,   category: 'slice',     date: '2026-09-09', time: '00:32', returns: [] },
  { id: 'p_sep_07', type: 'debit', label: 'EMI — 5236',               amount: 5236, category: 'repayment', date: '2026-09-05', time: '11:24', recurringId: 'rec_emi_5236', isRecurringEntry: true, returns: [] },
  { id: 'p_sep_08', type: 'debit', label: 'Slice - 5236 -Kredit Bee', amount: 507,  category: 'slice',     date: '2026-09-05', time: '00:32', returns: [] },
];

export const DEFAULT_CATEGORIES_BUSINESS = {
  debit: [
    { id: 'raw_materials',      name: 'Raw Materials',      icon: 'shopping', type: 'debit' },
    { id: 'food_travel',        name: 'Food & Travel',      icon: 'travel',   type: 'debit' },
    { id: 'share_distribution', name: 'Share Distribution', icon: 'salary',   type: 'debit' },
    { id: 'materials',          name: 'Materials',          icon: 'shopping', type: 'debit' },
    { id: 'marketing',          name: 'Marketing',          icon: 'other',    type: 'debit' },
    { id: 'software',           name: 'Software',           icon: 'other',    type: 'debit' },
    { id: 'salaries',           name: 'Salaries',           icon: 'salary',   type: 'debit' },
    { id: 'travel',             name: 'Travel',             icon: 'travel',   type: 'debit' },
    { id: 'other_d',            name: 'Other',              icon: 'other',    type: 'debit' },
  ],
  credit: [
    { id: 'sale',          name: 'Sale',          icon: 'received',  type: 'credit' },
    { id: 'investment',    name: 'Investment',    icon: 'salary',    type: 'credit' },
    { id: 'client_pay',    name: 'Client Payment',icon: 'received',  type: 'credit' },
    { id: 'other_c',       name: 'Other',         icon: 'other',     type: 'credit' },
  ],
  returnable: [
    { id: 'lent_cash',  name: 'Cash',  icon: 'repayment', type: 'returnable' },
    { id: 'lent_upi',   name: 'UPI',   icon: 'received',  type: 'returnable' },
    { id: 'lent_other', name: 'Other', icon: 'other',     type: 'returnable' },
  ],
  borrowed: [
    { id: 'borrow_cash',  name: 'Cash',  icon: 'repayment', type: 'borrowed' },
    { id: 'borrow_upi',   name: 'UPI',   icon: 'received',  type: 'borrowed' },
    { id: 'borrow_other', name: 'Other', icon: 'other',     type: 'borrowed' },
  ],
};

export function mergeCategories(savedCats, profileId = 'personal') {
  const defs = profileId === 'business' ? DEFAULT_CATEGORIES_BUSINESS : DEFAULT_CATEGORIES;
  if (!savedCats) return defs;
  const businessCatIds = new Set(['raw_materials', 'food_travel', 'share_distribution', 'materials', 'marketing', 'software', 'salaries', 'sale', 'investment', 'client_pay']);
  const personalCatIds = new Set(['food', 'slice', 'daily', 'rent', 'medical', 'repayment', 'salary', 'received', 'freelance', 'bonus']);

  const merged = {};
  for (const t of ['debit', 'credit', 'returnable', 'borrowed']) {
    let saved = savedCats[t] || [];
    if (profileId === 'personal') {
      saved = saved.filter(c => !businessCatIds.has(c.id));
    } else {
      saved = saved.filter(c => !personalCatIds.has(c.id));
    }
    const defList = defs[t] || [];
    const ids = new Set(saved.map(c => c.id));
    const toAppend = defList.filter(d => !ids.has(d.id));
    merged[t] = [...saved, ...toAppend];
  }
  return merged;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...parsed, categories: mergeCategories(parsed.categories) };
    }
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
  const spent   = entries.filter(e => e.type === 'debit' && !e.isBorrowRepayment).reduce((s, e) => s + e.amount, 0);

  // netLent — only current month's pending
  const lent     = entries.filter(e => e.type === 'returnable').reduce((s, e) => s + e.amount, 0);
  const returned = entries.filter(e => e.type === 'returnable').reduce((s, e) =>
    s + (e.returns || []).reduce((rs, r) => rs + r.amount, 0), 0);
  const netLent = Math.max(0, lent - returned);

  // netBorrowed — only current month's pending
  const borrowed = entries.filter(e => e.type === 'borrowed').reduce((s, e) => s + e.amount, 0);
  const repaid   = entries.filter(e => e.type === 'borrowed').reduce((s, e) =>
    s + (e.returns || []).reduce((rs, r) => rs + r.amount, 0), 0);
  const netBorrowed = Math.max(0, borrowed - repaid);

  // netLent across ALL months for display in Lent card & Borrowed card
  let totalNetLent = netLent;
  let totalNetBorrowed = netBorrowed;
  if (allMonthsData) {
    totalNetLent = 0;
    totalNetBorrowed = 0;
    Object.values(allMonthsData).forEach(mo => {
      (mo.entries || []).forEach(e => {
        if (e.type === 'returnable') {
          const ret = (e.returns || []).reduce((s, r) => s + r.amount, 0);
          totalNetLent += Math.max(0, e.amount - ret);
        } else if (e.type === 'borrowed') {
          const rep = (e.returns || []).reduce((s, r) => s + r.amount, 0);
          totalNetBorrowed += Math.max(0, e.amount - rep);
        }
      });
    });
  }

  const totalBalance = (monthData.basepower || 0) + income;
  // remaining uses only current month netLent & netBorrowed — previous months already baked into opening balance
  const remaining    = totalBalance - spent - netLent + netBorrowed;
  return { totalBalance, income, spent, netLent: totalNetLent, netBorrowed: totalNetBorrowed, remaining };
}
export function calcOverallBalance(data) {
  let total = 0;
  let pendingLent = 0;
  let pendingBorrowed = 0;

  Object.values(data.months || {}).forEach(m => {
    const e = m.entries || [];
    total += (m.basepower || 0);
    total += e.filter(x => x.type === 'credit' && !x.isReturnCredit).reduce((s, x) => s + x.amount, 0);
    total -= e.filter(x => x.type === 'debit' && !x.isBorrowRepayment).reduce((s, x) => s + x.amount, 0);
    e.filter(x => x.type === 'returnable').forEach(x => {
      const ret = (x.returns || []).reduce((r, rv) => r + rv.amount, 0);
      pendingLent += Math.max(0, x.amount - ret);
    });
    e.filter(x => x.type === 'borrowed').forEach(x => {
      const rep = (x.returns || []).reduce((r, rv) => r + rv.amount, 0);
      pendingBorrowed += Math.max(0, x.amount - rep);
    });
  });

  total -= pendingLent;
  total += pendingBorrowed;

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
  if (trimmed && catName) {
    if (trimmed.toLowerCase().startsWith(catName.toLowerCase())) return trimmed;
    return `${catName} — ${trimmed}`;
  }
  return trimmed || catName || 'Entry';
}
