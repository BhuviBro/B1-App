import { useState, useMemo } from 'react';
import { fmt, fmtDateTime, getCategoryDef, monthKey } from '../utils/storage';
import { Icon } from './Icons';
import s from './Logs.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPE_LABEL = { credit: 'Credit', debit: 'Debit', returnable: 'Lent' };

export default function Logs({ data, categories }) {
  const [showFilters, setShowFilters]   = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);
  const [filterType, setFilterType]     = useState('all');
  const [filterCats, setFilterCats]     = useState([]); // multi-select array
  const [filterDate, setFilterDate]     = useState('all');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  const now = new Date();
  const thisMonthKey = monthKey(now.getFullYear(), now.getMonth() + 1);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = monthKey(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1);

  const allEntries = useMemo(() => {
    const arr = [];
    Object.entries(data.months || {}).forEach(([key, month]) => {
      (month.entries || []).forEach(e => arr.push({ ...e, monthKey: key }));
    });
    return arr.sort((a, b) =>
      (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))
    );
  }, [data]);

  // All categories from ALL types in categories prop
  const allAvailableCats = useMemo(() => {
    const list = [];
    ['debit','credit','returnable'].forEach(type => {
      (categories?.[type] || []).forEach(c => {
        if (!list.find(x => x.id === c.id)) list.push({ ...c, type });
      });
    });
    return list;
  }, [categories]);

  const filtered = useMemo(() => allEntries.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterCats.length > 0 && !filterCats.includes(e.category)) return false;
    if (filterDate === 'thismonth' && e.monthKey !== thisMonthKey) return false;
    if (filterDate === 'lastmonth' && e.monthKey !== lastMonthKey) return false;
    if (filterDate === 'custom') {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo   && e.date > dateTo)   return false;
    }
    return true;
  }), [allEntries, filterType, filterCats, filterDate, dateFrom, dateTo, thisMonthKey, lastMonthKey]);

  const hasFilter = filterType !== 'all' || filterCats.length > 0 || filterDate !== 'all';

  function clearFilters() {
    setFilterType('all'); setFilterCats([]); setFilterDate('all');
    setDateFrom(''); setDateTo('');
  }

  function toggleCat(id) {
    setFilterCats(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  if (!allEntries.length) {
    return (
      <div className={s.empty}>
        <Icon name="logs" size={28} stroke="var(--text3)" />
        <div className={s.emptyText}>No entries yet.<br />Your history will appear here.</div>
      </div>
    );
  }

  let lastMonth = '';

  return (
    <div className={s.wrap}>
      {/* FILTER BAR */}
      <div className={s.filterBar}>
        <button
          className={`${s.filterBtn} ${showFilters ? s.filterBtnActive : ''}`}
          onClick={() => setShowFilters(p => !p)}
        >
          <Icon name="filter" size={12} stroke="currentColor" />
          Filters
          {hasFilter && <span className={s.filterDot} />}
        </button>
        {hasFilter && <button className={s.clearBtn} onClick={clearFilters}>Clear</button>}
        <span className={s.countLbl}>{filtered.length} entries</span>
      </div>

      {showFilters && (
        <div className={s.filterPanel}>
          {/* Type */}
          <div className={s.fRow}>
            <div className={s.fLbl}>TYPE</div>
            <div className={s.fPills}>
              {['all','credit','debit','returnable'].map(t => (
                <button key={t} className={`${s.fpill} ${filterType === t ? s.fpillActive : ''}`} onClick={() => setFilterType(t)}>
                  {t === 'all' ? 'All' : t === 'credit' ? 'Credit' : t === 'debit' ? 'Debit' : 'Lent'}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className={s.fRow}>
            <div className={s.fLbl}>DATE</div>
            <div className={s.fPills}>
              {[['all','All'],['thismonth','This Month'],['lastmonth','Last Month'],['custom','Custom']].map(([v,l]) => (
                <button key={v} className={`${s.fpill} ${filterDate === v ? s.fpillActive : ''}`} onClick={() => setFilterDate(v)}>{l}</button>
              ))}
            </div>
          </div>

          {filterDate === 'custom' && (
            <div className={s.fRow}>
              <div className={s.fLbl}>DATE RANGE</div>
              <div className={s.dateRow}>
                <input className={s.dateIn} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <span className={s.dateSep}>→</span>
                <input className={s.dateIn} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          )}

          {/* Category — button opens sheet */}
          <div className={s.fRow}>
            <div className={s.fLbl}>CATEGORIES</div>
            <button
              className={`${s.catFilterBtn} ${filterCats.length > 0 ? s.catFilterBtnActive : ''}`}
              onClick={() => setShowCatSheet(true)}
            >
              <Icon name="filter" size={11} stroke="currentColor" />
              {filterCats.length === 0 ? 'All categories' : `${filterCats.length} selected`}
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY MULTI-SELECT SHEET */}
      {showCatSheet && (
        <>
          <div className={s.catOverlay} onClick={() => setShowCatSheet(false)} />
          <div className={s.catSheet}>
            <div className={s.catSheetHandle} />
            <div className={s.catSheetHdr}>
              <span className={s.catSheetTitle}>Select Categories</span>
              <div style={{display:'flex',gap:8}}>
                {filterCats.length > 0 && (
                  <button className={s.catClearBtn} onClick={() => setFilterCats([])}>Clear</button>
                )}
                <button className={s.catDoneBtn} onClick={() => setShowCatSheet(false)}>Done</button>
              </div>
            </div>
            <div className={s.catSheetBody}>
              {allAvailableCats.map(c => {
                const selected = filterCats.includes(c.id);
                return (
                  <div key={c.id} className={`${s.catCheckRow} ${selected ? s.catCheckRowSel : ''}`} onClick={() => toggleCat(c.id)}>
                    <div className={s.catCheckLeft}>
                      <Icon name={c.icon || 'other'} size={18} stroke={selected ? 'var(--blue)' : 'var(--text3)'} />
                      <span className={s.catCheckName}>{c.name}</span>
                      <span className={s.catCheckType}>{c.type}</span>
                    </div>
                    <div className={`${s.checkbox} ${selected ? s.checkboxOn : ''}`}>
                      {selected && <Icon name="check" size={12} stroke="#fff" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ENTRY LIST */}
      <div className={s.list}>
        {!filtered.length && <div className={s.noResults}>No entries match the current filters.</div>}
        {filtered.map(e => {
          const [y, m] = e.monthKey.split('-');
          const mLabel = `${MONTHS[parseInt(m)-1]} ${y}`;
          const showHdr = mLabel !== lastMonth;
          lastMonth = mLabel;
          const catDef   = getCategoryDef(e.category, e.type, categories);
          const iconName = catDef?.icon || e.category || 'other';
          const color    = e.type === 'credit' ? 'green' : e.type === 'debit' ? 'red' : 'amber';
          const prefix   = e.type === 'credit' ? '+' : '−';
          const tagCls   = e.type === 'credit' ? s.tagGreen : e.type === 'debit' ? s.tagRed : s.tagAmber;

          return (
            <div key={e.id}>
              {showHdr && <div className={s.monthHdr}>{mLabel}</div>}
              <div className={s.row}>
                <div className={s.rowIc}>
                  <Icon name={iconName} size={18} stroke="var(--blue)" className={s.rowIcon} />
                </div>
                <div className={s.rowLeft}>
                  <div className={s.rowName}>{e.label}</div>
                  <div className={s.rowMeta}>
                    <span className={s.rowDate}>{fmtDateTime(e.date, e.time)}</span>
                    <span className={`${s.tag} ${tagCls}`}>{TYPE_LABEL[e.type]}</span>
                    {catDef && <span className={s.tagCat}>{catDef.name}</span>}
                  </div>
                </div>
                <div className={`${s.rowAmt} ${s[color]}`}>{prefix}{fmt(e.amount)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
