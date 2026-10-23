import { useMemo } from 'react';
import { fmt, calcSummary, getCategoryDef } from '../utils/storage';
import { Icon } from './Icons';
import s from './Charts.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDec(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Charts({
  data,
  currentKey,
  categories,
  isBusiness = false,
  partners = [],
  onImportSheetData,
  sheetSyncing = false,
  isLiveSync = false,
}) {
  const monthData = data.months?.[currentKey] || { basepower: 0, entries: [] };
  const summary = calcSummary(monthData);

  // Category breakdown for debits (Expenses)
  const catBreakdown = useMemo(() => {
    const map = {};
    (monthData.entries || [])
      .filter(e => e.type === 'debit' && !e.isBorrowRepayment)
      .forEach(e => {
        const key = e.category || 'uncategorised';
        map[key] = (map[key] || 0) + e.amount;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ cat, amt }));
  }, [monthData]);

  // Category breakdown for credits (Income / Inflows)
  const incomeBreakdown = useMemo(() => {
    const map = {};
    (monthData.entries || [])
      .filter(e => e.type === 'credit' && !e.isReturnCredit)
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

  const maxIncomeCat = incomeBreakdown[0]?.amt || 1;
  const totalIncome = summary.income || 1;

  // Business metrics
  const netProfit = summary.income - summary.spent;
  const profitMargin = summary.income > 0 ? ((netProfit / summary.income) * 100).toFixed(1) : '0.0';
  const distributableProfit = Math.max(0, netProfit);

  // Partner distribution
  const partnerDistribution = useMemo(() => {
    if (!partners || partners.length === 0) return [];
    return partners.map(p => {
      const allocated = (distributableProfit * (p.sharePct || 0)) / 100;
      const withdrawn = p.withdrawn || 0;
      const available = Math.max(0, allocated - withdrawn);
      return {
        ...p,
        allocated,
        withdrawn,
        available,
      };
    });
  }, [partners, distributableProfit]);

  const totalAllocated = partnerDistribution.reduce((acc, p) => acc + p.allocated, 0);
  const totalWithdrawn = partnerDistribution.reduce((acc, p) => acc + p.withdrawn, 0);
  const totalAvailable = partnerDistribution.reduce((acc, p) => acc + p.available, 0);

  return (
    <div className={s.wrap}>
      {/* ── BUSINESS KPIS (When in Business Profile) ── */}
      {isBusiness && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className={s.bizHero}>
            <span className={s.bizTitle}>
              <Icon name="charts" size={14} stroke="var(--blue)" />
              Financial Tracker Overview
            </span>
            {onImportSheetData && (
              <button
                className={s.syncSheetBtn}
                onClick={onImportSheetData}
                disabled={sheetSyncing}
                title={isLiveSync ? "Sync live with Google Sheet" : "Re-sync data from Google Sheet"}
              >
                <span>{sheetSyncing ? '⏳ Syncing…' : isLiveSync ? '🟢 Live Sync' : '🔄 Sync Sheet'}</span>
              </button>
            )}
          </div>

          <div className={s.kpiGrid}>
            <div className={`${s.kpiCard} ${s.kpiRevenue}`}>
              <span className={s.kpiLbl}>Total Inflows</span>
              <span className={`${s.kpiVal} ${s.kpiValGreen}`}>{fmt(summary.income)}</span>
              <span className={s.kpiSub}>Sales & Investments</span>
            </div>

            <div className={`${s.kpiCard} ${s.kpiExpense}`}>
              <span className={s.kpiLbl}>Total Expenses</span>
              <span className={`${s.kpiVal} ${s.kpiValRed}`}>{fmt(summary.spent)}</span>
              <span className={s.kpiSub}>Raw Materials & Travel</span>
            </div>

            <div className={`${s.kpiCard} ${s.kpiProfit}`}>
              <span className={s.kpiLbl}>Net Profit</span>
              <span className={`${s.kpiVal} ${netProfit >= 0 ? s.kpiValBlue : s.kpiValRed}`}>
                {fmt(netProfit)}
              </span>
              <span className={s.kpiSub}>{netProfit >= 0 ? 'Distributable surplus' : 'Operating deficit'}</span>
            </div>

            <div className={`${s.kpiCard} ${s.kpiMargin}`}>
              <span className={s.kpiLbl}>Profit Margin</span>
              <span className={`${s.kpiVal} ${s.kpiValAmber}`}>{profitMargin}%</span>
              <span className={s.kpiSub}>Return on cash flow</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 6-MONTH TREND BAR CHART ── */}
      <div className={s.section}>
        <div className={s.sectionLabel}>
          {isBusiness ? 'CASH FLOW TREND — 6 MONTHS' : 'INCOME VS SPENT — 6 MONTHS'}
        </div>
        <div className={s.barChart}>
          {trend.map((t, i) => (
            <div key={i} className={`${s.barGroup} ${t.key === currentKey ? s.barGroupActive : ''}`}>
              <div className={s.bars}>
                <div
                  className={`${s.bar} ${s.barIncome}`}
                  style={{ height: `${(t.income / maxTrend) * 100}%` }}
                  title={`Inflow: ${fmt(t.income)}`}
                />
                <div
                  className={`${s.bar} ${s.barSpent}`}
                  style={{ height: `${(t.spent / maxTrend) * 100}%` }}
                  title={`Outflow: ${fmt(t.spent)}`}
                />
              </div>
              <div className={s.barLabel}>{t.label}</div>
            </div>
          ))}
        </div>
        <div className={s.legend}>
          <div className={s.legendItem}>
            <span className={`${s.legendDot} ${s.dotIncome}`} />
            {isBusiness ? 'Inflow' : 'Income'}
          </div>
          <div className={s.legendItem}>
            <span className={`${s.legendDot} ${s.dotSpent}`} />
            {isBusiness ? 'Outflow' : 'Spent'}
          </div>
        </div>
      </div>

      {/* ── SUMMARY ROW (For Personal mode) ── */}
      {!isBusiness && (
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
      )}

      {/* ── EXPENSE CATEGORICAL BREAKDOWN ── */}
      <div className={s.section}>
        <div className={s.sectionLabel}>
          {isBusiness ? 'EXPENSES BY CATEGORY' : 'SPENDING BY CATEGORY'}
        </div>
        {catBreakdown.length === 0 && (
          <div className={s.empty}>No expense entries this cycle.</div>
        )}
        {catBreakdown.map(({ cat, amt }) => {
          const def = getCategoryDef(cat, 'debit', categories);
          const pct = Math.round((amt / totalSpent) * 100);
          return (
            <div key={cat} className={s.catRow}>
              <div className={s.catLeft}>
                <div className={s.catIcWrap}>
                  <Icon name={def?.icon || 'other'} size={18} stroke="var(--blue)" className={s.catIcGlow} />
                </div>
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

      {/* ── INFLOW / REVENUE CATEGORICAL BREAKDOWN ── */}
      {incomeBreakdown.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionLabel}>
            {isBusiness ? 'REVENUE & INFLOWS BY SOURCE' : 'INCOME BY CATEGORY'}
          </div>
          {incomeBreakdown.map(({ cat, amt }) => {
            const def = getCategoryDef(cat, 'credit', categories);
            const pct = Math.round((amt / totalIncome) * 100);
            return (
              <div key={cat} className={s.catRow}>
                <div className={s.catLeft}>
                  <div className={s.catIcWrap}>
                    <Icon name={def?.icon || 'salary'} size={18} stroke="var(--green)" className={s.catIcGlow} />
                  </div>
                  <span className={s.catName}>{def?.name || cat}</span>
                </div>
                <div className={s.catBar}>
                  <div className={s.catBarFillInflow} style={{ width: `${(amt / maxIncomeCat) * 100}%` }} />
                </div>
                <div className={s.catRight}>
                  <span className={s.catAmt} style={{ color: 'var(--green)' }}>{fmt(amt)}</span>
                  <span className={s.catPct}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PARTNER PROFIT DISTRIBUTION (Business Mode) ── */}
      {isBusiness && partnerDistribution.length > 0 && (
        <div className={s.section}>
          <div className={s.partnerHeader}>
            <span className={s.sectionLabel} style={{ margin: 0 }}>PARTNER PROFIT DISTRIBUTION</span>
            <span className={s.distProfitTag}>Pool: {fmt(distributableProfit)}</span>
          </div>

          {/* Visual multi-segmented distribution bar */}
          <div className={s.partnerDistBar}>
            {partnerDistribution.map(p => (
              <div
                key={p.id}
                className={s.partnerDistSeg}
                style={{ width: `${p.sharePct}%`, backgroundColor: p.color || 'var(--blue)' }}
                title={`${p.name}: ${p.sharePct}% (${fmtDec(p.allocated)})`}
              />
            ))}
          </div>

          <div className={s.partnerList}>
            {partnerDistribution.map(p => (
              <div key={p.id} className={s.partnerCard}>
                <div className={s.partnerLeft}>
                  <div className={s.partnerDot} style={{ backgroundColor: p.color || 'var(--blue)' }} />
                  <div className={s.partnerInfo}>
                    <div className={s.partnerName}>
                      {p.name}
                      <span className={s.partnerShareTag}>{p.sharePct}%</span>
                    </div>
                    <span className={s.partnerStatusSub}>
                      Allocated: {fmtDec(p.allocated)} · Withdrawn: {fmtDec(p.withdrawn)}
                    </span>
                  </div>
                </div>

                <div className={s.partnerRight}>
                  <span className={s.partnerAmount}>{fmtDec(p.available)}</span>
                  <span className={s.partnerAvailBadge}>Available</span>
                </div>
              </div>
            ))}
          </div>

          {/* Distribution Totals Row matching Spreadsheet */}
          <div className={s.partnerTotals}>
            <div className={s.partnerTotalItem}>
              <div className={s.partnerTotalVal}>{fmtDec(totalAllocated)}</div>
              <div className={s.partnerTotalLbl}>Allocated</div>
            </div>
            <div className={s.partnerTotalItem}>
              <div className={s.partnerTotalVal}>{fmtDec(totalWithdrawn)}</div>
              <div className={s.partnerTotalLbl}>Withdrawn</div>
            </div>
            <div className={s.partnerTotalItem}>
              <div className={s.partnerTotalVal} style={{ color: 'var(--green)' }}>{fmtDec(totalAvailable)}</div>
              <div className={s.partnerTotalLbl}>Available</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
