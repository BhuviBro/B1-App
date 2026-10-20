import { useState, useEffect } from 'react';
import { todayStr, nowTimeStr, buildSmartLabel } from '../utils/storage';
import s from './AddEntry.module.css';
import { Icon } from './Icons';

export default function AddEntry({ open, onClose, onSave, editEntry, categories }) {
  const [label, setLabel]       = useState('');
  const [amount, setAmount]     = useState('');
  const [type, setType]         = useState('debit');
  const [category, setCategory] = useState('');
  const [person, setPerson]     = useState('');
  const [date, setDate]         = useState(todayStr());
  const [time, setTime]         = useState(nowTimeStr());
  const [subItems, setSubItems] = useState([]);

  useEffect(() => {
    if (open) {
      if (editEntry) {
        setLabel(editEntry.label || '');
        setAmount(editEntry.amount || '');
        setType(editEntry.type || 'debit');
        setCategory(editEntry.category || getDefaultCat('debit'));
        setPerson(editEntry.person || '');
        setDate(editEntry.date || todayStr());
        setTime(editEntry.time || nowTimeStr());
        setSubItems(editEntry.subItems || []);
      } else {
        setLabel(''); setAmount('');
        setType('debit');
        setCategory(getDefaultCat('debit'));
        setPerson('');
        setDate(todayStr()); setTime(nowTimeStr());
        setSubItems([]);
      }
    }
  }, [editEntry, open]);

  useEffect(() => {
    if (!editEntry) setCategory(getDefaultCat(type));
  }, [type]);

  function getDefaultCat(t) {
    const cats = categories?.[t] || [];
    return cats[0]?.id || 'other';
  }

  function getTypeCats() {
    return categories?.[type] || [];
  }

  function addSub() { setSubItems(p => [...p, { name: '', amount: '' }]); }
 function updateSub(i, field, val) {
  setSubItems(p => {
    const updated = p.map((si, idx) => idx === i ? { ...si, [field]: val } : si);
    const total = updated.reduce((s, si) => s + (parseFloat(si.amount) || 0), 0);
    if (total > 0) setAmount(String(total));
    return updated;
  });
}
function removeSub(i) {
  setSubItems(p => {
    const updated = p.filter((_, idx) => idx !== i);
    const total = updated.reduce((s, si) => s + (parseFloat(si.amount) || 0), 0);
    if (total > 0) setAmount(String(total));
    return updated;
  });
}
 function handleSave() {
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return;
  const finalCat = category || getDefaultCat(type);
  const finalLabel = buildSmartLabel(label, finalCat, type, categories);
  const cleanSubs = subItems
    .filter(si => si.name || si.amount)
    .map(si => ({ name: si.name || 'item', amount: parseFloat(si.amount) || 0 }));
  onSave({
    label: finalLabel,
    amount: amt,
    type,
    category: finalCat,
    person: person.trim(),
    date, time,
    subItems: cleanSubs,
    ...(editEntry?.isRecurringPay && { isRecurringEntry: true, recurringId: editEntry.recurringId }),
  });
  onClose();
}

  const typeCats = getTypeCats();
  const isEdit = !!editEntry;
  const canSave = parseFloat(amount) > 0;

  return (
    <>
      <div className={`${s.overlay} ${open ? s.show : ''}`} onClick={onClose} />
      <div className={`${s.sheet} ${open ? s.open : ''}`}>
        <div className={s.handle} />

        <div className={s.header}>
          <span className={s.title}>{isEdit ? 'Edit Entry' : 'Add Entry'}</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={s.body}>
          {/* Type selector */}
          <div className={s.typeRow}>
            {['debit','credit','returnable','borrowed'].map(t => (
              <button
                key={t}
                className={`${s.typeBtn} ${type === t ? s['type_' + t] : ''}`}
                onClick={() => setType(t)}
              >
                {t === 'debit' ? 'Debit' : t === 'credit' ? 'Credit' : t === 'returnable' ? 'Lent' : 'Borrowed'}
              </button>
            ))}
          </div>

          {/* Recurring / EMI notice */}
          {editEntry?.isRecurringPay && (
            <div className={s.recurringNotice}>
              <div className={s.recurringNoticeHdr}>
                <span className={s.recurringNoticeBadge}>
                  {editEntry.isLoan ? '🏦 LOAN / EMI PAYMENT' : '🔄 RECURRING PAYMENT'}
                </span>
                <span className={s.recurringNoticeLabel}>{editEntry.label}</span>
              </div>
              <div className={s.recurringNoticeSub}>
                Standard EMI: ₹{editEntry.baseEmi || editEntry.amount}. You can alter this amount for this payment below.
              </div>
            </div>
          )}

          {/* AMOUNT — hero field at top */}
          <div className={s.amountHero}>
            <label className={s.amountLbl}>Amount ₹</label>
            <input
              className={s.amountInput}
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              autoFocus={open && !isEdit}
            />
          </div>

          {/* Label — optional */}
          <div className={s.field}>
            <label className={s.lbl}>
              Label <span className={s.optional}>optional</span>
            </label>
            <input
              className={s.input}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Bharat Petrol, Swiggy…"
            />
          </div>

          {/* Person field for returnable and borrowed */}
          {(type === 'returnable' || type === 'borrowed') && (
            <div className={s.field}>
              <label className={s.lbl}>Person</label>
              <input
                className={s.input}
                value={person}
                onChange={e => setPerson(e.target.value)}
                placeholder="e.g. Amma, Mona…"
              />
            </div>
          )}

          {/* Category pills */}
          <div className={s.field}>
            <label className={s.lbl}>Category</label>
            <div className={s.catGrid}>
              {typeCats.map(c => (
                <button
                  key={c.id}
                  className={`${s.catPill} ${category === c.id ? s.catSel : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  <Icon name={c.icon || 'other'} size={13} stroke="currentColor" />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className={s.row2}>
            <div className={s.field}>
              <label className={s.lbl}>Date</label>
              <input
                className={`${s.input} ${s.mono}`}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className={s.fieldSm}>
              <label className={s.lbl}>Time</label>
              <input
                className={`${s.input} ${s.mono}`}
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Breakdown - only for debit and credit */}
          {type !== 'returnable' && type !== 'borrowed' && (
            <div className={s.field}>
              <label className={s.lbl}>
                Breakdown <span className={s.optional}>optional</span>
              </label>
              {subItems.length > 0 && (
                <div className={s.subWrap}>
                  {subItems.map((si, i) => (
                    <div key={i} className={s.subRow}>
                      <input className={s.subName} value={si.name} onChange={e => updateSub(i,'name',e.target.value)} placeholder="item" />
                      <input className={`${s.subAmt} ${s.mono}`} type="number" value={si.amount} onChange={e => updateSub(i,'amount',e.target.value)} placeholder="₹" inputMode="decimal" />
                      <button className={s.subDel} onClick={() => removeSub(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button className={s.addSubLink} onClick={addSub}>+ Add item</button>
            </div>
          )}
        </div>

        <div className={s.footer}>
          <button className={s.btnCancel} onClick={onClose}>Cancel</button>
          <button
            className={`${s.btnSave} ${canSave ? s.btnSaveActive : ''}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            Save Entry
          </button>
        </div>
      </div>
    </>
  );
}
