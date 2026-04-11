import { useState } from 'react';
import { fmt, calcSummary } from '../utils/storage';
import s from './StatusPanel.module.css';

const CARDS = [
  { key: 'overall',  sub: 'OVERALL',    name: 'Total',     color: 'blue'    },
  { key: 'income',   sub: 'THIS MONTH', name: 'Income',    color: 'green'   },
  { key: 'spent',    sub: 'THIS MONTH', name: 'Spent',     color: 'red'     },
  { key: 'remaining',sub: 'NET LEFT',   name: 'Remaining', color: 'neutral' },
];

export default function StatusPanel({ monthData, overall, data }) {
  const [active, setActive] = useState(null);
  const summary = calcSummary(monthData);

  const vals = {
    overall:   overall,
    income:    summary.income,
    spent:     summary.spent,
    remaining: overall,
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
              <div className={`${s.cardVal} ${s[isNeg && c.color === 'neutral' ? 'red' : c.color]}`}>
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
          <BreakdownContent type={active} monthData={monthData} summary={summary} overall={overall} data={data} />
        </div>
      )}
    </div>
  );
}

function BreakdownContent({ type, monthData, summary, overall, data }) {
  const entries = monthData.entries || [];
  if (type === 'overall') {
    const allMonths = Object.entries(data?.months || {}).sort(([a],[b]) => a.localeCompare(b));
    return (
      <div className={s.bdRows}>
        {allMonths.map(([key, md]) => {
          const inc = (md.entries||[]).filter(e=>e.type==='credit').reduce((s,e)=>s+e.amount,0);
          return inc > 0 ? <BdRow key={key} label={key} val={fmt(inc)} color="green" /> : null;
        })}
        <BdTotal label="Overall Balance" val={fmt(overall)} color={overall < 0 ? 'red' : 'blue'} />
      </div>
    );
  }
  if (type === 'income') {
    const credits = entries.filter(e => e.type === 'credit');
    return (
      <div className={s.bdRows}>
        {!credits.length && <div className={s.bdEmpty}>No income this month</div>}
        {credits.map(e => <BdRow key={e.id} label={e.label} val={fmt(e.amount)} color="green" />)}
        {credits.length > 0 && <BdTotal label="Total Income" val={fmt(summary.income)} color="green" />}
      </div>
    );
  }
  if (type === 'spent') {
    const debits = entries.filter(e => e.type === 'debit');
    return (
      <div className={s.bdRows}>
        {!debits.length && <div className={s.bdEmpty}>Nothing spent this month</div>}
        {debits.map(e => <BdRow key={e.id} label={e.label} val={fmt(e.amount)} color="red" />)}
        {debits.length > 0 && <BdTotal label="Total Spent" val={fmt(summary.spent)} color="red" />}
      </div>
    );
  }
  if (type === 'remaining') {
    return (
      <div className={s.bdRows}>
        <BdRow label="Overall balance" val={fmt(overall)} color="blue" />
        <BdRow label="This month spent" val={fmt(summary.spent)} color="red" />
        {summary.netLent > 0 && <BdRow label="Lent (pending)" val={fmt(summary.netLent)} color="amber" />}
        <BdTotal label="Net Remaining" val={fmt(overall)} color={overall < 0 ? 'red' : 'neutral'} />
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
