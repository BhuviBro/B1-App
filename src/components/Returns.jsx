import { useState } from 'react';
import ReturnsLent from './ReturnsLent';
import ReturnsBorrowed from './ReturnsBorrowed';
import ReturnsRecurring from './ReturnsRecurring';
import ReturnsExpected from './ReturnsExpected';
import s from './Returns.module.css';

const TABS = [
  { id: 'lent',      label: 'Lent'      },
  { id: 'borrowed',  label: 'Borrowed'  },
  { id: 'recurring', label: 'Recurring' },
  { id: 'expected',  label: 'Expected'  },
];

export default function Returns({
  entries,
  onAddReturn,
  onAddRepayment,
  onEdit,
  onDelete,
  categories,
  recurring,
  currentKey,
  onAddRecurring,
  onEditRecurring,
  onDeleteRecurring,
  onMarkRecurring,
  expected,
  onAddExpected,
  onEditExpected,
  onDeleteExpected,
  onMarkExpectedReceived,
  allMonthsData,
}) {
  const [activeTab, setActiveTab] = useState('lent');

  return (
    <div className={s.wrap}>
      {/* 4 Pill Tabs at Top */}
      <div className={s.subTabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${s.subTabBtn} ${activeTab === t.id ? s.subTabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'lent' && (
        <ReturnsLent
          entries={entries}
          onAddReturn={onAddReturn}
          onEdit={onEdit}
          onDelete={onDelete}
          categories={categories}
        />
      )}

      {activeTab === 'borrowed' && (
        <ReturnsBorrowed
          entries={entries}
          onAddRepayment={onAddRepayment}
          onEdit={onEdit}
          onDelete={onDelete}
          categories={categories}
        />
      )}

      {activeTab === 'recurring' && (
        <ReturnsRecurring
          recurring={recurring}
          currentKey={currentKey}
          onAddRecurring={onAddRecurring}
          onEditRecurring={onEditRecurring}
          onDeleteRecurring={onDeleteRecurring}
          onMarkRecurring={onMarkRecurring}
          categories={categories}
          allMonthsData={allMonthsData}
        />
      )}

      {activeTab === 'expected' && (
        <ReturnsExpected
          expected={expected}
          onAddExpected={onAddExpected}
          onEditExpected={onEditExpected}
          onDeleteExpected={onDeleteExpected}
          onMarkExpectedReceived={onMarkExpectedReceived}
        />
      )}
    </div>
  );
}
