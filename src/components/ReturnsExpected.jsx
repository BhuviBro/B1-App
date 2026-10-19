import { useState } from 'react';
import { fmt, fmtDate, todayStr } from '../utils/storage';
import { Icon } from './Icons';
import s from './Returns.module.css';

export default function ReturnsExpected({
  expected = [],
  onAddExpected,
  onEditExpected,
  onDeleteExpected,
  onMarkExpectedReceived,
}) {
  const [sheet, setSheet] = useState(null); // { mode: 'add' | 'edit', item? }
  const [label, setLabel] = useState('');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState(todayStr());
  const [showReceived, setShowReceived] = useState(false);

  const today = todayStr();

  const pendingItems = expected
    .filter(x => x.status !== 'received')
    .sort((a, b) => (a.expectedDate || '').localeCompare(b.expectedDate || ''));

  const receivedItems = expected
    .filter(x => x.status === 'received')
    .sort((a, b) => (b.receivedDate || '').localeCompare(a.receivedDate || ''));

  const totalPending = pendingItems.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  function openAdd() {
    setLabel(''); setPerson(''); setAmount(''); setExpectedDate(todayStr());
    setSheet({ mode: 'add' });
  }

  function openEdit(item) {
    setLabel(item.label || '');
    setPerson(item.person || '');
    setAmount(String(item.amount || ''));
    setExpectedDate(item.expectedDate || todayStr());
    setSheet({ mode: 'edit', item });
  }

  function saveItem() {
    const amt = parseFloat(amount) || 0;
    if (!label.trim() || amt <= 0) return;
    const payload = {
      label: label.trim(),
      person: person.trim(),
      amount: amt,
      expectedDate: expectedDate || todayStr(),
    };
    if (sheet.mode === 'edit') onEditExpected(sheet.item.id, payload);
    else onAddExpected(payload);
    setSheet(null);
  }

  return (
    <div>
      {/* Header and Add button */}
      <div className={s.secHdr}>
        <span className={s.sectionLabel} style={{ padding: 0 }}>EXPECTED INFLOW</span>
        <button className={s.addBtn} onClick={openAdd}>+ Add</button>
      </div>
      <p className={s.hint}>Track money you expect to receive. Does not affect balance until marked received.</p>

      {/* Summary card */}
      <div className={s.sumCards} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className={s.sumCard}>
          <div className={s.sumVal} style={{ color: 'var(--green)' }}>{fmt(totalPending)}</div>
          <div className={s.sumLbl}>Pending Expected</div>
        </div>
        <div className={s.sumCard}>
          <div className={s.sumVal} style={{ color: 'var(--blue)' }}>{pendingItems.length}</div>
          <div className={s.sumLbl}>Pending Items</div>
        </div>
      </div>

      {pendingItems.length === 0 && (
        <div className={s.empty} style={{ padding: '30px 20px' }}>
          <Icon name="received" size={32} stroke="var(--text3)" />
          <div className={s.emptyTxt}>No pending expected money.<br />Tap + Add to log upcoming income.</div>
        </div>
      )}

      {/* List of Pending Items */}
      {pendingItems.map(item => {
        const isOverdue = item.expectedDate && item.expectedDate < today;

        return (
          <div key={item.id} className={s.card} style={{ cursor: 'default' }}>
            <div className={s.cardHead}>
              <div className={s.headLeft}>
                <div className={s.personName}>
                  {item.label}{item.person ? ` (${item.person})` : ''}
                </div>
                <div className={s.meta}>
                  Expected: {fmtDate(item.expectedDate)}
                  {isOverdue && <span className={s.badgeOverdue} style={{ marginLeft: 6 }}>Overdue</span>}
                </div>
              </div>
              <div className={s.headRight}>
                <div className={`${s.sumVal} ${s.green}`} style={{ fontSize: '13px', margin: 0 }}>
                  +{fmt(item.amount)}
                </div>
              </div>
            </div>

            <div className={s.cardBody} style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className={s.btnReceived} onClick={() => onMarkExpectedReceived(item)}>
                  <Icon name="check" size={13} stroke="currentColor" />
                  Mark Received
                </button>
                <div className={s.actions} style={{ border: 'none', padding: 0, gap: 6 }}>
                  <button className={s.iconBtn} onClick={() => openEdit(item)}>
                    <Icon name="edit" size={13} stroke="var(--text2)" />
                  </button>
                  <button className={`${s.iconBtn} ${s.iconBtnDel}`} onClick={() => onDeleteExpected(item.id)}>
                    <Icon name="trash" size={13} stroke="var(--red)" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Received Collapsible Section */}
      {receivedItems.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button className={s.receivedToggle} onClick={() => setShowReceived(p => !p)}>
            <span>{showReceived ? '▼' : '▶'}</span>
            <span>Received Items ({receivedItems.length})</span>
          </button>

          {showReceived && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {receivedItems.map(item => (
                <div key={item.id} className={`${s.card} ${s.receivedCard}`} style={{ cursor: 'default' }}>
                  <div className={s.cardHead}>
                    <div className={s.headLeft}>
                      <div className={s.personName}>
                        {item.label}{item.person ? ` (${item.person})` : ''}
                      </div>
                      <div className={s.meta}>
                        Received {item.receivedDate ? fmtDate(item.receivedDate) : '✓'}
                      </div>
                    </div>
                    <div className={s.headRight}>
                      <span className={`${s.badge} ${s.settled}`}>✓ Received</span>
                      <span className={`${s.sumVal} ${s.green}`} style={{ margin: 0, fontSize: '12px' }}>
                        +{fmt(item.amount)}
                      </span>
                      <button
                        className={`${s.iconBtn} ${s.iconBtnDel}`}
                        style={{ width: 26, height: 26 }}
                        onClick={() => onDeleteExpected(item.id)}
                      >
                        <Icon name="trash" size={12} stroke="var(--red)" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Sheet */}
      {sheet && (
        <>
          <div className={s.overlay} onClick={() => setSheet(null)} />
          <div className={s.retSheet}>
            <div className={s.handle} />
            <div className={s.sheetHdr}>
              <span className={s.sheetTitle}>{sheet.mode === 'add' ? 'Add' : 'Edit'} Expected Inflow</span>
              <button className={s.sheetClose} onClick={() => setSheet(null)}>✕</button>
            </div>
            <div className={s.sheetBody}>
              <div className={s.field}>
                <label className={s.lbl}>What are you expecting?</label>
                <input
                  className={s.input}
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Freelance invoice, Bonus, Tax refund…"
                  autoFocus
                />
              </div>
              <div className={s.field}>
                <label className={s.lbl}>From Person / Source <span className={s.opt}>(optional)</span></label>
                <input
                  className={s.input}
                  value={person}
                  onChange={e => setPerson(e.target.value)}
                  placeholder="e.g. Acme Corp, Rahul…"
                />
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.lbl}>Amount ₹</label>
                  <input
                    className={`${s.input} ${s.mono}`}
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
                <div className={s.field}>
                  <label className={s.lbl}>Expected Date</label>
                  <input
                    className={`${s.input} ${s.mono}`}
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={s.sheetFooter}>
              <button className={s.btnCancel} onClick={() => setSheet(null)}>Cancel</button>
              <button
                className={s.btnSave}
                onClick={saveItem}
                disabled={!label.trim() || !(parseFloat(amount) > 0)}
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
