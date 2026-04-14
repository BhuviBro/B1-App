import { useState } from 'react';
import { fmt, fmtDateTime, todayStr, nowTimeStr, uid, getCategoryDef } from '../utils/storage';
import { Icon } from './Icons';
import s from './Returns.module.css';

export default function Returns({ entries, onAddReturn, onEdit, onDelete, categories }) {
  const [expanded, setExpanded] = useState(null);
  const [retSheet, setRetSheet] = useState(null); // { entry, pending }
  const [retAmt, setRetAmt] = useState('');
  const [retDate, setRetDate] = useState(todayStr());
  const [retTime, setRetTime] = useState(nowTimeStr());
  const [retNote, setRetNote] = useState('');

  const lentEntries = (entries || [])
    .filter(e => e.type === 'returnable')
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalLent = lentEntries.reduce((s, e) => s + e.amount, 0);
  const totalReturned = lentEntries.reduce((s, e) =>
    s + (e.returns || []).reduce((r, rv) => r + rv.amount, 0), 0);

  function openRetSheet(entry) {
    const returned = (entry.returns || []).reduce((s, r) => s + r.amount, 0);
    const pending = Math.max(0, entry.amount - returned);
    setRetSheet({ entry, pending });
    setRetAmt(''); setRetDate(todayStr()); setRetTime(nowTimeStr()); setRetNote('');
  }

  function fillFull() {
    if (retSheet) setRetAmt(String(retSheet.pending));
  }

  function saveRet() {
    const amt = parseFloat(retAmt) || 0;
    if (!amt || !retSheet) return;
    onAddReturn(retSheet.entry.id, { amount: amt, date: retDate, time: retTime, note: retNote.trim(), id: uid() });
    setRetSheet(null);
  }

  function logFull(entry) {
    const returned = (entry.returns || []).reduce((s, r) => s + r.amount, 0);
    const pending = Math.max(0, entry.amount - returned);
    if (pending <= 0) return;
    setRetSheet({ entry, pending });
    setRetAmt(String(pending));
    setRetDate(todayStr());
    setRetTime(nowTimeStr());
    setRetNote('full return');
  }

  if (!lentEntries.length) {
    return (
      <div className={s.wrap}>
        <div className={s.empty}>
          <Icon name="returns" size={32} stroke="var(--text3)" />
          <div className={s.emptyTxt}>No lent entries yet.<br />Add a Lent entry to track returns.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      {/* Summary cards */}
      <div className={s.sumCards}>
        <div className={s.sumCard}><div className={s.sumVal} style={{ color: 'var(--amber)' }}>{fmt(totalLent)}</div><div className={s.sumLbl}>Total Lent</div></div>
        <div className={s.sumCard}><div className={s.sumVal} style={{ color: 'var(--green)' }}>{fmt(totalReturned)}</div><div className={s.sumLbl}>Returned</div></div>
        <div className={s.sumCard}><div className={s.sumVal} style={{ color: totalLent - totalReturned > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(totalLent - totalReturned)}</div><div className={s.sumLbl}>Pending</div></div>
      </div>

      <div className={s.sectionLabel}>LENT</div>

      {lentEntries.map(e => {
        const returned = (e.returns || []).reduce((s, r) => s + r.amount, 0);
        const pending = Math.max(0, e.amount - returned);
        const settled = pending <= 0;
        const isExp = expanded === e.id;

        return (
          <div key={e.id} className={`${s.card} ${isExp ? s.cardExp : ''}`}>
            <div className={s.cardHead} onClick={() => setExpanded(isExp ? null : e.id)}>
              <div className={s.headLeft}>
                <div className={s.personName}>{e.label}{e.person ? ` — ${e.person}` : ''}</div>
                <div className={s.meta}>{fmtDateTime(e.date, e.time)}</div>
              </div>
              <div className={s.headRight}>
                <div className={`${s.badge} ${settled ? s.settled : s.active}`}>
                  {settled ? 'Settled' : `${fmt(pending)} Active`}
                </div>
                <span className={s.caret}>{isExp ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExp && (
              <div className={s.cardBody}>
                <div className={s.stats}>
                  <div className={s.stat}><span className={s.statLbl}>GIVEN</span><span className={`${s.statVal} ${s.amber}`}>{fmt(e.amount)}</span></div>
                  <div className={s.stat}><span className={s.statLbl}>RETURNED</span><span className={`${s.statVal} ${s.green}`}>{fmt(returned)}</span></div>
                  <div className={s.stat}><span className={s.statLbl}>PENDING</span><span className={`${s.statVal} ${s.red}`}>{fmt(pending)}</span></div>
                </div>

                {(e.returns || []).length > 0 && (
                  <div className={s.log}>
                    <div className={s.logLbl}>RETURN LOG</div>
                    {e.returns.map((r, i) => (
                      <div key={i} className={s.logRow}>
                        <span className={s.logDate}>{fmtDateTime(r.date, r.time)}{r.note ? ` · ${r.note}` : ''}</span>
                        <span className={s.green}>+{fmt(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!settled && (
                  <div className={s.retBtns}>
                    <button className={s.btnLog} onClick={() => openRetSheet(e)}>
                      <Icon name="arrow" size={14} stroke="currentColor" />
                      Log Return
                    </button>
                    <button className={s.btnFull} onClick={() => logFull(e)}>
                      <Icon name="check" size={14} stroke="currentColor" />
                      Return in Full
                    </button>
                  </div>
                )}

                <div className={s.actions}>
                  <button className={s.iconBtn} onClick={() => onEdit(e)}>
                    <Icon name="edit" size={15} stroke="var(--text2)" />
                  </button>
                  <button className={`${s.iconBtn} ${s.iconBtnDel}`} onClick={() => onDelete(e.id, e.label)}>
                    <Icon name="trash" size={15} stroke="var(--red)" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Log Return Sheet */}
      {retSheet && (
        <>
          <div className={s.overlay} onClick={() => setRetSheet(null)} />
          <div className={s.retSheet}>
            <div className={s.handle} />
            <div className={s.sheetHdr}>
              <span className={s.sheetTitle}>Log Return — {retSheet.entry.label}</span>
              <button className={s.sheetClose} onClick={() => setRetSheet(null)}>✕</button>
            </div>
            <div className={s.sheetBody}>
              <div className={s.field}>
                <div className={s.amtRow}>
                  <label className={s.lbl}>Amount returned (₹)</label>
                  <button className={s.fullBtn} onClick={fillFull}>
                    Return in Full · {fmt(retSheet.pending)}
                  </button>
                </div>
                <input
                  className={`${s.input} ${s.mono}`}
                  type="number" value={retAmt}
                  onChange={e => setRetAmt(e.target.value)}
                  placeholder="0" inputMode="decimal" autoFocus
                />
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.lbl}>Date</label>
                  <input className={`${s.input} ${s.mono}`} type="date" value={retDate} onChange={e => setRetDate(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.lbl}>Time</label>
                  <input className={`${s.input} ${s.mono}`} type="time" value={retTime} onChange={e => setRetTime(e.target.value)} />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.lbl}>Note <span className={s.opt}>(optional)</span></label>
                <input className={s.input} value={retNote} onChange={e => setRetNote(e.target.value)} placeholder="e.g. partial UPI…" />
              </div>
            </div>
            <div className={s.sheetFooter}>
              <button className={s.btnCancel} onClick={() => setRetSheet(null)}>Cancel</button>
              <button className={s.btnSave} onClick={saveRet} disabled={!(parseFloat(retAmt) > 0)}>Save</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
