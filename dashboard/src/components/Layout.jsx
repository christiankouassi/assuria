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
  onNewPolicy
}) {
  return (
    <div className={`min-h-[100dvh] bg-background text-on-surface font-body-md flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadCounts={unreadCounts} 
        onNewPolicy={onNewPolicy}
      />
      <TopBar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        notificationsCount={notificationsCount} 
        toggleNotifications={toggleNotifications} 
      />
      
      {activeTab === 'conversations' ? (
        <main className="ml-60 pt-16 h-screen overflow-hidden flex flex-col">
          {children}
        </main>
      ) : (
        <main className="ml-60 pt-24 pb-xl px-xl min-h-screen">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}
