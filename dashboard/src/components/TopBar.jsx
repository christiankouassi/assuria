import React from 'react';

export default function TopBar({ theme, toggleTheme, notificationsCount, toggleNotifications }) {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 px-xl bg-surface/80 backdrop-blur-md flex justify-between items-center z-40 border-b border-outline-variant/30">
      <div className="flex items-center gap-lg w-1/2"></div>
      <div className="flex items-center gap-md">
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
        <div className="h-8 w-[1px] bg-outline-variant mx-sm"></div>
        <div className="flex items-center gap-sm cursor-pointer">
          <img 
            alt="Advisor Portrait" 
            className="w-8 h-8 rounded-full border border-primary/20 object-cover"
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop" 
          />
        </div>
      </div>
    </header>
  );
}
