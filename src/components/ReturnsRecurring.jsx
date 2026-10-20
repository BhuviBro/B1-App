import { useState } from 'react';
import { fmt, getRecurringDueStatus } from '../utils/storage';
import { Icon } from './Icons';
import s from './Returns.module.css';
import rs from './Recurring.module.css';
import ae from './AddEntry.module.css';

export default function ReturnsRecurring({
  recurring, currentKey,
  onAddRecurring, onEditRecurring, onDeleteRecurring, onMarkRecurring,
  categories, allMonthsData,
}) {
  const [expanded, setExpanded] = useState(null);
  const [recSheet, setRecSheet] = useState(null);
  const [recType, setRecType] = useState('bill'); // 'bill' | 'loan'
  const [recLabel, setRecLabel] = useState('');
  const [recTotalBorrowed, setRecTotalBorrowed] = useState('');
  const [recTenureMonths, setRecTenureMonths] = useState('');
  const [recAmt, setRecAmt] = useState('');
  const [recDay, setRecDay] = useState('1');
  const [recAlert, setRecAlert] = useState('5');
  const [recCat, setRecCat] = useState('other_d');

  function openAddRec() {
    setRecType('bill');
    setRecLabel('');
    setRecTotalBorrowed('');
    setRecTenureMonths('');
    setRecAmt('');
    setRecDay('1');
    setRecAlert('5');
    setRecCat('other_d');
    setRecSheet({ mode: 'add' });
  }

  function openEditRec(rec) {
    const isLoanItem = !!(rec.isLoan || rec.totalBorrowed);
    setRecType(isLoanItem ? 'loan' : 'bill');
    setRecLabel(rec.label || '');
    setRecTotalBorrowed(rec.totalBorrowed ? String(rec.totalBorrowed) : '');
    setRecTenureMonths(rec.tenureMonths ? String(rec.tenureMonths) : '');
    setRecAmt(String(rec.amount || ''));
    setRecDay(String(rec.dueDay || 1));
    setRecAlert(String(rec.alertDaysBefore ?? 5));
    setRecCat(rec.category || (isLoanItem ? 'repayment' : 'other_d'));
    setRecSheet({ mode: 'edit', rec });
  }

  function handleTotalBorrowedChange(val) {
    setRecTotalBorrowed(val);
    const tot = parseFloat(val);
    const ten = parseInt(recTenureMonths);
    const emi = parseFloat(recAmt);
    if (tot > 0 && ten > 0) {
      setRecAmt(String(Math.round(tot / ten)));
    } else if (tot > 0 && emi > 0 && !recTenureMonths) {
      setRecTenureMonths(String(Math.round(tot / emi)));
    }
  }

  function handleTenureChange(val) {
    setRecTenureMonths(val);
    const ten = parseInt(val);
    const tot = parseFloat(recTotalBorrowed);
    if (tot > 0 && ten > 0) {
      setRecAmt(String(Math.round(tot / ten)));
    }
  }

  function handleEmiChange(val) {
    setRecAmt(val);
    const emi = parseFloat(val);
    const tot = parseFloat(recTotalBorrowed);
    if (tot > 0 && emi > 0 && !recTenureMonths) {
      setRecTenureMonths(String(Math.round(tot / emi)));
    }
  }

  function saveRec() {
    if (!recLabel.trim() || !(parseFloat(recAmt) > 0)) return;
    const isLoan = recType === 'loan' || parseFloat(recTotalBorrowed) > 0;
    const totalBorrowedNum = parseFloat(recTotalBorrowed) || null;
    const payload = {
      label: recLabel.trim(),
      amount: parseFloat(recAmt),
      dueDay: parseInt(recDay) || 1,
      alertDaysBefore: parseInt(recAlert) || 5,
      category: recCat,
      isLoan,
      totalBorrowed: isLoan ? totalBorrowedNum : null,
      tenureMonths: isLoan && parseInt(recTenureMonths) > 0 ? parseInt(recTenureMonths) : null,
    };
    if (recSheet.mode === 'edit') onEditRecurring(recSheet.rec.id, payload);
    else onAddRecurring(payload);
    setRecSheet(null);
  }

  const items = (recurring || []).map(r => {
    // Gather all payments made towards this recurring item across all months
    const allPaidEntries = [];
    if (allMonthsData) {
      Object.entries(allMonthsData).forEach(([mKey, mo]) => {
        (mo.entries || []).forEach(e => {
          if (e.recurringId === r.id || (e.isRecurringEntry && e.recurringId === r.id)) {
            allPaidEntries.push({ ...e, monthKey: mKey });
          }
        });
      });
    }
    allPaidEntries.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    const totalPaid = allPaidEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
    const isLoan = !!(r.isLoan || r.totalBorrowed);
    const totalBorrowed = r.totalBorrowed || 0;
    const remaining = Math.max(0, totalBorrowed - totalPaid);
    const progressPct = totalBorrowed > 0 ? Math.min(100, Math.round((totalPaid / totalBorrowed) * 100)) : 0;
    const emisLeft = r.amount > 0 ? Math.ceil(remaining / r.amount) : 0;
    const isFullyRepaid = isLoan && totalBorrowed > 0 && remaining <= 0;

    return {
      ...r,
      status: getRecurringDueStatus(r, currentKey),
      isLoan,
      totalPaid,
      totalBorrowed,
      remaining,
      progressPct,
      emisLeft,
      isFullyRepaid,
      allPaidEntries,
    };
  });

  return (
    <div>
      <div className={s.secHdr}>
        <span className={s.sectionLabel} style={{ padding: 0 }}>RECURRING PAYMENTS & EMIs</span>
        <button className={s.addBtn} onClick={openAddRec}>+ Add</button>
      </div>
      <p className={s.hint}>Alerts appear on Command 5 days before due date. Alter EMI amount anytime during payment.</p>

      {items.length === 0 && (
        <div className={s.empty}>
          <Icon name="recurring" size={32} stroke="var(--text3)" />
          <div className={s.emptyTxt}>No recurring payments set up.<br />Tap + Add to track monthly bills or borrowed EMIs.</div>
        </div>
      )}

      {items.map(r => {
        const { isPaid, isSkipped, isOverdue, isDueSoon } = r.status;
        const isDue = (isDueSoon || isOverdue) && !isPaid && !isSkipped;
        const isExp = expanded === r.id;

        return (
          <div key={r.id} className={`${rs.card} ${isExp ? rs.cardExp : ''}`}>
            <div className={rs.cardHead} onClick={() => setExpanded(isExp ? null : r.id)}>
              <div className={rs.headLeft}>
                <div className={rs.recName}>
                  {r.label}
                  {r.isLoan && <span className={rs.loanTag}>LOAN · EMI</span>}
                </div>
                <div className={rs.recMeta}>
                  Due day {r.dueDay} · {r.isLoan ? `EMI: ${fmt(r.amount)}` : fmt(r.amount)}
                  {isDueSoon && !isPaid && <span className={rs.tagDue}>Due Soon</span>}
                  {isOverdue && !isPaid && <span className={rs.tagOverdue}>Overdue</span>}
                  {isPaid && <span className={rs.tagPaid}>Paid</span>}
                  {isSkipped && <span className={rs.tagSkipped}>Skipped</span>}
                  {r.isFullyRepaid && <span className={rs.tagPaid}>Fully Repaid ✓</span>}
                </div>

                {/* Loan / EMI Progress Bar */}
                {r.isLoan && r.totalBorrowed > 0 && (
                  <div className={rs.loanProgressBlock}>
                    <div className={rs.loanProgressBar}>
                      <div
                        className={rs.loanProgressFill}
                        style={{
                          width: `${r.progressPct}%`,
                          background: r.isFullyRepaid ? 'var(--green)' : 'var(--purple)',
                        }}
                      />
                    </div>
                    <div className={rs.loanProgressMeta}>
                      <span>{fmt(r.totalPaid)} of {fmt(r.totalBorrowed)} ({r.progressPct}%)</span>
                      <span style={{ color: r.isFullyRepaid ? 'var(--green)' : 'var(--amber)' }}>
                        {r.isFullyRepaid ? 'Fully Repaid' : `${fmt(r.remaining)} left (~${r.emisLeft} EMIs)`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isDue && (
                  <button
                    className={rs.headActionBtnDue}
                    onClick={(e) => { e.stopPropagation(); onMarkRecurring(r.id, 'paid'); }}
                    title={r.isLoan ? 'Pay EMI' : 'Mark Paid'}
                  >
                    {r.isLoan ? 'Pay EMI' : 'Mark Paid'}
                  </button>
                )}
                {!isDue && !isPaid && !isSkipped && (
                  <button
                    className={rs.headActionBtnPay}
                    onClick={(e) => { e.stopPropagation(); onMarkRecurring(r.id, 'paid'); }}
                    title={r.isLoan ? 'Pay EMI' : 'Add Payment'}
                  >
                    {r.isLoan ? 'Pay EMI' : 'Add Payment'}
                  </button>
                )}
                {isPaid && (
                  <button
                    className={rs.headActionBtnAddMore}
                    onClick={(e) => { e.stopPropagation(); onMarkRecurring(r.id, 'paid'); }}
                    title="Add another payment"
                  >
                    + Add Payment
                  </button>
                )}
                <span className={rs.caret}>{isExp ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExp && (
              <div className={rs.cardBody}>
                {/* Loan detailed stats grid */}
                {r.isLoan && r.totalBorrowed > 0 && (
                  <div className={rs.loanStatsGrid}>
                    <div className={rs.loanStat}>
                      <span className={rs.loanStatLbl}>TOTAL BORROWED</span>
                      <span className={`${rs.loanStatVal} ${rs.purple}`}>{fmt(r.totalBorrowed)}</span>
                    </div>
                    <div className={rs.loanStat}>
                      <span className={rs.loanStatLbl}>REPAID SO FAR</span>
                      <span className={`${rs.loanStatVal} ${rs.green}`}>{fmt(r.totalPaid)}</span>
                    </div>
                    <div className={rs.loanStat}>
                      <span className={rs.loanStatLbl}>STILL OWED</span>
                      <span className={`${rs.loanStatVal} ${r.remaining > 0 ? rs.amber : rs.green}`}>
                        {fmt(r.remaining)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Recorded payments log showing altered amounts */}
                {r.isLoan && r.allPaidEntries.length > 0 && (
                  <div className={rs.loanPaymentsLog}>
                    <span className={rs.loanPaymentsTitle}>PAYMENTS RECORDED ({r.allPaidEntries.length})</span>
                    {r.allPaidEntries.slice(0, 5).map(p => (
                      <div key={p.id} className={rs.loanPaymentRow}>
                        <span className={rs.loanPaymentDate}>{p.date}</span>
                        <span className={rs.loanPaymentAmt}>
                          {fmt(p.amount)}
                          {p.amount !== r.amount && <span className={rs.alteredTag}>altered</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={rs.recActions}>
                  {!isPaid && !isSkipped && (
                    <>
                      {isDue ? (
                        <button className={rs.btnPaid} onClick={() => onMarkRecurring(r.id, 'paid')}>
                          {r.isLoan ? 'Pay EMI' : 'Mark Paid'}
                        </button>
                      ) : (
                        <button className={rs.btnAddPayment} onClick={() => onMarkRecurring(r.id, 'paid')}>
                          {r.isLoan ? 'Pay EMI' : 'Add Payment'}
                        </button>
                      )}
                      <button className={rs.btnSkip} onClick={() => onMarkRecurring(r.id, 'skipped')}>
                        Skip
                      </button>
                    </>
                  )}
                  {isPaid && (
                    <>
                      <button className={rs.btnAddPayment} onClick={() => onMarkRecurring(r.id, 'paid')}>
                        + Add Payment
                      </button>
                      <button className={rs.btnUndo} onClick={() => onMarkRecurring(r.id, null)}>
                        Undo
                      </button>
                    </>
                  )}
                  {isSkipped && (
                    <>
                      <button className={rs.btnAddPayment} onClick={() => onMarkRecurring(r.id, 'paid')}>
                        + Add Payment
                      </button>
                      <button className={rs.btnUndo} onClick={() => onMarkRecurring(r.id, null)}>
                        Undo
                      </button>
                    </>
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
              {/* Type selector: Regular Bill vs Loan / Borrowed EMI */}
              <div className={rs.typeSegment}>
                <button
                  type="button"
                  className={`${rs.typeSegBtn} ${recType === 'bill' ? rs.typeSegActive : ''}`}
                  onClick={() => setRecType('bill')}
                >
                  Regular Bill / Subscription
                </button>
                <button
                  type="button"
                  className={`${rs.typeSegBtn} ${recType === 'loan' ? rs.typeSegActiveLoan : ''}`}
                  onClick={() => {
                    setRecType('loan');
                    if (recCat === 'other_d') setRecCat('repayment');
                  }}
                >
                  Loan / Borrowed EMI
                </button>
              </div>

              {/* Label */}
              <div className={s.field}>
                <label className={s.lbl}>Label / Name</label>
                <input
                  className={s.input}
                  value={recLabel}
                  onChange={e => setRecLabel(e.target.value)}
                  placeholder={recType === 'loan' ? 'e.g. Bike Loan EMI, Friend Loan, HDFC EMI…' : 'e.g. Rent, Electricity, Netflix…'}
                  autoFocus
                />
              </div>

              {/* Loan / Borrowed Mode: Total Borrowed + Monthly EMI + Tenure */}
              {recType === 'loan' ? (
                <div className={rs.loanFormBox}>
                  <div className={s.field}>
                    <div className={s.amtRow}>
                      <label className={s.lbl}>Total Borrowed / Loan Amount ₹</label>
                      <span className={rs.loanHelper}>Principal</span>
                    </div>
                    <input
                      className={`${s.input} ${s.mono}`}
                      type="number"
                      value={recTotalBorrowed}
                      onChange={e => handleTotalBorrowedChange(e.target.value)}
                      placeholder="e.g. 50000"
                      inputMode="decimal"
                    />
                  </div>

                  <div className={s.row2}>
                    <div className={s.field}>
                      <label className={s.lbl}>Monthly EMI ₹</label>
                      <input
                        className={`${s.input} ${s.mono}`}
                        type="number"
                        value={recAmt}
                        onChange={e => handleEmiChange(e.target.value)}
                        placeholder="e.g. 5000"
                        inputMode="decimal"
                      />
                    </div>
                    <div className={s.field}>
                      <div className={s.amtRow}>
                        <label className={s.lbl}>Tenure (Months)</label>
                        <span className={s.opt}>optional</span>
                      </div>
                      <input
                        className={`${s.input} ${s.mono}`}
                        type="number"
                        value={recTenureMonths}
                        onChange={e => handleTenureChange(e.target.value)}
                        placeholder="e.g. 10"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className={rs.loanNote}>
                    💡 Set once during creation. When paying each month, you can freely alter the EMI amount to match what you actually paid.
                  </div>
                </div>
              ) : (
                /* Regular Recurring Bill */
                <div className={s.field}>
                  <label className={s.lbl}>Monthly Amount ₹</label>
                  <input
                    className={`${s.input} ${s.mono}`}
                    type="number"
                    value={recAmt}
                    onChange={e => setRecAmt(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              )}

              {/* Due Day & Alert Days */}
              <div className={s.row2}>
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
                <div className={s.field}>
                  <label className={s.lbl}>Alert Days Before</label>
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
                </div>
              </div>

              {/* Category */}
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
