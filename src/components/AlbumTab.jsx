import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, RefreshCw, Video } from 'lucide-react';

export default function AlbumTab({
  currentDate,
  sortedPhotos,
  onFetchPhotos,
  getDirectImageUrl,
  getDrivePreviewUrl,
  setActiveNavTab,
  setActiveMediaList,
  setCurrentSlideIdx,
  setMediaModalOpen
}) {
  // 動画ファイル判定
  const isVideoFile = (item) => {
    const name = (item.name || item.title || item.url || '').toLowerCase();
    return /\.(mp4|mov|webm|avi|m4v)($|\?)/i.test(name);
  };

  return (
    <motion.div
      key="album"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-emerald-600"/> 共有アルバム ({currentDate}) - {sortedPhotos.length}件
        </h2>
        <button
          onClick={onFetchPhotos}
          className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
        >
          <RefreshCw className="w-3 h-3"/> 更新
        </button>
      </div>

      {sortedPhotos.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border border-slate-100 space-y-2">
          <p className="text-xs text-slate-400">この日の写真・動画はまだありません</p>
          <button
            onClick={() => setActiveNavTab('camera')}
            className="text-xs text-emerald-600 font-bold underline"
          >
            最初の写真・動画を追加する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sortedPhotos.map((p, i) => {
            const rawUrl = p.url || p.id || '';
            const displayImgUrl = getDirectImageUrl(rawUrl);
            const isVideo = isVideoFile(p);

            return (
              <button
                key={p.id || i}
                onClick={() => {
                  const formattedList = sortedPhotos.map((item) => {
                    const url = item.url || item.id || '';
                    const itemIsVideo = isVideoFile(item);
                    return {
                      ...item,
                      rawUrl: url,
                      isVideo: itemIsVideo,
                      isImage: !itemIsVideo,
                      directUrl: getDirectImageUrl(url),
                      previewUrl: getDrivePreviewUrl(url)
                    };
                  });
                  setActiveMediaList(formattedList);
                  setCurrentSlideIdx(i);
                  setMediaModalOpen(true);
                }}
                className="aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition border border-slate-100 relative group"
              >
                {isVideo ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white relative">
                    <Video className="w-8 h-8 text-emerald-400" />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                      動画
                    </span>
                  </div>
                ) : (
                  <img
                    src={displayImgUrl}
                    alt="旅行写真"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}