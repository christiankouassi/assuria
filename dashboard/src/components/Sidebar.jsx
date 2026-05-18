import React from 'react';

function NavItem({ active, onClick, icon, label, badge }) {
  const baseClasses = "flex items-center gap-md p-md rounded-lg transition-colors group relative cursor-pointer";
  const activeClasses = active
    ? "bg-surface-container-high text-primary font-bold"
    : "text-on-surface-variant hover:bg-surface-container-high";

  return (
    <div className={`${baseClasses} ${activeClasses}`} onClick={onClick}>
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-body-md">{label}</span>
      {badge > 0 && (
        <div className="absolute right-3 bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ activeTab, setActiveTab, unreadCounts, onNewPolicy, t }) {
  const tabs = [
    { id: 'dashboard', icon: 'dashboard', label: t('sidebar.dashboard') },
    { id: 'conversations', icon: 'chat', label: t('sidebar.messages'), badge: unreadCounts?.messages },
    { id: 'claims', icon: 'report_problem', label: t('sidebar.claims'), badge: unreadCounts?.claims },
    { id: 'quotes', icon: 'request_quote', label: t('sidebar.quotes'), badge: unreadCounts?.quotes },
    { id: 'files', icon: 'folder_open', label: t('sidebar.files') },
    { id: 'help', icon: 'help', label: t('sidebar.help') },
  ];

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface flex flex-col justify-between py-lg px-md z-50 select-none">
      {/* Logo - fixe en haut */}
      <div className="mb-lg px-sm flex-shrink-0">
        <h1 className="font-headline-md text-headline-md font-bold text-primary m-0">Assuria AI</h1>
        <p className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider m-0">{t('sidebar.advisorPortal')}</p>
      </div>
      
      {/* Navigation - scrollable si nécessaire */}
      <nav className="flex-1 overflow-y-auto space-y-xs my-md pr-xs custom-scrollbar">
        {tabs.map(tab => (
          <NavItem
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
            badge={tab.badge}
          />
        ))}
      </nav>

      {/* Action Buttons - toujours visible en bas */}
      <div className="flex-shrink-0 space-y-md pt-md border-t border-outline-variant/30">
        <button 
          onClick={onNewPolicy}
          className="w-full bg-primary text-on-primary py-md rounded-lg font-bold transition-transform scale-95 active:scale-90 flex items-center justify-center gap-sm cursor-pointer border-none"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          {t('sidebar.newPolicy')}
        </button>
        <div>
          <div 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-md p-md rounded-lg transition-colors cursor-pointer ${
              activeTab === 'settings' 
                ? 'bg-surface-container-high text-primary font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-md">{t('sidebar.settings')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
