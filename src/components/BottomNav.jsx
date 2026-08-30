import React from 'react';
import { Home, Camera, Image as ImageIcon, Languages, Navigation, Bot } from 'lucide-react';

export default function BottomNav({ activeNavTab, setActiveNavTab }) {
  const tabs = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'camera', label: 'カメラ', icon: Camera },
    { id: 'album', label: 'アルバム', icon: ImageIcon },
    { id: 'translate', label: '通訳', icon: Languages },
    { id: 'location', label: '移動ログ', icon: Navigation },
    { id: 'gemini', label: 'Gemini', icon: Bot },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-lg">
      <div className="max-w-md mx-auto flex justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeNavTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveNavTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 w-1/6 py-1 transition ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[8px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}