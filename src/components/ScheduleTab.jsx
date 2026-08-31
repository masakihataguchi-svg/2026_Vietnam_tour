import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, FileText, ExternalLink } from 'lucide-react';

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
      className="space-y-3"
    >
      <div className="flex justify-between items-center border-b pb-2 mb-3">
        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600"/> スケジュール ({currentDate})
        </h2>
        <span className="text-xs text-slate-400 font-bold">{filteredSchedule.length}件の予定</span>
      </div>

      {filteredSchedule.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-10 bg-white rounded-2xl border border-slate-100">
          この日のスケジュールは未登録です
        </p>
      ) : (
        filteredSchedule.map((item, idx) => {
          // スプレッドシートの「ボタンタイプ」および「URL列」からボタン要素を動的に復元
          const buttonsToRender = (() => {
            if (Array.isArray(item.buttons) && item.buttons.length > 0) {
              return item.buttons;
            }

            const result = [];
            const btnTypeStr = (item.btnType || item.btnLabel || '').trim();
            let urls = Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0
              ? item.mediaUrls
              : (item.btnUrl ? [item.btnUrl] : []);

            if (btnTypeStr && urls.length > 0) {
              const labels = btnTypeStr.split(/[,、]/).map(s => s.trim()).filter(Boolean);
              if (labels.length > 1 && labels.length === urls.length) {
                labels.forEach((lbl, i) => {
                  const u = urls[i];
                  const isModal = /画像|PDF|資料|写真|ファイル|ドライブ|予約票|座席図|チケット|搭乗券/i.test(lbl) || (u && u.includes('drive.google.com'));
                  result.push({
                    label: lbl,
                    type: isModal ? 'modal' : 'web',
                    urls: [u],
                    url: u
                  });
                });
              } else {
                const isModal = /画像|PDF|資料|写真|ファイル|ドライブ|予約票|座席図|チケット|搭乗券/i.test(btnTypeStr) || urls.some(u => u && u.includes('drive.google.com')) || urls.length > 1;
                result.push({
                  label: btnTypeStr,
                  type: isModal ? 'modal' : 'web',
                  urls: urls,
                  url: urls[0]
                });
              }
            } else if (urls.length > 0) {
              const isModal = urls.some(u => u && u.includes('drive.google.com'));
              result.push({
                label: isModal ? '添付資料' : '関連リンク',
                type: isModal ? 'modal' : 'web',
                urls: urls,
                url: urls[0]
              });
            }

            if (item.mapUrl && !result.some(b => b.url === item.mapUrl || (b.urls && b.urls.includes(item.mapUrl)))) {
              result.unshift({
                label: 'Googleマップ',
                type: 'web',
                urls: [item.mapUrl],
                url: item.mapUrl
              });
            }

            return result;
          })();

          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.01 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                    {item.city ? `${item.city}・` : ''}{item.time || '時間未定'}
                  </span>
                  <h3 className="font-bold text-slate-800 text-base break-words">{item.spot || item.title || '予定'}</h3>
                </div>

                {/* ボタン描画エリア（Googleマップ、公式HP、予約票モーダルなど） */}
                {buttonsToRender.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end shrink-0 max-w-[55%]">
                    {buttonsToRender.map((btn, bIdx) => {
                      const isModal = btn.type === 'modal';
                      const isMap = /マップ|地図|ルート/i.test(btn.label) || (btn.url && btn.url.includes('maps'));
                      const displayBtnText = btn.urls && btn.urls.length > 1 ? `${btn.label} (${btn.urls.length})` : btn.label;

                      return isModal ? (
                        <button
                          key={bIdx}
                          onClick={() => {
                            const formattedList = (btn.urls || [btn.url]).map((u) => ({
                              rawUrl: u,
                              isImage: isImageUrl(u),
                              directUrl: getDirectImageUrl(u),
                              previewUrl: getDrivePreviewUrl(u)
                            }));
                            setActiveMediaList(formattedList);
                            setCurrentSlideIdx(0);
                            setMediaModalOpen(true);
                          }}
                          className="bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shrink-0 shadow-sm transition active:scale-95"
                        >
                          <FileText className="w-3.5 h-3.5"/> {displayBtnText}
                        </button>
                      ) : (
                        <a
                          key={bIdx}
                          href={btn.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`text-xs px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shrink-0 shadow-sm transition active:scale-95 ${
                            isMap
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {isMap ? <MapPin className="w-3.5 h-3.5"/> : <ExternalLink className="w-3.5 h-3.5"/>}
                          {displayBtnText}
                        </a>
                      );
                    })}
                  </div>
                )}
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
  );
}