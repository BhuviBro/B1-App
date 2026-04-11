import { useMemo } from 'react';
import { fmt, calcSummary, getCategoryDef } from '../utils/storage';
import { Icon } from './Icons';
import s from './Charts.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Charts({ data, currentKey, categories }) {
  const monthData = data.months?.[currentKey] || { basepower: 0, entries: [] };
  const summary = calcSummary(monthData);

  // Category breakdown for debits
  const catBreakdown = useMemo(() => {
    const map = {};
    (monthData.entries || [])
      .filter(e => e.type === 'debit')
      .forEach(e => {
        const key = e.category || 'uncategorised';
        map[key] = (map[key] || 0) + e.amount;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ cat, amt }));
  }, [monthData]);

  // Last 6 months trend
  const trend = useMemo(() => {
    const [y, m] = currentKey.split('-').map(Number);
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const md = data.months?.[key] || { basepower: 0, entries: [] };
      const s = calcSummary(md);
      result.push({
        label: MONTHS[d.getMonth()],
        income: s.income,
        spent: s.spent,
        key,
      });
    }
    return result;
  }, [data, currentKey]);

  const maxTrend = Math.max(...trend.map(t => Math.max(t.income, t.spent)), 1);
  const maxCat = catBreakdown[0]?.amt || 1;
  const totalSpent = summary.spent || 1;

  return (
    <div className={s.wrap}>
      {/* Income vs Spent — Bar chart */}
      <div className={s.section}>
        <div className={s.sectionLabel}>INCOME VS SPENT — 6 MONTHS</div>
        <div className={s.barChart}>
          {trend.map((t, i) => (
            <div key={i} className={`${s.barGroup} ${t.key === currentKey ? s.barGroupActive : ''}`}>
              <div className={s.bars}>
                <div
                  className={`${s.bar} ${s.barIncome}`}
                  style={{ height: `${(t.income / maxTrend) * 100}%` }}
                  title={fmt(t.income)}
                />
                <div
                  className={`${s.bar} ${s.barSpent}`}
                  style={{ height: `${(t.spent / maxTrend) * 100}%` }}
                  title={fmt(t.spent)}
                />
              </div>
              <div className={s.barLabel}>{t.label}</div>
            </div>
          ))}
        </div>
        <div className={s.legend}>
          <div className={s.legendItem}><span className={`${s.legendDot} ${s.dotIncome}`} />Income</div>
          <div className={s.legendItem}><span className={`${s.legendDot} ${s.dotSpent}`} />Spent</div>
        </div>
      </div>

      {/* Summary row */}
      <div className={s.summaryRow}>
        <div className={s.summaryCard}>
          <div className={s.summaryVal} style={{color:'var(--green)'}}>{fmt(summary.income)}</div>
          <div className={s.summaryLbl}>Income</div>
        </div>
        <div className={s.summaryCard}>
          <div className={s.summaryVal} style={{color:'var(--red)'}}>{fmt(summary.spent)}</div>
          <div className={s.summaryLbl}>Spent</div>
        </div>
        <div className={s.summaryCard}>
          <div className={s.summaryVal} style={{color: summary.remaining < 0 ? 'var(--red)' : 'var(--blue)'}}>{fmt(summary.remaining)}</div>
          <div className={s.summaryLbl}>Left</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className={s.section}>
        <div className={s.sectionLabel}>SPENDING BY CATEGORY</div>
        {catBreakdown.length === 0 && (
          <div className={s.empty}>No debit entries this cycle.</div>
        )}
        {catBreakdown.map(({ cat, amt }) => {
          const def = getCategoryDef(cat, 'debit', categories);
          const pct = Math.round((amt / totalSpent) * 100);
          return (
            <div key={cat} className={s.catRow}>
              <div className={s.catLeft}>
                <div className={s.catIcWrap}><Icon name={def?.icon || 'other'} size={18} stroke="var(--blue)" className={s.catIcGlow} /></div>
                <span className={s.catName}>{def?.name || cat}</span>
              </div>
              <div className={s.catBar}>
                <div className={s.catBarFill} style={{ width: `${(amt / maxCat) * 100}%` }} />
              </div>
              <div className={s.catRight}>
                <span className={s.catAmt}>{fmt(amt)}</span>
                <span className={s.catPct}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
