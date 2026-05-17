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

export default function Sidebar({ activeTab, setActiveTab, unreadCounts }) {
  const tabs = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'conversations', icon: 'chat', label: 'Messages', badge: unreadCounts?.messages },
    { id: 'claims', icon: 'report_problem', label: 'Sinistres', badge: unreadCounts?.claims },
    { id: 'quotes', icon: 'request_quote', label: 'Devis', badge: unreadCounts?.quotes },
    { id: 'files', icon: 'folder_open', label: 'Fichiers' },
    { id: 'help', icon: 'help', label: 'Aide' },
  ];

  return (
    <aside className="w-60 h-full fixed left-0 top-0 border-r border-outline-variant bg-surface flex flex-col py-lg px-md z-50">
      <div className="mb-xl px-sm">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">Assuria AI</h1>
        <p className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Advisor Portal</p>
      </div>
      
      <nav className="flex-grow space-y-xs">
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

      <div className="mt-auto space-y-md">
        <button className="w-full bg-primary text-on-primary py-md rounded-lg font-bold transition-transform scale-95 active:scale-90 flex items-center justify-center gap-sm">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          New Policy
        </button>
        <div className="pt-lg border-t border-outline-variant">
          <div className="flex items-center gap-md p-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-body-md">Settings</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
