import { useState } from 'react';
import { fmt, fmtDateTime, todayStr, nowTimeStr, uid } from '../utils/storage';
import { Icon } from './Icons';
import s from './Returns.module.css';

export default function ReturnsBorrowed({ entries, onAddRepayment, onEdit, onDelete, categories }) {
  const [expanded, setExpanded] = useState(null);
  const [repSheet, setRepSheet] = useState(null); // { entry, pending }
  const [repAmt, setRepAmt] = useState('');
  const [repDate, setRepDate] = useState(todayStr());
  const [repTime, setRepTime] = useState(nowTimeStr());
  const [repNote, setRepNote] = useState('');

  const borrowedEntries = (entries || [])
    .filter(e => e.type === 'borrowed')
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalBorrowed = borrowedEntries.reduce((s, e) => s + e.amount, 0);
  const totalRepaid = borrowedEntries.reduce((s, e) =>
    s + (e.returns || []).reduce((r, rv) => r + rv.amount, 0), 0);
  const stillOwe = Math.max(0, totalBorrowed - totalRepaid);

  function openRepSheet(entry) {
    const repaid = (entry.returns || []).reduce((s, r) => s + r.amount, 0);
    const pending = Math.max(0, entry.amount - repaid);
    setRepSheet({ entry, pending });
    setRepAmt(''); setRepDate(todayStr()); setRepTime(nowTimeStr()); setRepNote('');
  }

  function fillFull() {
    if (repSheet) setRepAmt(String(repSheet.pending));
  }

  function saveRepayment() {
    const amt = parseFloat(repAmt) || 0;
    if (!amt || !repSheet) return;
    onAddRepayment(repSheet.entry.id, { amount: amt, date: repDate, time: repTime, note: repNote.trim(), id: uid() });
    setRepSheet(null);
  }

  function repayFull(entry) {
    const repaid = (entry.returns || []).reduce((s, r) => s + r.amount, 0);
    const pending = Math.max(0, entry.amount - repaid);
    if (pending <= 0) return;
    setRepSheet({ entry, pending });
    setRepAmt(String(pending));
    setRepDate(todayStr());
    setRepTime(nowTimeStr());
    setRepNote('repay in full');
  }

  if (!borrowedEntries.length) {
    return (
      <div className={s.empty}>
        <Icon name="returns" size={32} stroke="var(--text3)" />
        <div className={s.emptyTxt}>No borrowed entries yet.<br />Add a Borrowed entry to track what you owe.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary cards */}
      <div className={s.sumCards}>
        <div className={s.sumCard}><div className={s.sumVal} style={{ color: 'var(--purple)' }}>{fmt(totalBorrowed)}</div><div className={s.sumLbl}>Total Borrowed</div></div>
        <div className={s.sumCard}><div className={s.sumVal} style={{ color: 'var(--green)' }}>{fmt(totalRepaid)}</div><div className={s.sumLbl}>Repaid</div></div>
        <div className={s.sumCard}><div className={s.sumVal} style={{ color: stillOwe > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(stillOwe)}</div><div className={s.sumLbl}>Still Owe</div></div>
      </div>

      <div className={s.sectionLabel}>BORROWED ENTRIES</div>

      {borrowedEntries.map(e => {
        const repaid = (e.returns || []).reduce((s, r) => s + r.amount, 0);
        const pending = Math.max(0, e.amount - repaid);
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
                <div className={`${s.badge} ${settled ? s.settled : s.activePurple}`}>
                  {settled ? 'Settled' : `${fmt(pending)} Still Owe`}
                </div>
                <span className={s.caret}>{isExp ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExp && (
              <div className={s.cardBody}>
                <div className={s.stats}>
                  <div className={s.stat}><span className={s.statLbl}>BORROWED</span><span className={`${s.statVal} ${s.purple}`}>{fmt(e.amount)}</span></div>
                  <div className={s.stat}><span className={s.statLbl}>REPAID</span><span className={`${s.statVal} ${s.green}`}>{fmt(repaid)}</span></div>
                  <div className={s.stat}><span className={s.statLbl}>STILL OWE</span><span className={`${s.statVal} ${s.red}`}>{fmt(pending)}</span></div>
                </div>

                {e.returns && e.returns.length > 0 && (
                  <div className={s.log}>
                    <div className={s.logLbl}>REPAYMENT HISTORY</div>
                    {e.returns.map((r, i) => (
                      <div key={r.id || i} className={s.logRow}>
                        <span className={s.logDate}>{fmtDateTime(r.date, r.time)}{r.note ? ` · ${r.note}` : ''}</span>
                        <span className={`${s.statVal} ${s.purple}`}>−{fmt(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={s.retBtns}>
                  {!settled && (
                    <>
                      <button className={s.btnLog} onClick={() => openRepSheet(e)}>
                        <Icon name="plus" size={13} stroke="currentColor" />
                        Log Repayment
                      </button>
                      <button className={s.btnFull} onClick={() => repayFull(e)}>
                        <Icon name="check" size={13} stroke="currentColor" />
                        Repay in Full
                      </button>
                    </>
                  )}
                </div>

                <div className={s.actions}>
                  <button className={s.iconBtn} onClick={() => onEdit(e)}>
                    <Icon name="edit" size={14} stroke="var(--text2)" />
                  </button>
                  <button className={`${s.iconBtn} ${s.iconBtnDel}`} onClick={() => onDelete(e.id, e.label)}>
                    <Icon name="trash" size={14} stroke="var(--red)" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Log Repayment Sheet */}
      {repSheet && (
        <>
          <div className={s.overlay} onClick={() => setRepSheet(null)} />
          <div className={s.retSheet}>
            <div className={s.handle} />
            <div className={s.sheetHdr}>
              <span className={s.sheetTitle}>Log Repayment — {repSheet.entry.label}</span>
              <button className={s.sheetClose} onClick={() => setRepSheet(null)}>✕</button>
            </div>
            <div className={s.sheetBody}>
              <div className={s.field}>
                <div className={s.amtRow}>
                  <label className={s.lbl}>Amount Repaid ₹ <span className={s.opt}>(max {fmt(repSheet.pending)})</span></label>
                  <button className={s.fullBtn} onClick={fillFull}>Fill full {fmt(repSheet.pending)}</button>
                </div>
                <input
                  className={`${s.input} ${s.mono}`}
                  type="number"
                  value={repAmt}
                  onChange={e => setRepAmt(e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  autoFocus
                />
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.lbl}>Date</label>
                  <input className={`${s.input} ${s.mono}`} type="date" value={repDate} onChange={e => setRepDate(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.lbl}>Time</label>
                  <input className={`${s.input} ${s.mono}`} type="time" value={repTime} onChange={e => setRepTime(e.target.value)} />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.lbl}>Note <span className={s.opt}>(optional)</span></label>
                <input className={s.input} value={repNote} onChange={e => setRepNote(e.target.value)} placeholder="e.g. UPI, cash, partial…" />
              </div>
            </div>
            <div className={s.sheetFooter}>
              <button className={s.btnCancel} onClick={() => setRepSheet(null)}>Cancel</button>
              <button className={s.btnSave} onClick={saveRepayment} disabled={!(parseFloat(repAmt) > 0)}>Save Repayment</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
