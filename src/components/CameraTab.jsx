import React from 'react';
import { motion } from 'framer-motion';
import { Camera, FolderOpen } from 'lucide-react';

export default function CameraTab({ currentDate, onPhotoUpload, uploading, uploadProgress }) {
  return (
    <motion.div
      key="camera"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 text-center py-6"
    >
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <Camera className="w-8 h-8"/>
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-lg">旅の思い出を追加</h2>
          <p className="text-xs text-slate-400 mt-1">
            保存先フォルダ: <span className="font-bold text-emerald-600">{currentDate} アルバム</span>
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {/* カメラ直接起動（写真/動画） */}
          <label className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center py-3.5 rounded-2xl font-bold text-sm shadow-md cursor-pointer transition active:scale-95 flex items-center justify-center gap-2">
            <Camera className="w-5 h-5"/> 📸 カメラを起動して撮影
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={onPhotoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {/* ライブラリから複数選択（写真/動画） */}
          <label className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-center py-3.5 rounded-2xl font-bold text-sm shadow-sm border border-slate-200 cursor-pointer transition active:scale-95 flex items-center justify-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-600"/> 🖼️ ライブラリから一括選択
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={onPhotoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {uploading && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl space-y-1">
            <p className="text-xs text-emerald-700 font-bold animate-pulse">
              {uploadProgress || 'Google Driveへ送信中...'}
            </p>
            <p className="text-[10px] text-emerald-600">※動画や複数枚の場合は少し時間がかかります</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}