import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Map, Clock, RefreshCw, CheckCircle2, LogOut, Sparkles, X } from 'lucide-react';

export default function LocationTab({ gasUrl, pass, userName }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gettingGPS, setGettingGPS] = useState(false);

  // スポット照会確認モーダル用ステート
  const [modalOpen, setMediaModalOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null); // { lat, lng, type }
  const [confirmedSpot, setConfirmedSpot] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [identifying, setIdentifying] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${gasUrl}?pass=${encodeURIComponent(pass)}`);
      const data = await res.json();
      if (data.status === 'success' && data.locationHistory) {
        setHistory(data.locationHistory);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 1. GPSを取得してGeminiにスポット名を照会
  const startLocationProcess = (type) => {
    if (!navigator.geolocation) {
      alert('お使いの端末はGPS位置情報に対応していません');
      return;
    }

    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setPendingLocation({ lat, lng, type });
        setGettingGPS(false);
        setIdentifying(true);
        setMediaModalOpen(true);

        // Gemini照会APIを呼び出し
        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
              pass,
              action: 'identifyLocation',
              lat,
              lng
            })
          });
          const data = await res.json();
          if (data.status === 'success' && data.prediction) {
            setConfirmedSpot(data.prediction.suggestedSpot || '現在地');
            setCandidates(data.prediction.candidates || []);
          } else {
            setConfirmedSpot('現在地');
          }
        } catch (err) {
          setConfirmedSpot('現在地');
        } finally {
          setIdentifying(false);
        }
      },
      (err) => {
        setGettingGPS(false);
        alert(`位置情報の取得に失敗しました (${err.message})`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 2. 確定ボタンでシートへ記録
  const saveConfirmedLocation = async () => {
    if (!pendingLocation || !confirmedSpot.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({
          pass,
          action: 'recordLocation',
          userName: userName || '家族',
          type: pendingLocation.type,
          spot: confirmedSpot.trim(),
          lat: pendingLocation.lat,
          lng: pendingLocation.lng
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.locationHistory) {
        setHistory(data.locationHistory);
        setMediaModalOpen(false);
        setPendingLocation(null);
        setConfirmedSpot('');
      } else {
        alert('記録に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="location"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-600"/> 移動ログ & GPS記録
        </h2>
        <button
          onClick={fetchHistory}
          className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm"
        >
          <RefreshCw className="w-3 h-3"/> 更新
        </button>
      </div>

      {/* 到着/出発記録アクションカード */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          ボタンを押すとGPS位置を取得し、Geminiが現在地のお店・スポット名を推定します。
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => startLocationProcess('arrival')}
            disabled={gettingGPS}
            className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4"/> 📍 到着を記録
          </button>

          <button
            onClick={() => startLocationProcess('departure')}
            disabled={gettingGPS}
            className="py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4"/> 🚪 出発を記録
          </button>
        </div>

        {gettingGPS && (
          <p className="text-[11px] text-emerald-600 font-bold text-center animate-pulse pt-1">
            📡 GPS座標を取得中...
          </p>
        )}
      </div>

      {/* タイムライン表示 */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5"/> 本日の足跡タイムライン ({history.length}件)
        </h3>

        {history.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs border border-slate-100">
            まだ位置ログが登録されていません
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item, idx) => {
              const isArrival = item.type === 'arrival';
              return (
                <div
                  key={idx}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`p-2 rounded-xl text-white text-xs font-bold shrink-0 mt-0.5 ${
                      isArrival ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}>
                      {isArrival ? '到着' : '出発'}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs truncate">{item.spot}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>🕒 {item.timestamp}</span>
                        <span>👤 {item.user}</span>
                      </p>
                    </div>
                  </div>

                  {item.mapUrl && (
                    <a
                      href={item.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold px-2.5 py-1.5 rounded-xl shrink-0 flex items-center gap-1 border border-blue-100"
                    >
                      <Map className="w-3.5 h-3.5"/> 地図
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🤖 スポット名確認ポップアップモーダル */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Gemini スポット推定
                </span>
                <button
                  onClick={() => setMediaModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {identifying ? (
                <div className="py-8 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">GPS座標と照合中...</p>
                  <p className="text-[11px] text-slate-400">現在地のお店・スポット名を推定しています</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      {pendingLocation?.type === 'arrival' ? '📍 到着したスポット名' : '🚪 出発したスポット名'}
                    </label>
                    <input
                      type="text"
                      value={confirmedSpot}
                      onChange={(e) => setConfirmedSpot(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 font-bold text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {candidates.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">その他の候補 (タップで選択):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {candidates.map((cand, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => setConfirmedSpot(cand)}
                            className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition"
                          >
                            {cand}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => setMediaModalOpen(false)}
                      className="w-1/3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveConfirmedLocation}
                      disabled={loading || !confirmedSpot.trim()}
                      className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                    >
                      {loading ? '保存中...' : 'このスポット名で保存'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}