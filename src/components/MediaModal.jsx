import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';

export default function MediaModal({
  mediaModalOpen,
  setMediaModalOpen,
  activeMediaList,
  currentSlideIdx,
  setCurrentSlideIdx,
  onDeletePhoto
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const videoRef = useRef(null);

  if (!mediaModalOpen) return null;

  const currentMedia = activeMediaList[currentSlideIdx];

  // Google DriveのファイルID抽出
  const getDriveId = (urlOrId) => {
    if (!urlOrId) return '';
    const match = String(urlOrId).match(/\/d\/([^\/]+)/) || String(urlOrId).match(/id=([^&]+)/);
    return match && match[1] ? match[1] : urlOrId;
  };

  const fileId = getDriveId(currentMedia?.rawUrl || currentMedia?.url || currentMedia?.id);
  
  // iPhoneでも直接ストリーミング再生可能なGoogle Drive直リンクURL
  const videoStreamUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : currentMedia?.rawUrl;

  const handleNext = () => {
    setIsZoomed(false);
    setCurrentSlideIdx((prev) => Math.min(activeMediaList.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setIsZoomed(false);
    setCurrentSlideIdx((prev) => Math.max(0, prev - 1));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-slate-950 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-slate-800"
        >
          {/* ヘッダー */}
          <div className="p-3 bg-slate-900 flex justify-between items-center border-b border-slate-800 shrink-0 text-white">
            <span className="text-xs font-bold text-slate-300">
              {currentMedia?.isVideo ? '🎬 動画' : '🖼️ 写真'} ({currentSlideIdx + 1}/{activeMediaList.length})
            </span>
            <div className="flex items-center gap-2">
              {currentMedia?.isImage && (
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1"
                  title="拡大切り替え"
                >
                  {isZoomed ? <ZoomOut className="w-4 h-4 text-emerald-400"/> : <ZoomIn className="w-4 h-4"/>}
                </button>
              )}
              {currentMedia && (
                <button
                  onClick={() => onDeletePhoto(currentMedia)}
                  className="p-1.5 text-red-400 hover:bg-red-950/50 rounded-lg font-bold flex items-center gap-1 text-xs transition"
                  title="ゴミ箱へ移動"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
              )}
              <button
                onClick={() => {
                  setIsZoomed(false);
                  setMediaModalOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-6 h-6"/>
              </button>
            </div>
          </div>

          {/* メインプレビュー表示エリア */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {/* 左右スライドボタン */}
            {activeMediaList.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentSlideIdx === 0}
                  className="absolute left-2 z-30 bg-black/60 text-white p-2.5 rounded-full disabled:opacity-20 active:scale-95 transition"
                >
                  <ChevronLeft className="w-6 h-6"/>
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentSlideIdx === activeMediaList.length - 1}
                  className="absolute right-2 z-30 bg-black/60 text-white p-2.5 rounded-full disabled:opacity-20 active:scale-95 transition"
                >
                  <ChevronRight className="w-6 h-6"/>
                </button>
              </>
            )}

            {/* ① 動画プレイヤー（iOS Safari対応：HTML5 <video> + playsInline） */}
            {currentMedia?.isVideo ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                <video
                  ref={videoRef}
                  key={videoStreamUrl}
                  controls
                  playsInline
                  webkit-playsinline="true"
                  preload="metadata"
                  className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-lg"
                  src={videoStreamUrl}
                >
                  お使いのブラウザは動画再生に対応していません。
                </video>
              </div>
            ) : currentMedia?.isImage ? (
              /* ② 画像表示（タップで拡大） */
              <div
                className="w-full h-full overflow-auto flex items-center justify-center cursor-zoom-in p-1"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <img
                  src={currentMedia.directUrl}
                  alt="拡大表示"
                  className={`transition-transform duration-300 object-contain ${
                    isZoomed ? 'scale-150 max-w-none' : 'w-full h-full'
                  }`}
                />
              </div>
            ) : (
              /* ③ その他資料・ドライブファイル */
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                <iframe
                  src={currentMedia?.previewUrl}
                  className="w-full h-full border-0"
                  title="Preview"
                />
              </div>
            )}

            {/* 直リンクボタン */}
            <div className="absolute bottom-3 bg-black/70 backdrop-blur px-3 py-1.5 rounded-xl text-center z-20">
              <a
                href={currentMedia?.rawUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white underline font-bold flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5"/> ブラウザで直接開く
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}