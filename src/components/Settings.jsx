import { useState, useRef } from 'react';
import ae from './AddEntry.module.css';
import { uid, fmt, todayStr } from '../utils/storage';
import { Icon } from './Icons';
import s from './Settings.module.css';

const TYPE_TABS = ['debit', 'credit', 'returnable', 'borrowed'];
const TYPE_LABEL = { debit: 'Debit', credit: 'Credit', returnable: 'Returnable', borrowed: 'Borrowed' };
const SUGGESTED_ICONS = ['food', 'fuel', 'shopping', 'rent', 'medical', 'salary', 'received', 'travel', 'repayment', 'other'];

export default function Settings({
  open, onClose,
  activeProfile, profiles = [], onSwitchProfile,
  categories, onSaveCategory, onDeleteCategory,
  theme, onToggleTheme,
  radar = [], onAddRadarItem, onMarkRadarBought, onDiscardRadarItem,
  onReorderCategories,
  onOpenAddEntry,
  trash = [], onRestoreEntry, onDeleteEntryPermanent, onClearTrash,
  user, onSignOut,
  onImportSheetData,
  onClearProfileData,
}) {
  const [section, setSection] = useState('categories');
  const [catType, setCatType] = useState('debit');
  const [catSheet, setCatSheet] = useState(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('food');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Radar state
  const [showRadar, setShowRadar] = useState(false);
  const [radarSheet, setRadarSheet] = useState(false);
  const [radarName, setRadarName] = useState('');
  const [radarPrice, setRadarPrice] = useState('');

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
    if (onOpenAddEntry) {
      onOpenAddEntry({ amount: item.price, type: 'debit', label: item.name, category: '', prefill: true });
    }
    onClose();
  }

  if (!open) return null;

  const pendingRadar = radar.filter(r => !r.bought);
  const boughtRadar = radar.filter(r => r.bought);

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
          {['categories', 'profile'].map(sec => (
            <button key={sec} className={`${s.tab} ${section === sec ? s.tabActive : ''}`} onClick={() => setSection(sec)}>
              {sec.charAt(0).toUpperCase() + sec.slice(1)}
            </button>
          ))}
        </div>

        <div className={s.body}>
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
              <p className={s.hint}>Customizing {activeProfile?.name || 'Personal'} categories. Hold and drag ≡ to reorder.</p>
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
                <div className={s.avatar}>
                  {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'B1'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={s.pName}>{user?.displayName || 'User Profile'}</div>
                  <div className={s.pSub} style={{ wordBreak: 'break-all' }}>{user?.email || 'Signed in with Google'}</div>
                </div>
                {onSignOut && (
                  <button className={s.signOutBtn} onClick={onSignOut}>Sign out</button>
                )}
              </div>

              {/* ACTIVE PROFILE SELECTOR */}
              <div className={s.settingRow} style={{ marginTop: 12 }}>
                <div>
                  <div className={s.settingTitle}>Current Profile</div>
                  <div className={s.settingSub}>
                    {activeProfile?.id === 'business'
                      ? 'Business Mode · Violet accent · Work categories'
                      : 'Personal Mode · Cyan accent · Personal categories'}
                  </div>
                </div>
                <span className={s.badge} style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }}>
                  {activeProfile?.name || 'Personal'}
                </span>
              </div>
              {profiles.length > 1 && onSwitchProfile && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4, marginBottom: 8 }}>
                  {profiles.map(p => {
                    const isAct = p.id === activeProfile?.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSwitchProfile(p.id)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: isAct ? '1px solid var(--blue)' : '1px solid var(--border2)',
                          background: isAct ? 'var(--blue-bg)' : 'var(--surface)',
                          color: isAct ? 'var(--blue)' : 'var(--text2)',
                          fontFamily: 'Rajdhani, sans-serif',
                          fontWeight: 600,
                          fontSize: '12px',
                          letterSpacing: '.06em',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          transition: 'all .15s'
                        }}
                      >
                        {isAct && <Icon name="check" size={13} stroke="currentColor" />}
                        {p.name} Profile
                      </button>
                    );
                  })}
                </div>
              )}

              {activeProfile?.id === 'business' && onImportSheetData && (
                <div style={{ marginTop: -2, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={onImportSheetData}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border2)',
                      background: 'var(--surface2)',
                      color: 'var(--blue)',
                      fontFamily: 'Rajdhani, sans-serif',
                      fontWeight: 600,
                      fontSize: '12px',
                      letterSpacing: '.06em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      transition: 'all .15s'
                    }}
                  >
                    <span>📊 Re-import October 2026 Financial Sheet</span>
                  </button>
                </div>
              )}

              {/* RADAR */}
              <div className={s.radarSection}>
                <div className={s.secHdr}>
                  <div>
                    <span className={s.secLbl}>RADAR</span>
                    <span className={s.radarSub}> · {pendingRadar.length} pending</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
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

              {/* TRASH */}
              <div className={s.radarSection} style={{ marginTop: 12 }}>
                <div className={s.secHdr}>
                  <div>
                    <span className={s.secLbl}>TRASH</span>
                    <span className={s.radarSub}> · {trash.length} items</span>
                  </div>
                  {trash.length > 0 && (
                    <button className={s.addBtn} style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={onClearTrash}>Clear All</button>
                  )}
                </div>
                <p className={s.hint}>Deleted entries. Restore or permanently delete.</p>
                {trash.length === 0 && <div className={s.empty}>Trash is empty.</div>}
                {trash.length > 0 && (
                  <div className={s.radarList}>
                    {trash.map(item => (
                      <div key={item.id} className={s.radarRow}>
                        <div className={s.radarLeft}>
                          <div className={s.radarName}>{item.label}</div>
                          <div className={s.radarBoughtDate}>Deleted {item.deletedAt} · ₹{Math.round(item.amount).toLocaleString('en-IN')}</div>
                        </div>
                        <div className={s.radarActions}>
                          <button className={s.btnBought} onClick={() => onRestoreEntry(item.id)}>Restore</button>
                          <button className={s.btnDiscard} onClick={() => onDeleteEntryPermanent(item.id)}>
                            <Icon name="trash" size={13} stroke="currentColor" />
                          </button>
                        </div>
                      </div>
                    ))}
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
                <div><div className={s.settingTitle}>Data storage</div><div className={s.settingSub}>Cloud Sync · Firebase Firestore</div></div>
                <span className={s.badge}>Synced</span>
              </div>

              <div className={s.settingRow}>
                <div><div className={s.settingTitle}>Version</div><div className={s.settingSub}>B1 · Keep It Simple</div></div>
                <span className={s.badge}>v2.0</span>
              </div>

              <div className={s.settingRow} style={{ marginTop: 4 }}>
                <div>
                  <div className={s.settingTitle} style={{ color: 'var(--red)' }}>Reset Profile Data</div>
                  <div className={s.settingSub}>
                    Wipe all {activeProfile?.name || 'Personal'} entries, recurring, and balance
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--red)',
                    background: 'var(--red-bg)',
                    color: 'var(--red)',
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all .15s'
                  }}
                >
                  Clear Data
                </button>
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

      {/* ── RESET PROFILE DATA CONFIRMATION MODAL ── */}
      {showResetConfirm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 120 }} onClick={() => setShowResetConfirm(false)} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: '480px', background: 'var(--surface)',
            borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', zIndex: 121,
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--red)', fontFamily: 'Rajdhani, sans-serif' }}>
              Clear All {activeProfile?.name || 'Personal'} Data?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>
              This will permanently delete all months, transactions, recurring items, and trash in your <strong>{activeProfile?.name || 'Personal'}</strong> profile.
              {activeProfile?.id === 'personal' && ' Your Business profile will remain completely untouched.'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearProfileData?.();
                  setShowResetConfirm(false);
                }}
                style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--red)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Yes, Clear Everything
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
