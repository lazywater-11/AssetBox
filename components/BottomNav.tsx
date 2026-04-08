import React from 'react';
import { ICONS } from '../constants';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: 'dashboard', label: 'Home', icon: ICONS.Dashboard },
    { id: 'portfolio', label: 'Portfolio', icon: ICONS.Portfolio },
    { id: 'journal', label: 'Journal', icon: ICONS.Journal },
    { id: 'settings', label: 'Settings', icon: ICONS.Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-brand-dark border-t border-white/10 flex md:hidden z-30">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 min-h-[56px] transition-colors ${
              isActive ? 'text-brand-green' : 'text-brand-muted'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
