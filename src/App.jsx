import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Camera, MapPin, FileText, ExternalLink, Lock, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzEUO44oHMKAdS_qUNv7SfP_0DRQiYBRhDaQbtvbG-mXPbRtKQmfyMS9ui9bIHGr54CQg/exec'; // ★ご自身のGAS URL

export default function App() {
  const [pass, setPass] = useState(localStorage.getItem('vietnam_app_pass') || '');
  const [inputPass, setInputPass] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentDate, setCurrentDate] = useState('8/29');
  const [scheduleData, setScheduleData] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  // モーダル用
  const [activeMediaList, setActiveMediaList] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  useEffect(() => {
    if (pass) {
      verifyAndFetch(pass);
    }
  }, []);

  const verifyAndFetch = async (targetPass) => {
    setLoading(true);
    try {
      const res = await fetch(`${GAS_URL}?pass=${encodeURIComponent(targetPass)}`);
      const data = await res.json();
      if (data.status === 'success') {
        localStorage.setItem('vietnam_app_pass', targetPass);
        setPass(targetPass);
        setIsAuthenticated(true);
        setScheduleData(data.data || []);
        fetchPhotos(targetPass, `${currentDate}_アルバム`);
      } else {
        handleAuthError();
      }
    } catch (err) {
      handleAuthError();
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = () => {
    localStorage.removeItem('vietnam_app_pass');
    setPass('');
    setIsAuthenticated(false);
    setAuthError(true);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    verifyAndFetch(inputPass);
  };

  const fetchPhotos = async (targetPass, albumName) => {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ pass: targetPass, action: 'getPhotos', albumName })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPhotos(data.photos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTabSwitch = (dateKey) => {
    setCurrentDate(dateKey);
    fetchPhotos(pass, `${dateKey}_アルバム`);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64Data = canvas.toDataURL('image/jpeg', 0.7);

        fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            pass,
            action: 'uploadPhoto',
            base64Data,
            albumName: `${currentDate}_アルバム`,
            mimeType: 'image/jpeg'
          })
        })
          .then((res) => res.json())
          .then((res) => {
            setUploading(false);
            if (res.status === 'success') {
              fetchPhotos(pass, `${currentDate}_アルバム`);
            } else {
              alert('アップロード失敗');
            }
          });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 未認証時：パスワード入力画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4"
        >
          <div className="text-5xl">🇻🇳</div>
          <h1 className="text-xl font-bold text-slate-800">ベトナム旅行ガイド 2026</h1>
          <p className="text-xs text-slate-500">パスワードを入力してログインしてください</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input type="text" name="username" defaultValue="vietnam-family" className="hidden" />
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="パスワード"
                value={inputPass}
                onChange={(e) => setInputPass(e.target.value)}
                className="w-full bg-slate-100 border text-center font-bold text-lg rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {authError && <p className="text-xs text-red-500 font-bold">パスワードが正しくありません</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl shadow-lg transition active:scale-95"
            >
              {loading ? '検証中...' : 'ログイン'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const filteredSchedule = scheduleData.filter((item) => item.date.includes(currentDate));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* ヘッダー */}
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center">
        <h1 className="text-base font-bold flex items-center gap-2">🇻🇳 家族旅行ガイド 2026</h1>
        {uploading && <span className="text-xs bg-emerald-700 px-2 py-1 rounded animate-pulse">写真保存中...</span>}
      </header>

      {/* タブバー */}
      <nav className="bg-white shadow flex justify-around border-b sticky top-14 z-30">
        {['8/29', '8/30', '8/31', '9/1'].map((date) => (
          <button
            key={date}
            onClick={() => handleTabSwitch(date)}
            className={`py-3 px-3 text-xs font-bold relative transition ${
              currentDate === date ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            {date}
            {currentDate === date && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full"
              />
            )}
          </button>
        ))}
      </nav>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* 写真撮影・追加カード */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4 text-emerald-600" /> 写真を撮影・追加
            </h2>
            <span className="text-xs text-slate-400">{currentDate} アルバム</span>
          </div>

          <label className="block w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-dashed border-emerald-200 text-center py-3 rounded-xl font-bold text-sm cursor-pointer transition active:scale-98">
            📸 カメラを起動して保存
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </section>

        {/* スケジュール一覧 */}
        <section className="space-y-3">
          <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" /> 今日のスケジュール
          </h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentDate}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {filteredSchedule.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">この日のスケジュールは未登録です</p>
              ) : (
                filteredSchedule.map((item, idx) => {
                  const urls = item.mediaUrls || [];
                  const mainUrl = item.btnUrl || urls[0] || '';
                  const btnType = item.btnType || 'マップ';

                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {item.city && `${item.city}・`}{item.time}
                          </span>
                          <h3 className="font-bold text-slate-800 text-base mt-1">{item.spot}</h3>
                        </div>

                        {/* アクションボタン */}
                        {urls.length > 0 && (btnType.includes('画像') || btnType.includes('PDF')) ? (
                          <button
                            onClick={() => {
                              setActiveMediaList(urls);
                              setCurrentSlideIdx(0);
                              setMediaModalOpen(true);
                            }}
                            className="bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" /> 資料 ({urls.length})
                          </button>
                        ) : mainUrl ? (
                          <a
                            href={mainUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5" /> マップ
                          </a>
                        ) : null}
                      </div>

                      {item.note && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                          {item.note}
                        </p>
                      )}
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* 共有アルバムギャラリー */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-700 text-sm">🖼️ 共有アルバム ({photos.length}枚)</h2>
            <button
              onClick={() => fetchPhotos(pass, `${currentDate}_アルバム`)}
              className="text-xs text-emerald-600 font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> 更新
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="aspect-square bg-slate-200 rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition"
              >
                <img src={p.url} alt="旅行写真" className="w-full h-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      </main>

      {/* スライド型モーダル (Framer Motion) */}
      <AnimatePresence>
        {mediaModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[75vh]"
            >
              <div className="p-3 bg-slate-100 flex justify-between items-center border-b shrink-0">
                <span className="text-xs font-bold text-slate-700">📄 プレビュー</span>
                <button
                  onClick={() => setMediaModalOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
                {activeMediaList.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentSlideIdx((prev) => Math.max(0, prev - 1))}
                      className="absolute left-2 z-20 bg-black/50 text-white p-2 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentSlideIdx((prev) => Math.min(activeMediaList.length - 1, prev + 1))}
                      className="absolute right-2 z-20 bg-black/50 text-white p-2 rounded-full"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <iframe
                  src={activeMediaList[currentSlideIdx]}
                  className="w-full h-full border-0"
                  title="Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}