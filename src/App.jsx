import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useStore } from './hooks/useStore';
import StatusPanel from './components/StatusPanel';
import Transactions from './components/Transactions';
import AddEntry from './components/AddEntry';
import Returns from './components/Returns';
import Logs from './components/Logs';
import Charts from './components/Charts';
import Settings from './components/Settings';
import Recurring from './components/Recurring';
import Login from './components/Login';
import { Icon } from './components/Icons';
import s from './App.module.css';
import { calcOverallBalance, todayStr } from './utils/storage';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function App() {
  const { user, loading: authLoading, error: authError, signIn, signOut } = useAuth();
  if (authLoading) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
        <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:'28px',fontWeight:600,color:'var(--blue)',letterSpacing:'.06em',filter:'drop-shadow(var(--glow-blue))'}}>B1</div>
      </div>
    );
  }
  if (!user) return <Login onSignIn={signIn} error={authError} loading={authLoading} />;
  return <AppInner user={user} signOut={signOut} />;
}

function AppInner({ user, signOut }) {
  const [tab, setTab]                     = useState('command');
  const [sheetOpen, setSheetOpen]         = useState(false);
  const [editEntry_, setEditEntry_]       = useState(null);
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [toast, setToast]                 = useState('');
  const [prefillEntry, setPrefillEntry]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('b1-profile') || 'personal');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-profile', activeProfileId);
    localStorage.setItem('b1-profile', activeProfileId);
  }, [activeProfileId]);

  const store = useStore(user.uid, activeProfileId);
  const {
    data, monthData, currentKey, changeMonth,
    addEntry, editEntry, setBasepower, addReturn, addRepayment,
    trash, moveToTrash, restoreEntry, deleteEntryPermanent, clearTrash,
    categories, saveCategory, deleteCategory, reorderCategories,
    recurring, addRecurring, editRecurring, deleteRecurring, markRecurring,
    radar, addRadarItem, markRadarBought, discardRadarItem,
    expected, addExpectedItem, editExpectedItem, deleteExpectedItem, markExpectedReceived,
    theme, toggleTheme, syncing, ready,
    activeProfile, profiles,
    partners, importSheetData, clearProfileData,
  } = store;

  function switchProfile(pid) {
    if (pid === activeProfileId) {
      setProfileMenuOpen(false);
      return;
    }
    setActiveProfileId(pid);
    setProfileMenuOpen(false);
    showToast(`Switched to ${pid === 'business' ? 'Business' : 'Personal'}`);
  }

  if (!ready) {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--bg)',gap:12}}>
        <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:'28px',fontWeight:600,color:'var(--blue)',letterSpacing:'.06em',filter:'drop-shadow(var(--glow-blue))'}}>B1</div>
        <div style={{fontSize:'12px',color:'var(--text3)',fontFamily:'Rajdhani,sans-serif',letterSpacing:'.12em'}}>LOADING…</div>
      </div>
    );
  }

  const [y, m] = currentKey.split('-').map(Number);
  const monthLabel = `${MONTHS[m-1]} ${y}`;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function handleSave(entry) {
    if (editEntry_) {
      editEntry(editEntry_.id, entry);
      showToast('Entry updated.');
    } else {
      addEntry(entry);
      showToast('Entry saved.');
      if (prefillEntry?.isRecurringPay && prefillEntry?.recurringId) {
        markRecurring(prefillEntry.recurringId, 'paid');
      }
      if (prefillEntry?.isExpectedReceived && prefillEntry?.expectedId) {
        markExpectedReceived(prefillEntry.expectedId);
      }
    }
    setEditEntry_(null);
    setPrefillEntry(null);
  }

  function handleDelete(id, label) {
    setConfirmDelete({ id, label: label || 'this entry' });
  }

  function confirmDeleteEntry() {
    if (!confirmDelete) return;
    moveToTrash(confirmDelete.id);
    showToast('Moved to trash.');
    setConfirmDelete(null);
  }

  function handleRadarBought(entry) { setPrefillEntry(entry); setSheetOpen(true); }
  function handleEdit(entry)        { setEditEntry_(entry); setSheetOpen(true); }
  function handleRecurringPaid(rec) {
    setEditEntry_(null);
    setPrefillEntry({
      amount: rec.amount,
      type: 'debit',
      label: rec.label,
      category: rec.category || (rec.isLoan ? 'repayment' : 'other_d'),
      date: todayStr(),
      isRecurringPay: true,
      recurringId: rec.id,
      isLoan: !!(rec.isLoan || rec.totalBorrowed),
      totalBorrowed: rec.totalBorrowed || null,
      baseEmi: rec.amount,
    });
    setSheetOpen(true);
  }

  function handleExpectedReceived(item) {
    setEditEntry_(null);
    setPrefillEntry({
      amount: item.amount,
      type: 'credit',
      label: item.label,
      category: 'received',
      person: item.person || '',
      date: todayStr(),
      isExpectedReceived: true,
      expectedId: item.id,
    });
    setSheetOpen(true);
  }

  function openNew() { setEditEntry_(null); setPrefillEntry(null); setSheetOpen(true); }

  const allEntries = monthData.entries || [];
  const overall    = calcOverallBalance(data);

  const recentEntries = (() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
    twoDaysAgo.setHours(0, 0, 0, 0);
    const cutoff = twoDaysAgo.toISOString().slice(0, 10);
    return allEntries
      .filter(e => e.type !== 'returnable' && e.type !== 'borrowed' && e.date >= cutoff)
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
      .slice(0, 10);
  })();

  const NAV = [
    { id: 'command', label: 'Command', icon: 'command' },
    { id: 'returns', label: 'Returns', icon: 'returns' },
    { id: 'charts',  label: 'Charts',  icon: 'charts'  },
    { id: 'logs',    label: 'Logs',    icon: 'logs'    },
  ];

  return (
    <div className={s.app}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <button className={s.logoBtn} onClick={() => setSettingsOpen(true)}>
            <span className={s.logo}>B1</span>
            <span className={s.dotSep} />
            <span className={s.headerSub}>KEEP IT SIMPLE</span>
          </button>

          <div className={s.profilePillWrap}>
            <button
              className={s.profilePill}
              onClick={() => setProfileMenuOpen(p => !p)}
              title="Switch profile"
            >
              <span>{activeProfile?.name || 'Personal'}</span>
              <span className={s.profileCaret} style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            {profileMenuOpen && (
              <>
                <div className={s.profileMenuOverlay} onClick={() => setProfileMenuOpen(false)} />
                <div className={s.profileMenu}>
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      className={`${s.profileMenuItem} ${p.id === activeProfileId ? s.profileMenuItemActive : ''}`}
                      onClick={() => switchProfile(p.id)}
                    >
                      <span>{p.name}</span>
                      {p.id === activeProfileId && <Icon name="check" size={12} stroke="currentColor" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={s.headerRight}>
          {syncing && <span className={s.syncDot} title="Syncing…" />}
          <div className={s.cycleNav}>
            <button className={s.cycleBtn} onClick={() => changeMonth(-1)}>‹</button>
            <span className={s.cycleLabel}>{monthLabel}</span>
            <button className={s.cycleBtn} onClick={() => changeMonth(1)}>›</button>
          </div>
          <button className={s.themeBtn} onClick={toggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} stroke="var(--text2)" />
          </button>
        </div>
      </div>

      <div className={s.content}>
        {tab === 'command' && (
          <>
            <StatusPanel monthData={monthData} overall={overall} data={data} />
            <Recurring recurring={recurring} currentKey={currentKey} onMark={(id, status) => {
              if (status === 'paid') {
                const rec = recurring.find(r => r.id === id);
                if (rec) handleRecurringPaid(rec);
              } else {
                markRecurring(id, status);
              }
            }} inline />
            <div className={s.feedHeader}>
              <span className={s.feedLabel}>RECENT TRANSACTIONS</span>
              <div className={s.basepowerRow}>
                <span className={s.basepowerLabel}>
                  Opening Balance
                  {monthData.basepowerAutoFilled && <span className={s.autoTag}>auto</span>}
                </span>
                <input
                  className={s.basepowerInput}
                  type="number"
                  defaultValue={monthData.basepower || 0}
                  key={currentKey}
                  onBlur={e => setBasepower(e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
            </div>
            <Transactions entries={recentEntries} onEdit={handleEdit} onDelete={handleDelete} categories={categories} />
            {allEntries.filter(e => e.type !== 'returnable' && e.type !== 'borrowed').length > recentEntries.length && (
              <div className={s.viewAllRow}>
                <button className={s.viewAllBtn} onClick={() => setTab('logs')}>View all transactions →</button>
              </div>
            )}
          </>
        )}
        {tab === 'returns' && (
          <Returns
            entries={allEntries}
            onAddReturn={addReturn}
            onAddRepayment={addRepayment}
            onEdit={handleEdit}
            onDelete={handleDelete}
            categories={categories}
            recurring={recurring}
            currentKey={currentKey}
            onAddRecurring={addRecurring}
            onEditRecurring={editRecurring}
            onDeleteRecurring={deleteRecurring}
            onMarkRecurring={(id, status) => {
              if (status === 'paid') {
                const rec = recurring.find(r => r.id === id);
                if (rec) handleRecurringPaid(rec);
              } else {
                markRecurring(id, status);
              }
            }}
            expected={expected}
            onAddExpected={addExpectedItem}
            onEditExpected={editExpectedItem}
            onDeleteExpected={deleteExpectedItem}
            onMarkExpectedReceived={handleExpectedReceived}
            allMonthsData={data?.months}
          />
        )}
        {tab === 'charts' && (
          <Charts
            data={data}
            currentKey={currentKey}
            categories={categories}
            isBusiness={activeProfileId === 'business'}
            partners={partners}
            onImportSheetData={() => {
              importSheetData();
              showToast('Financial sheet data imported to Business!');
            }}
          />
        )}
        {tab === 'logs'   && <Logs data={data} categories={categories} onDelete={handleDelete} />}
      </div>

      <nav className={s.nav}>
        {NAV.slice(0, 2).map(n => (
          <div key={n.id} className={`${s.navItem} ${tab === n.id ? s.active : ''}`} onClick={() => setTab(n.id)}>
            <Icon name={n.icon} size={20} stroke="var(--blue)" className={tab === n.id ? s.navIconActive : s.navIcon} />
            <span className={`${s.navLabel} ${tab === n.id ? s.navLabelActive : ''}`}>{n.label}</span>
          </div>
        ))}
        <div className={s.navAdd} onClick={openNew}>
          <Icon name="plus" size={22} stroke="#fff" />
        </div>
        {NAV.slice(2).map(n => (
          <div key={n.id} className={`${s.navItem} ${tab === n.id ? s.active : ''}`} onClick={() => setTab(n.id)}>
            <Icon name={n.icon} size={20} stroke="var(--blue)" className={tab === n.id ? s.navIconActive : s.navIcon} />
            <span className={`${s.navLabel} ${tab === n.id ? s.navLabelActive : ''}`}>{n.label}</span>
          </div>
        ))}
      </nav>

      <AddEntry
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditEntry_(null); setPrefillEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry_ || prefillEntry}
        categories={categories}
      />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activeProfile={activeProfile}
        profiles={profiles}
        onSwitchProfile={switchProfile}
        categories={categories}
        onSaveCategory={saveCategory}
        onDeleteCategory={deleteCategory}
        theme={theme}
        onToggleTheme={toggleTheme}
        radar={radar}
        onAddRadarItem={addRadarItem}
        onMarkRadarBought={markRadarBought}
        onDiscardRadarItem={discardRadarItem}
        onReorderCategories={reorderCategories}
        onOpenAddEntry={handleRadarBought}
        user={user}
        onSignOut={signOut}
        trash={trash}
        onRestoreEntry={restoreEntry}
        onDeleteEntryPermanent={deleteEntryPermanent}
        onClearTrash={clearTrash}
        onImportSheetData={() => {
          importSheetData();
          showToast('Financial sheet data imported to Business!');
        }}
        onClearProfileData={() => {
          clearProfileData();
          showToast(`${activeProfile?.name || 'Profile'} data cleared completely!`);
        }}
      />

      {confirmDelete && (
        <>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:100}} onClick={() => setConfirmDelete(null)} />
          <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',background:'var(--surface)',borderRadius:'20px 20px 0 0',padding:'24px 20px 36px',zIndex:101,display:'flex',flexDirection:'column',gap:16}}>
            <div style={{fontSize:'16px',fontWeight:600,color:'var(--text)',fontFamily:'Rajdhani,sans-serif'}}>Delete Entry?</div>
            <div style={{fontSize:'13px',color:'var(--text2)'}}>"{confirmDelete.label}" will be moved to trash. You can restore it from Settings.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={() => setConfirmDelete(null)} style={{padding:'11px',borderRadius:'10px',border:'1px solid var(--border2)',background:'transparent',color:'var(--text2)',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
              <button onClick={confirmDeleteEntry} style={{padding:'11px',borderRadius:'10px',border:'none',background:'var(--red)',color:'#fff',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Move to Trash</button>
            </div>
          </div>
        </>
      )}

      <div className={`${s.toast} ${toast ? s.toastShow : ''}`}>{toast}</div>
    </div>
  );
}