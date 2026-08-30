import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Volume2, Maximize2, Utensils, X, Send } from 'lucide-react';

const QUICK_PHRASES = [
  '会計お願いします',
  'いくらですか？',
  'パクチー抜きでお願いします',
  '辛くしないでください',
  'おすすめは何ですか？',
  'タクシーを呼んでください'
];

export default function TranslateTab({ gasUrl, pass }) {
  const [jaInput, setJaInput] = useState('');
  const [viInput, setViInput] = useState('');
  const [translateResult, setTranslateResult] = useState(null);
  const [menuResult, setMenuResult] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [menuTranslating, setMenuTranslating] = useState(false);
  const [fullscreenVietnamese, setFullscreenVietnamese] = useState(false);

  // テキスト翻訳処理（モード切替対応）
  const handleTranslate = async (textToTranslate, mode = 'ja2vi') => {
    const targetText = textToTranslate || (mode === 'ja2vi' ? jaInput : viInput);
    if (!targetText || !targetText.trim() || translating) return;

    setTranslating(true);
    setTranslateResult(null);

    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({
          pass,
          action: 'translate',
          text: targetText.trim(),
          mode: mode
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.result) {
        setTranslateResult(data.result);
      } else {
        alert(data.message || '翻訳に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました: ' + err.toString());
    } finally {
      setTranslating(false);
    }
  };

  // メニューカメラ翻訳処理
  const handleMenuImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMenuTranslating(true);
    setMenuResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify({
            pass,
            action: 'translateImage',
            base64Data,
            mimeType: file.type || 'image/jpeg'
          })
        });
        const data = await res.json();
        if (data.status === 'success' && data.result) {
          setMenuResult(data.result);
        } else {
          alert(data.message || 'メニューの読み取りに失敗しました');
        }
      } catch (err) {
        alert('通信エラーが発生しました');
      } finally {
        setMenuTranslating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ベトナム語読み上げ (Text-to-Speech)
  const speakVietnamese = (text) => {
    if (!('speechSynthesis' in window)) return alert('音声再生に対応していません');
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'vi-VN';
    uttr.rate = 0.85;
    window.speechSynthesis.speak(uttr);
  };

  return (
    <motion.div
      key="translate"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <Languages className="w-4 h-4 text-emerald-600"/> 現場でつかえる日越通訳
        </h2>
      </div>

      {/* 📸 カメラメニュー翻訳 */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-3xl text-white shadow-md space-y-2">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5" />
          <h3 className="font-bold text-sm">📸 メニューカメラ翻訳</h3>
        </div>
        <p className="text-[11px] text-emerald-100 leading-tight">
          ベトナム語のメニューや看板を撮影すると、Geminiが日本語の料理名と解説に変換します。
        </p>

        <label className="block w-full bg-white text-emerald-800 text-center py-2.5 rounded-2xl font-bold text-xs shadow cursor-pointer transition active:scale-95 mt-2">
          {menuTranslating ? 'メニューを解析中...' : '📷 メニュー・看板を撮影する'}
          <input type="file" accept="image/*" capture="environment" onChange={handleMenuImageUpload} className="hidden" disabled={menuTranslating} />
        </label>
      </div>

      {/* メニュー解析結果 */}
      {menuResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-4 rounded-2xl border border-emerald-200 shadow space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1">🍽️ メニュー解読結果</h4>
            <button onClick={() => setMenuResult(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕ 閉じる</button>
          </div>

          {menuResult.summary && (
            <p className="text-[11px] text-slate-500 bg-emerald-50 p-2 rounded-xl font-medium">💡 {menuResult.summary}</p>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {menuResult.dishes?.map((dish, dIdx) => (
              <div key={dIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-800 text-xs">{dish.japanese || dish.name}</span>
                  {dish.price && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">{dish.price}</span>}
                </div>
                <p className="text-[10px] text-slate-400 italic">{dish.name}</p>
                {dish.description && <p className="text-[11px] text-slate-600 leading-snug">{dish.description}</p>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ⚡ クイックフレーズ */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-slate-400">⚡ よく使うフレーズ (タップで翻訳)</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PHRASES.map((phrase, pIdx) => (
            <button
              key={pIdx}
              onClick={() => {
                setJaInput(phrase);
                handleTranslate(phrase, 'ja2vi');
              }}
              className="text-xs bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition active:scale-95"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* カード①: 🇯🇵 日本語 ➔ 🇻🇳 ベトナム語 */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
          🇯🇵 日本語 ➔ 🇻🇳 ベトナム語
        </span>
        <textarea
          rows={2}
          placeholder="伝えたい日本語を入力（キーボードのマイク🎤も使えます）..."
          value={jaInput}
          onChange={(e) => setJaInput(e.target.value)}
          className="w-full p-2 text-xs border-0 focus:outline-none resize-none text-slate-800"
        />
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={() => handleTranslate(jaInput, 'ja2vi')}
            disabled={translating || !jaInput.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-40 flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{translating ? '翻訳中...' : 'ベトナム語に翻訳'}</span>
          </button>
        </div>
      </div>

      {/* カード②: 🇻🇳 ベトナム語 ➔ 🇯🇵 日本語（相手用） */}
      <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-2xl shadow-sm space-y-2">
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
          🇻🇳 ベトナム語 ➔ 🇯🇵 日本語（相手用）
        </span>
        <textarea
          rows={2}
          placeholder="相手にベトナム語を入力（またはキーボードのマイク🎤）してもらってください..."
          value={viInput}
          onChange={(e) => setViInput(e.target.value)}
          className="w-full p-2 text-xs border-0 focus:outline-none resize-none text-slate-800 bg-white/80 rounded-xl"
        />
        <div className="flex justify-end pt-1">
          <button
            onClick={() => handleTranslate(viInput, 'vi2ja')}
            disabled={translating || !viInput.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-40 flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{translating ? '翻訳中...' : '日本語に翻訳'}</span>
          </button>
        </div>
      </div>

      {/* 翻訳結果表示 */}
      {translateResult && !translating && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-lg space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">✨ 翻訳結果</span>
            <div className="flex gap-1">
              {translateResult.vietnamese && (
                <button onClick={() => speakVietnamese(translateResult.vietnamese)} className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center gap-1">
                  <Volume2 className="w-4 h-4"/> 発音
                </button>
              )}
              <button onClick={() => setFullscreenVietnamese(true)} className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl">
                <Maximize2 className="w-4 h-4"/>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
            <p className="text-xl font-black text-slate-900 break-words leading-snug">{translateResult.vietnamese}</p>
            {translateResult.pronunciation && <p className="text-xs font-bold text-emerald-600">🗣️ カタカナ: {translateResult.pronunciation}</p>}
            <p className="text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-medium">🇯🇵 日本語: {translateResult.japanese}</p>
          </div>
          {translateResult.note && <p className="text-[11px] text-slate-500 bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-100">💡 {translateResult.note}</p>}
        </motion.div>
      )}

      {/* ベトナム語超大型表示モーダル */}
      <AnimatePresence>
        {fullscreenVietnamese && translateResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-6 text-white text-center">
            <div className="w-full flex justify-end">
              <button onClick={() => setFullscreenVietnamese(false)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300">
                <X className="w-8 h-8"/>
              </button>
            </div>
            <div className="my-auto space-y-6 max-w-md w-full px-2">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">【店員さんへお見せください】</p>
              <p className="text-5xl md:text-6xl font-black text-emerald-400 leading-tight tracking-tight break-words">{translateResult.vietnamese}</p>
              <p className="text-base text-slate-300 font-medium">({translateResult.japanese})</p>
            </div>
            <button onClick={() => speakVietnamese(translateResult.vietnamese)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition">
              <Volume2 className="w-7 h-7"/> 音声を再再生する
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}