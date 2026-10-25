import { useState } from 'react';
import { fmt, fmtDateTime, getCategoryDef } from '../utils/storage';
import { Icon } from './Icons';
import s from './Transactions.module.css';

const TYPE_LABEL = { credit: 'Credit', debit: 'Debit', returnable: 'Lent', borrowed: 'Borrowed' };

export default function Transactions({ entries, onEdit, onDelete, categories }) {
  const [expanded, setExpanded] = useState(null);

  const sorted = [...entries].sort((a, b) =>
    (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))
  );

  if (!sorted.length) {
    return (
      <div className={s.empty}>
        <Icon name="logs" size={28} stroke="var(--text3)" />
        <div className={s.emptyText}>No transactions this month.<br />Tap + to add one.</div>
      </div>
    );
  }

  return (
    <div className={s.feed}>
      {sorted.map(entry => {
        const catDef  = getCategoryDef(entry.category, entry.type, categories);
        const iconName = catDef?.icon || entry.category || 'other';
        const isExp    = expanded === entry.id;
        const color    = entry.type === 'credit' ? 'green' : entry.type === 'debit' ? 'red' : entry.type === 'borrowed' ? 'purple' : 'amber';
        const prefix   = (entry.type === 'credit' || entry.type === 'borrowed') ? '+' : '−';
        const tagCls   = entry.type === 'credit' ? s.tagGreen : entry.type === 'debit' ? s.tagRed : entry.type === 'borrowed' ? s.tagPurple : s.tagAmber;

        return (
          <div key={entry.id} className={`${s.entry} ${isExp ? s.entryExp : ''}`}>
            <div className={s.entryMain} onClick={() => setExpanded(isExp ? null : entry.id)}>
              <div className={s.iconWrap}>
                <Icon name={iconName} size={20} stroke="var(--blue)" className={s.catIcon} />
              </div>
              <div className={s.entryLeft}>
                <div className={s.entryName}>{entry.label}</div>
                <div className={s.entryMeta}>
                  <span className={s.entryDate}>{fmtDateTime(entry.date, entry.time)}</span>
                  {catDef && <span className={s.tagCat}>{catDef.name}</span>}
                  {entry.person && <span className={s.tagCat}>{entry.person}</span>}
                </div>
              </div>
              <div className={s.entryRight}>
                <div className={`${s.entryAmt} ${s[color]}`}>{prefix}{fmt(entry.amount)}</div>
                <span className={`${s.typeTag} ${tagCls}`}>{TYPE_LABEL[entry.type]}</span>
              </div>
            </div>

            {isExp && (
              <div className={s.expandPanel}>
                {entry.subItems && entry.subItems.length > 0 && (
                  <div className={s.subItems}>
                    <div className={s.subTitle}>Breakdown</div>
                    {entry.subItems.map((si, i) => (
                      <div key={i} className={s.subRow}>
                        <span>{si.name}</span>
                        <span className={s.mono}>{fmt(si.amount)}</span>
                      </div>
                    ))}
                    <div className={s.subTotal}>
                      <span>Total</span>
                      <span className={s.mono}>{fmt(entry.amount)}</span>
                    </div>
                  </div>
                )}
                <div className={s.actions}>
                  <button className={s.iconBtn} onClick={() => { onEdit(entry); setExpanded(null); }}>
                    <Icon name="edit" size={15} stroke="var(--text2)" />
                  </button>
                  <button className={`${s.iconBtn} ${s.iconBtnDel}`} onClick={() => { onDelete(entry.id); setExpanded(null); }}>
                    <Icon name="trash" size={15} stroke="var(--red)" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
