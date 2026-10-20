import { useState } from 'react';
import { fmt, getRecurringDueStatus, todayStr } from '../utils/storage';
import s from './Recurring.module.css';

export default function Recurring({ recurring, currentKey, onMark, inline, onAdd, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(null);

  const items = (recurring || []).map(r => ({
    ...r,
    status: getRecurringDueStatus(r, currentKey),
  }));

  // Inline mode: only show due/overdue alerts on Command tab
  if (inline) {
    const alerts = items.filter(r => r.status.isDueSoon || r.status.isOverdue);
    if (!alerts.length) return null;
    return (
      <div className={s.alertBanner}>
        {alerts.map(r => (
          <div key={r.id} className={`${s.alert} ${r.status.isOverdue ? s.alertOverdue : s.alertDue}`}>
            <div className={s.alertLeft}>
              <span className={s.alertIcon}>{r.status.isOverdue ? '⚠' : '⏰'}</span>
              <div>
                <div className={s.alertName}>{r.label}</div>
                <div className={s.alertSub}>
                  {r.status.isOverdue ? 'Overdue' : `Due on ${r.dueDay}`} · {fmt(r.amount)}
                </div>
              </div>
            </div>
            <button
              className={s.markPaidBtn}
              onClick={() => onMark(r.id, 'paid')}
            >
              Mark Paid
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Full mode inside Settings
  return (
    <div className={s.wrap}>
      {items.length === 0 && (
        <div className={s.empty}>No recurring payments set up.<br />Add one below.</div>
      )}
      {items.map(r => {
        const { isPaid, isSkipped, isOverdue, isDueSoon } = r.status;
        const isDue = (isDueSoon || isOverdue) && !isPaid && !isSkipped;
        const isExp = expanded === r.id;
        return (
          <div key={r.id} className={`${s.card} ${isExp ? s.cardExp : ''}`}>
            <div className={s.cardHead} onClick={() => setExpanded(isExp ? null : r.id)}>
              <div className={s.headLeft}>
                <div className={s.recName}>{r.label}</div>
                <div className={s.recMeta}>
                  Due day {r.dueDay} · {fmt(r.amount)}
                  {isDueSoon && !isPaid && <span className={s.tagDue}>Due Soon</span>}
                  {isOverdue && !isPaid && <span className={s.tagOverdue}>Overdue</span>}
                  {isPaid && <span className={s.tagPaid}>Paid</span>}
                  {isSkipped && <span className={s.tagSkipped}>Skipped</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isDue && (
                  <button
                    className={s.headActionBtnDue}
                    onClick={(e) => { e.stopPropagation(); onMark(r.id, 'paid'); }}
                    title="Mark Paid"
                  >
                    Mark Paid
                  </button>
                )}
                {!isDue && !isPaid && !isSkipped && (
                  <button
                    className={s.headActionBtnPay}
                    onClick={(e) => { e.stopPropagation(); onMark(r.id, 'paid'); }}
                    title="Add Payment"
                  >
                    Add Payment
                  </button>
                )}
                {isPaid && (
                  <button
                    className={s.headActionBtnAddMore}
                    onClick={(e) => { e.stopPropagation(); onMark(r.id, 'paid'); }}
                    title="Add another payment"
                  >
                    + Add Payment
                  </button>
                )}
                <span className={s.caret}>{isExp ? '▼' : '▶'}</span>
              </div>
            </div>
            {isExp && (
              <div className={s.cardBody}>
                <div className={s.recActions}>
                  {!isPaid && !isSkipped && (
                    <>
                      {isDue ? (
                        <button className={s.btnPaid} onClick={() => onMark(r.id, 'paid')}>Mark Paid</button>
                      ) : (
                        <button className={s.btnAddPayment} onClick={() => onMark(r.id, 'paid')}>Add Payment</button>
                      )}
                      <button className={s.btnSkip} onClick={() => onMark(r.id, 'skipped')}>Skip</button>
                    </>
                  )}
                  {isPaid && (
                    <>
                      <button className={s.btnAddPayment} onClick={() => onMark(r.id, 'paid')}>+ Add Payment</button>
                      <button className={s.btnUndo} onClick={() => onMark(r.id, null)}>Undo</button>
                    </>
                  )}
                  {isSkipped && (
                    <>
                      <button className={s.btnAddPayment} onClick={() => onMark(r.id, 'paid')}>+ Add Payment</button>
                      <button className={s.btnUndo} onClick={() => onMark(r.id, null)}>Undo</button>
                    </>
                  )}
                </div>
                <div className={s.recActionsRow}>
                  <button className={s.btnEdit} onClick={() => onEdit(r)}>Edit</button>
                  <button className={s.btnDelete} onClick={() => onDelete(r.id)}>Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
