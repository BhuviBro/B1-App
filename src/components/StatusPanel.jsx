import { useState } from 'react';
import { fmt, calcSummary } from '../utils/storage';
import s from './StatusPanel.module.css';

const CARDS = [
  { key: 'balance',  name: 'In Pocket', sub: 'IN POCKET',   color: 'blue'   },
  { key: 'spent',    name: 'Spent',     sub: 'THIS MONTH',  color: 'red'    },
  { key: 'lent',     name: 'Lent',      sub: 'PENDING',     color: 'amber'  },
  { key: 'borrowed', name: 'Borrowed',  sub: 'PENDING',     color: 'purple' },
];

export default function StatusPanel({ monthData, overall, data, onSetBasepower }) {
  const [active, setActive] = useState(null);
  const summary = calcSummary(monthData, data?.months);

  const vals = {
    balance:  overall,
    spent:    summary.spent,
    lent:     summary.netLent,
    borrowed: summary.netBorrowed,
  };

  function toggle(key) { setActive(a => a === key ? null : key); }
  const activeCard = CARDS.find(c => c.key === active);

  return (
    <div className={s.wrap}>
      <div className={s.label}>STATUS PANEL</div>
      <div className={s.grid}>
        {CARDS.map(c => {
          const val = vals[c.key];
          const isNeg = val < 0;
          return (
            <div
              key={c.key}
              className={`${s.card} ${active === c.key ? s.cardActive : ''} ${s['card_' + c.color]}`}
              onClick={() => toggle(c.key)}
            >
              <div className={s.cardTop}>
                <span className={s.cardSub}>{c.sub}</span>
                <span className={`${s.cardInd} ${active === c.key ? s.indOn : ''}`} />
              </div>
              <div className={`${s.cardVal} ${s[isNeg ? 'red' : c.color]}`}>
                {fmt(val)}
              </div>
              <div className={s.cardName}>{c.name}</div>
            </div>
          );
        })}
      </div>

      {active && activeCard && (
        <div className={s.breakdown}>
          <div className={s.bdHdr}>
            <span className={s.bdTitle}>{activeCard.name} — Breakdown</span>
            <span className={s.bdClose} onClick={() => setActive(null)}>✕</span>
          </div>
          <BreakdownContent
            type={active}
            monthData={monthData}
            summary={summary}
            overall={overall}
            data={data}
            onSetBasepower={onSetBasepower}
          />
        </div>
      )}
    </div>
  );
}

function BreakdownContent({ type, monthData, summary, overall, data, onSetBasepower }) {
  const [adjusting, setAdjusting] = useState(false);
  const [targetVal, setTargetVal] = useState('');
  const entries = monthData.entries || [];

  if (type === 'balance') {
    let totalIncome = 0;
    let totalSpent = 0;
    let totalLentPending = 0;
    let totalBorrowedPending = 0;

    Object.values(data?.months || {}).forEach(m => {
      const e = m.entries || [];
      totalIncome += e.filter(x => x.type === 'credit' && !x.isReturnCredit).reduce((s, x) => s + x.amount, 0);
      totalSpent += e.filter(x => x.type === 'debit' && !x.isBorrowRepayment).reduce((s, x) => s + x.amount, 0);
      e.filter(x => x.type === 'returnable').forEach(x => {
        const ret = (x.returns || []).reduce((r, rv) => r + rv.amount, 0);
        totalLentPending += Math.max(0, x.amount - ret);
      });
      e.filter(x => x.type === 'borrowed').forEach(x => {
        const rep = (x.returns || []).reduce((r, rv) => r + rv.amount, 0);
        totalBorrowedPending += Math.max(0, x.amount - rep);
      });
    });

    const opening = monthData.basepower || 0;

    function handleSaveAdjust() {
      const target = parseFloat(targetVal);
      if (isNaN(target)) return;
      const neededOpening = Math.round(target - totalIncome + totalSpent + totalLentPending - totalBorrowedPending);
      if (onSetBasepower) onSetBasepower(neededOpening);
      setAdjusting(false);
    }

    return (
      <div className={s.bdRows}>
        <BdRow label="Opening Balance" val={fmt(opening)} color="blue" />
        <BdRow label="Total Income" val={fmt(totalIncome)} color="green" />
        <BdRow label="Total Spent" val={fmt(totalSpent)} color="red" />
        {totalLentPending > 0 && <BdRow label="Lent (pending)" val={`−${fmt(totalLentPending)}`} color="amber" />}
        {totalBorrowedPending > 0 && <BdRow label="Borrowed (pending)" val={`+${fmt(totalBorrowedPending)}`} color="purple" />}
        <BdTotal label="In Pocket" val={fmt(overall)} color={overall < 0 ? 'red' : 'blue'} />

        {onSetBasepower && (
          <div className={s.adjustWrap}>
            {!adjusting ? (
              <button
                className={s.adjustBtn}
                onClick={() => { setAdjusting(true); setTargetVal(String(overall)); }}
              >
                <span>⚡ Set Current In-Pocket Balance</span>
              </button>
            ) : (
              <div className={s.adjustForm}>
                <div className={s.adjustHeader}>
                  <span className={s.adjustTitle}>SET IN-POCKET BALANCE</span>
                  <button className={s.adjustClose} onClick={() => setAdjusting(false)}>✕</button>
                </div>
                <div className={s.adjustInputRow}>
                  <div className={s.adjustInputWrap}>
                    <span className={s.adjustPrefix}>₹</span>
                    <input
                      className={s.adjustInput}
                      type="number"
                      value={targetVal}
                      onChange={e => setTargetVal(e.target.value)}
                      placeholder="e.g. 4372"
                      inputMode="decimal"
                      autoFocus
                    />
                  </div>
                  <button className={s.adjustSaveBtn} onClick={handleSaveAdjust}>Apply</button>
                </div>
                <span className={s.adjustHint}>
                  Auto-calculates required opening balance taking all your borrows, spending, and income into account.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (type === 'spent') {
    const debits = entries.filter(e => e.type === 'debit' && !e.isRecurringEntry && !e.isBorrowRepayment);
    const recurring = entries.filter(e => e.type === 'debit' && e.isRecurringEntry && !e.isBorrowRepayment);
    return (
      <div className={s.bdRows}>
        {!debits.length && !recurring.length && <div className={s.bdEmpty}>Nothing spent this month</div>}
        {debits.map(e => <BdRow key={e.id} label={e.label} val={fmt(e.amount)} color="red" />)}
        {recurring.map(e => <BdRow key={e.id} label={`↻ ${e.label}`} val={fmt(e.amount)} color="red" />)}
        <BdTotal label="Total Spent" val={fmt(summary.spent)} color="red" />
      </div>
    );
  }

  if (type === 'lent') {
    const allLent = [];
    Object.values(data?.months || {}).forEach(mo => {
      (mo.entries || []).filter(e => e.type === 'returnable').forEach(e => {
        const returned = (e.returns || []).reduce((s, r) => s + r.amount, 0);
        const pending  = Math.max(0, e.amount - returned);
        allLent.push({ ...e, pending, returned });
      });
    });
    return (
      <div className={s.bdRows}>
        {!allLent.length && <div className={s.bdEmpty}>No lent entries</div>}
        {allLent.map(e => {
          const name = e.person ? `${e.label} (${e.person})` : e.label;
          return e.pending > 0
            ? <BdRow key={e.id} label={name} val={fmt(e.pending)} color="amber" />
            : <BdRow key={e.id} label={`${name} ✓`} val={fmt(e.amount)} color="green" />;
        })}
        <BdTotal label="Net Pending" val={fmt(summary.netLent)} color={summary.netLent > 0 ? 'amber' : 'green'} />
      </div>
    );
  }

  if (type === 'borrowed') {
    const allBorrowed = [];
    Object.values(data?.months || {}).forEach(mo => {
      (mo.entries || []).filter(e => e.type === 'borrowed').forEach(e => {
        const repaid = (e.returns || []).reduce((s, r) => s + r.amount, 0);
        const pending = Math.max(0, e.amount - repaid);
        allBorrowed.push({ ...e, pending, repaid });
      });
    });
    return (
      <div className={s.bdRows}>
        {!allBorrowed.length && <div className={s.bdEmpty}>No borrowed entries</div>}
        {allBorrowed.map(e => {
          const name = e.person ? `${e.label} (${e.person})` : e.label;
          return e.pending > 0
            ? <BdRow key={e.id} label={name} val={fmt(e.pending)} color="purple" />
            : <BdRow key={e.id} label={`${name} ✓`} val={fmt(e.amount)} color="green" />;
        })}
        <BdTotal label="Net Pending" val={fmt(summary.netBorrowed)} color={summary.netBorrowed > 0 ? 'purple' : 'green'} />
      </div>
    );
  }
}

function BdRow({ label, val, color }) {
  return (
    <div className={s.bdRow}>
      <span className={s.bdRowLabel}>{label}</span>
      <span className={`${s.bdRowVal} ${color ? s[color] : ''}`}>{val}</span>
    </div>
  );
}

function BdTotal({ label, val, color }) {
  return (
    <div className={s.bdTotal}>
      <span>{label}</span>
      <span className={color ? s[color] : ''}>{val}</span>
    </div>
  );
}