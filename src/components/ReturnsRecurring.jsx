import { useState } from 'react';
import { fmt, getRecurringDueStatus } from '../utils/storage';
import { Icon } from './Icons';
import s from './Returns.module.css';
import rs from './Recurring.module.css';
import ae from './AddEntry.module.css';

export default function ReturnsRecurring({
  recurring, currentKey,
  onAddRecurring, onEditRecurring, onDeleteRecurring, onMarkRecurring,
  categories,
}) {
  const [expanded, setExpanded] = useState(null);
  const [recSheet, setRecSheet] = useState(null);
  const [recLabel, setRecLabel] = useState('');
  const [recAmt, setRecAmt] = useState('');
  const [recDay, setRecDay] = useState('1');
  const [recAlert, setRecAlert] = useState('5');
  const [recCat, setRecCat] = useState('other_d');

  function openAddRec() {
    setRecLabel(''); setRecAmt(''); setRecDay('1'); setRecAlert('5'); setRecCat('other_d');
    setRecSheet({ mode: 'add' });
  }

  function openEditRec(rec) {
    setRecLabel(rec.label);
    setRecAmt(String(rec.amount));
    setRecDay(String(rec.dueDay));
    setRecAlert(String(rec.alertDaysBefore ?? 5));
    setRecCat(rec.category || 'other_d');
    setRecSheet({ mode: 'edit', rec });
  }

  function saveRec() {
    if (!recLabel.trim() || !(parseFloat(recAmt) > 0)) return;
    const payload = {
      label: recLabel.trim(),
      amount: parseFloat(recAmt),
      dueDay: parseInt(recDay) || 1,
      alertDaysBefore: parseInt(recAlert) || 5,
      category: recCat,
    };
    if (recSheet.mode === 'edit') onEditRecurring(recSheet.rec.id, payload);
    else onAddRecurring(payload);
    setRecSheet(null);
  }

  const items = (recurring || []).map(r => ({
    ...r,
    status: getRecurringDueStatus(r, currentKey),
  }));

  return (
    <div>
      <div className={s.secHdr}>
        <span className={s.sectionLabel} style={{ padding: 0 }}>RECURRING PAYMENTS</span>
        <button className={s.addBtn} onClick={openAddRec}>+ Add</button>
      </div>
      <p className={s.hint}>Alerts appear on Command 5 days before due date.</p>

      {items.length === 0 && (
        <div className={s.empty}>
          <Icon name="recurring" size={32} stroke="var(--text3)" />
          <div className={s.emptyTxt}>No recurring payments set up.<br />Tap + Add to track monthly bills.</div>
        </div>
      )}

      {items.map(r => {
        const { isPaid, isSkipped, isOverdue, isDueSoon } = r.status;
        const isExp = expanded === r.id;

        return (
          <div key={r.id} className={`${rs.card} ${isExp ? rs.cardExp : ''}`}>
            <div className={rs.cardHead} onClick={() => setExpanded(isExp ? null : r.id)}>
              <div className={rs.headLeft}>
                <div className={rs.recName}>{r.label}</div>
                <div className={rs.recMeta}>
                  Due day {r.dueDay} · {fmt(r.amount)}
                  {isDueSoon && !isPaid && <span className={rs.tagDue}>Due Soon</span>}
                  {isOverdue && !isPaid && <span className={rs.tagOverdue}>Overdue</span>}
                  {isPaid && <span className={rs.tagPaid}>Paid</span>}
                  {isSkipped && <span className={rs.tagSkipped}>Skipped</span>}
                </div>
              </div>
              <span className={rs.caret}>{isExp ? '▼' : '▶'}</span>
            </div>

            {isExp && (
              <div className={rs.cardBody}>
                <div className={rs.recActions}>
                  {!isPaid && !isSkipped && (
                    <>
                      <button className={rs.btnPaid} onClick={() => onMarkRecurring(r.id, 'paid')}>Mark Paid</button>
                      <button className={rs.btnSkip} onClick={() => onMarkRecurring(r.id, 'skipped')}>Skip</button>
                    </>
                  )}
                  {(isPaid || isSkipped) && (
                    <button className={rs.btnUndo} onClick={() => onMarkRecurring(r.id, null)}>Undo</button>
                  )}
                </div>
                <div className={rs.recActionsRow}>
                  <button className={rs.btnEdit} onClick={() => openEditRec(r)}>Edit</button>
                  <button className={rs.btnDelete} onClick={() => onDeleteRecurring(r.id)}>Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add / Edit Recurring Sheet */}
      {recSheet && (
        <>
          <div className={s.overlay} onClick={() => setRecSheet(null)} />
          <div className={s.retSheet}>
            <div className={s.handle} />
            <div className={s.sheetHdr}>
              <span className={s.sheetTitle}>{recSheet.mode === 'add' ? 'Add' : 'Edit'} Recurring</span>
              <button className={s.sheetClose} onClick={() => setRecSheet(null)}>✕</button>
            </div>
            <div className={s.sheetBody}>
              <div className={s.field}>
                <label className={s.lbl}>Label</label>
                <input
                  className={s.input}
                  value={recLabel}
                  onChange={e => setRecLabel(e.target.value)}
                  placeholder="e.g. Rent, Electricity, Netflix…"
                  autoFocus
                />
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.lbl}>Amount ₹</label>
                  <input
                    className={`${s.input} ${s.mono}`}
                    type="number"
                    value={recAmt}
                    onChange={e => setRecAmt(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
                <div className={s.field}>
                  <label className={s.lbl}>Due Day (1–31)</label>
                  <input
                    className={`${s.input} ${s.mono}`}
                    type="number"
                    min="1"
                    max="31"
                    value={recDay}
                    onChange={e => setRecDay(e.target.value)}
                    placeholder="1–31"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.lbl}>Alert days before</label>
                <input
                  className={`${s.input} ${s.mono}`}
                  type="number"
                  min="1"
                  max="15"
                  value={recAlert}
                  onChange={e => setRecAlert(e.target.value)}
                  placeholder="5"
                  inputMode="numeric"
                />
                <span className={s.hint} style={{ margin: '4px 0 0' }}>
                  Alert {recAlert || 5} days before day {recDay || 1} each month.
                </span>
              </div>
              <div className={s.field}>
                <label className={s.lbl}>Category</label>
                <div className={ae.catGrid} style={{ marginTop: '6px' }}>
                  {(categories?.debit || []).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`${ae.catPill} ${recCat === cat.id ? ae.catSel : ''}`}
                      onClick={() => setRecCat(cat.id)}
                    >
                      <Icon name={cat.icon || 'other'} size={13} stroke="currentColor" />
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={s.sheetFooter}>
              <button className={s.btnCancel} onClick={() => setRecSheet(null)}>Cancel</button>
              <button
                className={s.btnSave}
                onClick={saveRec}
                disabled={!recLabel.trim() || !(parseFloat(recAmt) > 0)}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
