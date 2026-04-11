import { useState } from 'react';
import { fmt, calcSummary } from '../utils/storage';
import s from './StatusPanel.module.css';

const CARDS = [
  { key: 'balance', name: 'Balance',  sub: 'IN POCKET',   color: 'blue'    },
  { key: 'spent',   name: 'Spent',    sub: 'THIS MONTH',  color: 'red'     },
  { key: 'income',  name: 'Income',   sub: 'THIS MONTH',  color: 'green'   },
  { key: 'lent',    name: 'Lent',     sub: 'PENDING',     color: 'amber'   },
];

export default function StatusPanel({ monthData, overall, data }) {
  const [active, setActive] = useState(null);
const summary = calcSummary(monthData, data?.months);


  // Income excludes return credits
  const realIncome = (monthData.entries || [])
    .filter(e => e.type === 'credit' && !e.isReturnCredit)
    .reduce((s, e) => s + e.amount, 0);

 const vals = {
  balance: summary.remaining,
  spent:   summary.spent,
  income:  realIncome,
  lent:    summary.netLent,
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
          <BreakdownContent type={active} monthData={monthData} summary={summary} realIncome={realIncome} data={data} />
        </div>
      )}
    </div>
  );
}

function BreakdownContent({ type, monthData, summary, realIncome, data }) {
  const entries = monthData.entries || [];

  if (type === 'balance') {
    return (
      <div className={s.bdRows}>
        <BdRow label="Opening Balance"   val={fmt(monthData.basepower || 0)} color="blue" />
        <BdRow label="Income this month" val={fmt(realIncome)}               color="green" />
        <BdRow label="Spent this month"  val={fmt(summary.spent)}            color="red" />
        {summary.netLent > 0 && <BdRow label="Lent (pending)" val={fmt(summary.netLent)} color="amber" />}
        <BdTotal label="Balance" val={fmt(summary.remaining)} color={summary.remaining < 0 ? 'red' : 'blue'} />
      </div>
    );
  }

  if (type === 'income') {
    const credits = entries.filter(e => e.type === 'credit' && !e.isReturnCredit);
    return (
      <div className={s.bdRows}>
        {!credits.length && <div className={s.bdEmpty}>No income this month</div>}
        {credits.map(e => <BdRow key={e.id} label={e.label} val={fmt(e.amount)} color="green" />)}
        {credits.length > 0 && <BdTotal label="Total Income" val={fmt(realIncome)} color="green" />}
      </div>
    );
  }

  if (type === 'spent') {
    const debits = entries.filter(e => e.type === 'debit' && !e.isRecurringEntry);
    const recurring = entries.filter(e => e.type === 'debit' && e.isRecurringEntry);
    return (
      <div className={s.bdRows}>
        {!entries.filter(e => e.type === 'debit').length && <div className={s.bdEmpty}>Nothing spent this month</div>}
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
        {allLent.map(e => (
          e.pending > 0
            ? <BdRow key={e.id} label={e.label} val={fmt(e.pending)} color="amber" />
            : <BdRow key={e.id} label={`${e.label} ✓`} val={fmt(e.amount)} color="green" />
        ))}
        <BdTotal label="Net Pending" val={fmt(summary.netLent)} color={summary.netLent > 0 ? 'amber' : 'green'} />
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