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

export default function Sidebar({ activeTab, setActiveTab, unreadCounts, onNewPolicy, onLogout, t, tenantInfo }) {
  const tabs = [
    { id: 'dashboard', icon: 'dashboard', label: t('sidebar.dashboard') },
    { id: 'conversations', icon: 'chat', label: t('sidebar.messages'), badge: unreadCounts?.messages },
    { id: 'claims', icon: 'report_problem', label: t('sidebar.claims'), badge: unreadCounts?.claims },
    { id: 'quotes', icon: 'request_quote', label: t('sidebar.quotes'), badge: unreadCounts?.quotes },
    { id: 'files', icon: 'folder_open', label: t('sidebar.files') },
    { id: 'help', icon: 'help', label: t('sidebar.help') },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface flex-col justify-between py-lg px-md z-50 select-none">
        {/* Logo - fixe en haut */}
        <div className="mb-lg px-sm flex-shrink-0">
          {tenantInfo?.logo_url ? (
            <img src={tenantInfo.logo_url} alt={tenantInfo.display_name || "Logo"} className="h-10 object-contain mb-xs" />
          ) : (
            <h1 className="font-headline-md text-headline-md font-bold text-primary m-0">{tenantInfo?.display_name || "Assuria AI"}</h1>
          )}
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
          
          <div className="space-y-xs">
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

            <div 
              onClick={onLogout}
              className="flex items-center gap-md p-md rounded-lg transition-colors cursor-pointer text-error/80 hover:text-error hover:bg-error/5"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-body-md">Se déconnecter</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden w-full h-16 fixed bottom-0 left-0 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-around px-sm z-50 select-none pb-safe">
        {tabs.slice(0, 5).map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center relative cursor-pointer rounded-full w-12 h-12 transition-colors ${
              activeTab === tab.id ? 'bg-surface-container-high text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">{tab.icon}</span>
            {tab.badge > 0 && (
              <div className="absolute top-1 right-1 bg-error text-on-error text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                {tab.badge}
              </div>
            )}
          </div>
        ))}
        {/* Settings Tab on Mobile */}
        <div 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center relative cursor-pointer rounded-full w-12 h-12 transition-colors ${
            activeTab === 'settings' ? 'bg-surface-container-high text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </div>
      </nav>
    </>
  );
}
