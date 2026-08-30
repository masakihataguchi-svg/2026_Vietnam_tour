import React from 'react';

export default function Header({ uploading, onLogout }) {
  return (
    <header className="bg-emerald-600 text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center">
      <h1 className="text-base font-bold flex items-center gap-2">🇻🇳 そうだベトナムに行こうツアー2026</h1>
      <div className="flex items-center gap-2">
        {uploading && <span className="text-xs bg-emerald-700 px-2 py-1 rounded animate-pulse">処理中...</span>}
        <button
          onClick={onLogout}
          className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg font-bold transition"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}