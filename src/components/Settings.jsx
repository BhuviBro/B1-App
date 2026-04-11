import { useState, useRef } from 'react';
import { uid, fmt, todayStr } from '../utils/storage';
import { Icon } from './Icons';
import Recurring from './Recurring';
import s from './Settings.module.css';

const TYPE_TABS  = ['debit', 'credit', 'returnable'];
const TYPE_LABEL = { debit: 'Debit', credit: 'Credit', returnable: 'Returnable' };
const SUGGESTED_ICONS = ['food','fuel','shopping','rent','medical','salary','received','travel','repayment','other'];

export default function Settings({
  open, onClose,
  categories, onSaveCategory, onDeleteCategory,
  theme, onToggleTheme,
  recurring, currentKey, onAddRecurring, onEditRecurring, onDeleteRecurring, onMarkRecurring,
  radar = [], onAddRadarItem, onMarkRadarBought, onDiscardRadarItem,
  onReorderCategories,
  onOpenAddEntry,
}) {
  const [section, setSection]     = useState('recurring');
  const [catType, setCatType]     = useState('debit');
  const [catSheet, setCatSheet]   = useState(null);
  const [catName, setCatName]     = useState('');
  const [catIcon, setCatIcon]     = useState('food');
  const [recSheet, setRecSheet]   = useState(null);
  const [recLabel, setRecLabel]   = useState('');
  const [recAmt, setRecAmt]       = useState('');
  const [recDay, setRecDay]       = useState('1');
  const [recAlert, setRecAlert]   = useState('5');

  // Radar state
  const [showRadar, setShowRadar]     = useState(false);
  const [radarSheet, setRadarSheet]   = useState(false);
  const [radarName, setRadarName]     = useState('');
  const [radarPrice, setRadarPrice]   = useState('');

  // Drag reorder state
  const dragIdx = useRef(null);
  const dragOver = useRef(null);

  function openAddCat() { setCatName(''); setCatIcon('food'); setCatSheet({ mode: 'add' }); }
  function openEditCat(cat) { setCatName(cat.name); setCatIcon(cat.icon || 'other'); setCatSheet({ mode: 'edit', cat }); }
  function saveCat() {
    if (!catName.trim()) return;
    onSaveCategory(catType, { id: catSheet.cat?.id || uid(), name: catName.trim(), icon: catIcon, type: catType });
    setCatSheet(null);
  }

  function openAddRec() { setRecLabel(''); setRecAmt(''); setRecDay('1'); setRecAlert('5'); setRecSheet({ mode: 'add' }); }
  function openEditRec(rec) { setRecLabel(rec.label); setRecAmt(String(rec.amount)); setRecDay(String(rec.dueDay)); setRecAlert(String(rec.alertDaysBefore ?? 5)); setRecSheet({ mode: 'edit', rec }); }
  function saveRec() {
    if (!recLabel.trim() || !(parseFloat(recAmt) > 0)) return;
    const payload = { label: recLabel.trim(), amount: parseFloat(recAmt), dueDay: parseInt(recDay) || 1, alertDaysBefore: parseInt(recAlert) || 5 };
    if (recSheet.mode === 'edit') onEditRecurring(recSheet.rec.id, payload);
    else onAddRecurring(payload);
    setRecSheet(null);
  }

  // Drag handlers for category reorder
  function handleDragStart(idx) { dragIdx.current = idx; }
  function handleDragEnter(idx) { dragOver.current = idx; }
  function handleDragEnd() {
    if (dragIdx.current !== null && dragOver.current !== null && dragIdx.current !== dragOver.current) {
      onReorderCategories(catType, dragIdx.current, dragOver.current);
    }
    dragIdx.current = null; dragOver.current = null;
  }
  // Touch drag for mobile
  function handleTouchStart(e, idx) {
    dragIdx.current = idx;
    e.currentTarget.style.opacity = '0.5';
  }
  function handleTouchEnd(e, idx) {
    e.currentTarget.style.opacity = '1';
    if (dragIdx.current !== null && dragOver.current !== null && dragIdx.current !== dragOver.current) {
      onReorderCategories(catType, dragIdx.current, dragOver.current);
    }
    dragIdx.current = null; dragOver.current = null;
  }
  function handleTouchMove(e) {
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el?.closest('[data-catidx]');
    if (row) dragOver.current = parseInt(row.dataset.catidx);
  }

  function addRadarItem() {
    if (!radarName.trim()) return;
    onAddRadarItem({ name: radarName.trim(), price: parseFloat(radarPrice) || 0 });
    setRadarName(''); setRadarPrice(''); setRadarSheet(false);
  }

  function handleBought(item) {
    onMarkRadarBought(item.id);
    // Open add entry pre-filled
    if (onOpenAddEntry) {
      onOpenAddEntry({ amount: item.price, type: 'debit', label: item.name, category: '', prefill: true });
    }
    onClose();
  }

  if (!open) return null;

  const pendingRadar = radar.filter(r => !r.bought);
  const boughtRadar  = radar.filter(r => r.bought);

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={s.sheet}>
        <div className={s.handle} />
        <div className={s.hdr}>
          <span className={s.title}>Settings</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={s.tabs}>
          {['recurring','categories','profile'].map(sec => (
            <button key={sec} className={`${s.tab} ${section === sec ? s.tabActive : ''}`} onClick={() => setSection(sec)}>
              {sec.charAt(0).toUpperCase() + sec.slice(1)}
            </button>
          ))}
        </div>

        <div className={s.body}>

          {/* ── RECURRING ── */}
          {section === 'recurring' && (
            <>
              <div className={s.secHdr}>
                <span className={s.secLbl}>RECURRING PAYMENTS</span>
                <button className={s.addBtn} onClick={openAddRec}>+ Add</button>
              </div>
              <p className={s.hint}>Alerts appear on Command 5 days before due.</p>
              <Recurring recurring={recurring} currentKey={currentKey} onMark={onMarkRecurring} onEdit={openEditRec} onDelete={onDeleteRecurring} />
            </>
          )}

          {/* ── CATEGORIES ── */}
          {section === 'categories' && (
            <>
              <div className={s.catTypeTabs}>
                {TYPE_TABS.map(t => (
                  <button key={t} className={`${s.ctt} ${catType === t ? s.cttActive : ''}`} onClick={() => setCatType(t)}>
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <div className={s.secHdr}>
                <span className={s.secLbl}>{TYPE_LABEL[catType].toUpperCase()} CATEGORIES</span>
                <button className={s.addBtn} onClick={openAddCat}>+ Add</button>
              </div>
              <p className={s.hint}>Hold and drag ≡ to reorder. Order reflects in Add Entry.</p>
              <div className={s.catList}>
                {(categories?.[catType] || []).map((cat, idx) => (
                  <div
                    key={cat.id}
                    className={s.catRow}
                    data-catidx={idx}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    onTouchStart={e => handleTouchStart(e, idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={e => handleTouchEnd(e, idx)}
                  >
                    <div className={s.dragHandle}>
                      <Icon name="logs" size={14} stroke="var(--text3)" />
                    </div>
                    <div className={s.catIcWrap}>
                      <Icon name={cat.icon || 'other'} size={20} stroke="var(--blue)" className={s.catIcGlow} />
                    </div>
                    <span className={s.catName}>{cat.name}</span>
                    <div className={s.catAct}>
                      <button className={s.catEditBtn} onClick={() => openEditCat(cat)}>Edit</button>
                      <button className={s.catDelBtn} onClick={() => onDeleteCategory(catType, cat.id)}>
                        <Icon name="trash" size={12} stroke="var(--red)" />
                      </button>
                    </div>
                  </div>
                ))}
                {!(categories?.[catType]?.length) && <div className={s.empty}>No categories yet.</div>}
              </div>
            </>
          )}

          {/* ── PROFILE ── */}
          {section === 'profile' && (
            <>
              <div className={s.profileCard}>
                <div className={s.avatar}>B1</div>
                <div>
                  <div className={s.pName}>Your Profile</div>
                  <div className={s.pSub}>Local · No login required</div>
                </div>
              </div>

              {/* RADAR */}
              <div className={s.radarSection}>
                <div className={s.secHdr}>
                  <div>
                    <span className={s.secLbl}>RADAR</span>
                    <span className={s.radarSub}> · {pendingRadar.length} pending</span>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className={s.addBtn} onClick={() => setRadarSheet(true)}>+ Add</button>
                    <button className={`${s.addBtn} ${s.radarToggle}`} onClick={() => setShowRadar(p => !p)}>
                      {showRadar ? 'Hide' : 'View all'}
                    </button>
                  </div>
                </div>
                <p className={s.hint}>Track what you want to buy. Tap Bought to log it.</p>

                {showRadar && (
                  <div className={s.radarList}>
                    {pendingRadar.length === 0 && boughtRadar.length === 0 && (
                      <div className={s.empty}>Nothing on radar yet.</div>
                    )}
                    {pendingRadar.map(item => (
                      <div key={item.id} className={s.radarRow}>
                        <div className={s.radarLeft}>
                          <div className={s.radarName}>{item.name}</div>
                          {item.price > 0 && <div className={s.radarPrice}>{fmt(item.price)}</div>}
                        </div>
                        <div className={s.radarActions}>
                          <button className={s.btnBought} onClick={() => handleBought(item)}>
                            <Icon name="check" size={13} stroke="currentColor" />
                            Bought
                          </button>
                          <button className={s.btnDiscard} onClick={() => onDiscardRadarItem(item.id)}>
                            <Icon name="trash" size={13} stroke="currentColor" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {boughtRadar.length > 0 && (
                      <>
                        <div className={s.radarDivider}>BOUGHT</div>
                        {boughtRadar.map(item => (
                          <div key={item.id} className={`${s.radarRow} ${s.radarRowBought}`}>
                            <div className={s.radarLeft}>
                              <div className={s.radarName}>{item.name}</div>
                              <div className={s.radarBoughtDate}>Bought {item.boughtDate}</div>
                              {item.price > 0 && <div className={s.radarPrice}>{fmt(item.price)}</div>}
                            </div>
                            <div className={s.radarActions}>
                              <span className={s.boughtBadge}>✓ Bought</span>
                              <button className={s.btnDiscard} onClick={() => onDiscardRadarItem(item.id)}>
                                <Icon name="trash" size={13} stroke="currentColor" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className={s.settingRow}>
                <div><div className={s.settingTitle}>Theme</div><div className={s.settingSub}>{theme === 'dark' ? 'Dark mode active' : 'Light mode active'}</div></div>
                <div className={s.togWrap} onClick={onToggleTheme}>
                  <div className={`${s.togTrack} ${theme === 'light' ? s.togOn : ''}`}>
                    <div className={s.togThumb} />
                  </div>
                </div>
              </div>
              <div className={s.settingRow}>
                <div><div className={s.settingTitle}>Data storage</div><div className={s.settingSub}>Saved locally in browser</div></div>
                <span className={s.badge}>Local</span>
              </div>
              <div className={s.settingRow}>
                <div><div className={s.settingTitle}>Version</div><div className={s.settingSub}>B1 · Keep It Simple</div></div>
                <span className={s.badge}>v2.0</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── RADAR ADD SHEET ── */}
      {radarSheet && (
        <>
          <div className={s.subOverlay} onClick={() => setRadarSheet(false)} />
          <div className={s.subSheet}>
            <div className={s.handle} />
            <div className={s.hdr}>
              <span className={s.title}>Add to Radar</span>
              <button className={s.closeBtn} onClick={() => setRadarSheet(false)}>✕</button>
            </div>
            <div className={s.subBody}>
              <div className={s.field}>
                <label className={s.lbl}>What do you want to buy?</label>
                <input className={s.input} value={radarName} onChange={e => setRadarName(e.target.value)} placeholder="e.g. Nike shoes, PS5…" autoFocus />
              </div>
              <div className={s.field}>
                <label className={s.lbl}>Price ₹ <span className={s.opt}>(optional)</span></label>
                <input className={`${s.input} ${s.mono}`} type="number" value={radarPrice} onChange={e => setRadarPrice(e.target.value)} placeholder="0" inputMode="decimal" />
              </div>
            </div>
            <div className={s.subFooter}>
              <button className={s.btnCancel} onClick={() => setRadarSheet(false)}>Cancel</button>
              <button className={s.btnSave} onClick={addRadarItem} disabled={!radarName.trim()}>Add to Radar</button>
            </div>
          </div>
        </>
      )}

      {/* ── CATEGORY ADD/EDIT SHEET ── */}
      {catSheet && (
        <>
          <div className={s.subOverlay} onClick={() => setCatSheet(null)} />
          <div className={s.subSheet}>
            <div className={s.handle} />
            <div className={s.hdr}>
              <span className={s.title}>{catSheet.mode === 'add' ? 'Add' : 'Edit'} {TYPE_LABEL[catType]} Category</span>
              <button className={s.closeBtn} onClick={() => setCatSheet(null)}>✕</button>
            </div>
            <div className={s.subBody}>
              <div className={s.field}>
                <label className={s.lbl}>Name</label>
                <input className={s.input} value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Groceries, EMI…" autoFocus />
              </div>
              <div className={s.field}>
                <label className={s.lbl}>Icon</label>
                <div className={s.iconGrid}>
                  {SUGGESTED_ICONS.map(ic => (
                    <button key={ic} className={`${s.iconBtn} ${catIcon === ic ? s.iconBtnSel : ''}`} onClick={() => setCatIcon(ic)}>
                      <Icon name={ic} size={18} stroke={catIcon === ic ? 'var(--blue)' : 'var(--text3)'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={s.subFooter}>
              <button className={s.btnCancel} onClick={() => setCatSheet(null)}>Cancel</button>
              <button className={s.btnSave} onClick={saveCat} disabled={!catName.trim()}>Save</button>
            </div>
          </div>
        </>
      )}

      {/* ── RECURRING ADD/EDIT SHEET ── */}
      {recSheet && (
        <>
          <div className={s.subOverlay} onClick={() => setRecSheet(null)} />
          <div className={s.subSheet}>
            <div className={s.handle} />
            <div className={s.hdr}>
              <span className={s.title}>{recSheet.mode === 'add' ? 'Add' : 'Edit'} Recurring</span>
              <button className={s.closeBtn} onClick={() => setRecSheet(null)}>✕</button>
            </div>
            <div className={s.subBody}>
              <div className={s.field}>
                <label className={s.lbl}>Label</label>
                <input className={s.input} value={recLabel} onChange={e => setRecLabel(e.target.value)} placeholder="e.g. Kredit Bee, Rent…" autoFocus />
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.lbl}>Amount ₹</label>
                  <input className={`${s.input} ${s.mono}`} type="number" value={recAmt} onChange={e => setRecAmt(e.target.value)} placeholder="0" inputMode="decimal" />
                </div>
                <div className={s.field}>
                  <label className={s.lbl}>Due Day</label>
                  <input className={`${s.input} ${s.mono}`} type="number" min="1" max="31" value={recDay} onChange={e => setRecDay(e.target.value)} placeholder="1–31" inputMode="numeric" />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.lbl}>Alert days before</label>
                <input className={`${s.input} ${s.mono}`} type="number" min="1" max="15" value={recAlert} onChange={e => setRecAlert(e.target.value)} placeholder="5" inputMode="numeric" />
                <span className={s.hint2}>Alert {recAlert || 5} days before day {recDay || 1} each month.</span>
              </div>
            </div>
            <div className={s.subFooter}>
              <button className={s.btnCancel} onClick={() => setRecSheet(null)}>Cancel</button>
              <button className={s.btnSave} onClick={saveRec} disabled={!recLabel.trim() || !(parseFloat(recAmt) > 0)}>Save</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
