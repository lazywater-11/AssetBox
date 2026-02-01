import React from 'react';
import { ICONS, APP_NAME } from '../constants';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail: string | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userEmail, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
    { id: 'portfolio', label: 'Portfolio', icon: ICONS.Portfolio },
    { id: 'journal', label: 'Journal', icon: ICONS.Journal },
    { id: 'settings', label: 'Settings', icon: ICONS.Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-brand-dark border-r border-white/5 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center">
          <ICONS.Bank className="text-black w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">{APP_NAME}</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-card text-brand-green font-medium shadow-lg shadow-black/20' 
                  : 'text-brand-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-brand-green' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6">
        {userEmail && (
           <div className="mb-4 px-2">
             <div className="text-xs text-brand-muted uppercase tracking-wider mb-1">Logged in as</div>
             <div className="text-sm text-white font-medium truncate" title={userEmail}>{userEmail}</div>
           </div>
        )}
        <button 
          onClick={onLogout}
          className="w-full py-3 px-4 font-bold rounded-full flex items-center justify-center gap-2 transition-colors bg-brand-card text-brand-red hover:bg-white/5 border border-white/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;