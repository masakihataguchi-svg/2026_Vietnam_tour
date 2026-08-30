import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Image as ImageIcon, Calendar } from 'lucide-react';

export default function ScheduleTab({
  currentDate,
  filteredSchedule,
  isImageUrl,
  getDirectImageUrl,
  getDrivePreviewUrl,
  setActiveMediaList,
  setCurrentSlideIdx,
  setMediaModalOpen
}) {
  return (
    <motion.div
      key="schedule"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600"/> スケジュール ({currentDate})
        </h2>
        <span className="text-xs text-slate-400 font-bold">{filteredSchedule.length}件の予定</span>
      </div>

      {filteredSchedule.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs border border-slate-100">
          この日の予定はありません
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSchedule.map((item, idx) => {
            const mediaUrls = item.media
              ? String(item.media).split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
              : [];

            return (
              <div
                key={idx}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2.5"
              >
                {/* 時間 ＆ タイトル */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                      <Clock className="w-3 h-3" /> {item.time || '終日'}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.spot || item.title || '予定'}</h3>
                  </div>

                  {/* Googleマップリンク */}
                  {item.mapUrl && (
                    <a
                      href={item.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold px-2.5 py-1.5 rounded-xl shrink-0 flex items-center gap-1 border border-blue-100 transition"
                    >
                      <MapPin className="w-3.5 h-3.5" /> 地図
                    </a>
                  )}
                </div>

                {/* 詳細メモ */}
                {item.note && (
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {item.note}
                  </p>
                )}

                {/* 添付メディア・資料ボタン */}
                {mediaUrls.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-2">
                    {mediaUrls.map((url, mIdx) => {
                      const isImg = isImageUrl(url);
                      return (
                        <button
                          key={mIdx}
                          onClick={() => {
                            const formattedList = mediaUrls.map(u => ({
                              rawUrl: u,
                              isImage: isImageUrl(u),
                              directUrl: getDirectImageUrl(u),
                              previewUrl: getDrivePreviewUrl(u)
                            }));
                            setActiveMediaList(formattedList);
                            setCurrentSlideIdx(mIdx);
                            setMediaModalOpen(true);
                          }}
                          className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-200/60 flex items-center gap-1.5 transition active:scale-95"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isImg ? `資料画像 ${mIdx + 1}` : `添付ファイル ${mIdx + 1}`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}