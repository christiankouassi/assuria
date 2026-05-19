import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout({ 
  children, 
  theme, 
  toggleTheme, 
  activeTab, 
  setActiveTab, 
  unreadCounts, 
  notificationsCount, 
  toggleNotifications,
  onNewPolicy,
  onLogout,
  showInstallBtn,
  handleInstallApp,
  t,
  tenantInfo
}) {
  return (
    <div className={`min-h-[100dvh] bg-background text-on-surface font-body-md flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadCounts={unreadCounts} 
        onNewPolicy={onNewPolicy}
        onLogout={onLogout}
        t={t}
        tenantInfo={tenantInfo}
      />
      <TopBar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        notificationsCount={notificationsCount} 
        toggleNotifications={toggleNotifications}
        onLogout={onLogout}
        showInstallBtn={showInstallBtn}
        handleInstallApp={handleInstallApp}
        tenantInfo={tenantInfo}
      />
      
      {activeTab === 'conversations' ? (
        <main className="ml-0 md:ml-60 pt-16 pb-16 md:pb-0 h-[100dvh] overflow-hidden flex flex-col">
          {children}
        </main>
      ) : (
        <main className="ml-0 md:ml-60 pt-20 md:pt-24 pb-20 md:pb-xl px-4 md:px-xl min-h-screen">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}
