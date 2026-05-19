import React from 'react';

export default function TopBar({ 
  theme, 
  toggleTheme, 
  notificationsCount, 
  toggleNotifications, 
  onLogout,
  showInstallBtn,
  handleInstallApp
}) {
  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-240px)] h-16 px-4 md:px-xl bg-surface/80 backdrop-blur-md flex justify-between items-center z-40 border-b border-outline-variant/30">
      <div className="flex items-center gap-lg">
        <h2 className="md:hidden font-headline-sm text-headline-sm font-bold text-primary m-0">Assuria</h2>
      </div>
      <div className="flex items-center gap-sm md:gap-md">
        {showInstallBtn && (
          <button 
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded-xl font-bold transition-all text-xs cursor-pointer no-print shadow-sm animate-pulse"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Installer</span>
          </button>
        )}
        
        <button 
          className="p-sm text-on-surface-variant hover:text-primary transition-colors relative"
          onClick={toggleNotifications}
        >
          <span className="material-symbols-outlined">notifications</span>
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
          )}
        </button>
        <button 
          className="p-sm text-on-surface-variant hover:text-primary transition-colors"
          onClick={toggleTheme}
        >
          <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        </button>
        <div className="h-8 w-[1px] bg-outline-variant mx-xs md:mx-sm"></div>
        <div className="flex items-center gap-sm">
          <img 
            alt="Advisor Portrait" 
            className="w-8 h-8 rounded-full border border-primary/20 object-cover"
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop" 
          />
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-1 text-error/85 hover:text-error hover:bg-error/5 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer ml-1"
              title="Se déconnecter"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
