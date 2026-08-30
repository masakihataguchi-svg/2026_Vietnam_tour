import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Lock } from 'lucide-react';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ScheduleTab from './components/ScheduleTab';
import CameraTab from './components/CameraTab';
import AlbumTab from './components/AlbumTab';
import TranslateTab from './components/TranslateTab';
import LocationTab from './components/LocationTab';
import GeminiChatTab from './components/GeminiChatTab';
import MediaModal from './components/MediaModal';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzEUO44oHMKAdS_qUNv7SfP_0DRQiYBRhDaQbtvbG-mXPbRtKQmfyMS9ui9bIHGr54CQg/exec'; 

const ALBUM_FOLDERS = {
  '8/29': '1yWtff6IqLn9tuaxGmDuYcIxRTjD_Zw5x',
  '8/30': '10g4Xldzoa2GEgHCfKFHYsQBnnOQ4yq3J',
  '8/31': '1sEzuJpfJWy-NI6I8pzxSTlGCcx_K3OGD',
  '9/1':  '1i1FAkh1IijJn5MTqP0h_E74pfHPUN94t'
};

const getExifDate = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const view = new DataView(buffer);
        if (view.getUint16(0, false) !== 0xffd8) return resolve(null);
        let offset = 2;
        const length = buffer.byteLength;
        while (offset < length) {
          const marker = view.getUint16(offset, false);
          if (marker === 0xffe1) {
            if (view.getUint32(offset + 4, false) === 0x45786966) {
              const littleEndian = view.getUint16(offset + 10, false) === 0x4949;
              const ifdOffset = view.getUint32(offset + 14, littleEndian) + offset + 10;
              const tags = view.getUint16(ifdOffset, littleEndian);
              for (let i = 0; i < tags; i++) {
                const tagOffset = ifdOffset + 2 + i * 12;
                const tag = view.getUint16(tagOffset, littleEndian);
                if (tag === 0x9003 || tag === 0x0132) {
                  const valueOffset = view.getUint32(tagOffset + 8, littleEndian) + offset + 10;
                  let dateStr = '';
                  for (let j = 0; j < 19; j++) {
                    dateStr += String.fromCharCode(view.getUint8(valueOffset + j));
                  }
                  return resolve(dateStr);
                }
              }
            }
          } else if ((marker & 0xff00) !== 0xff00) {
            break;
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }
        resolve(null);
      } catch (err) {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024));
  });
};

const formatFileName = (exifStr, fileLastModified) => {
  if (exifStr && typeof exifStr === 'string' && exifStr.length >= 19) {
    const parts = exifStr.trim().split(' ');
    if (parts.length === 2) {
      const datePart = parts[0].replace(/:/g, '');
      const timePart = parts[1].replace(/:/g, '');
      return `${datePart}_${timePart}.jpg`;
    }
  }
  const d = new Date(fileLastModified || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`;
};

const getDriveId = (urlOrId) => {
  if (!urlOrId) return '';
  const match = urlOrId.match(/\/d\/([^\/]+)/) || urlOrId.match(/id=([^&]+)/);
  return match && match[1] ? match[1] : urlOrId;
};

const getDirectImageUrl = (urlOrId) => {
  const id = getDriveId(urlOrId);
  if (!id) return urlOrId;
  return `https://lh3.googleusercontent.com/d/${id}`;
};

const getDrivePreviewUrl = (urlOrId) => {
  const id = getDriveId(urlOrId);
  if (!id) return urlOrId;
  if (urlOrId.includes('drive.google.com')) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }
  return urlOrId;
};

const isImageUrl = (urlOrId) => {
  const url = String(urlOrId).toLowerCase();
  return url.includes('drive.google.com') || /\.(jpg|jpeg|png|gif|webp|heic)(\?.*)?$/i.test(url);
};

export default function App() {
  const [pass, setPass] = useState(localStorage.getItem('vietnam_app_pass') || '');
  const [inputUser, setInputUser] = useState(localStorage.getItem('vietnam_app_user') || 'family');
  const [inputPass, setInputPass] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [activeNavTab, setActiveNavTab] = useState('home');
  const [currentDate, setCurrentDate] = useState('8/29');
  const [scheduleData, setScheduleData] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Gemini チャット・位置ログステート
  const [chatHistory, setChatHistory] = useState([]);
  const [locationHistory, setLocationHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef(null);

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
        localStorage.setItem('vietnam_app_user', inputUser);
        setPass(targetPass);
        setIsAuthenticated(true);
        setScheduleData(data.data || []);
        if (data.chatHistory) setChatHistory(data.chatHistory);
        if (data.locationHistory) setLocationHistory(data.locationHistory);
        fetchPhotos(targetPass, currentDate);
      } else {
        handleAuthError();
      }
    } catch (err) {
      console.error(err);
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

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setPass('');
  };

  const fetchPhotos = async (targetPass, dateKey) => {
    const folderId = ALBUM_FOLDERS[dateKey];
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          pass: targetPass, 
          action: 'getPhotos', 
          albumName: `${dateKey}_アルバム`,
          folderId: folderId
        })
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
    fetchPhotos(pass, dateKey);
  };

  // 写真・動画の一括アップロード処理
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setUploadProgress(`アップロード中 (${i + 1}/${total}件目)...`);

      try {
        const isVideo = file.type.startsWith('video/');
        
        let fileName = '';
        if (!isVideo && (file.type === 'image/jpeg' || file.type === 'image/jpg')) {
          const exifDateStr = await getExifDate(file);
          fileName = formatFileName(exifDateStr, file.lastModified);
        } else {
          const ext = isVideo ? (file.name.split('.').pop() || 'mp4') : 'jpg';
          const d = new Date(file.lastModified || Date.now());
          const pad = (n) => String(n).padStart(2, '0');
          fileName = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${i}.${ext}`;
        }

        const folderId = ALBUM_FOLDERS[currentDate];

        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64Data = event.target.result;
            try {
              const res = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify({
                  pass,
                  action: 'uploadPhoto',
                  base64Data,
                  albumName: `${currentDate}_アルバム`,
                  folderId: folderId,
                  mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
                  fileName: fileName
                })
              });
              const data = await res.json();
              if (data.status === 'success') {
                resolve();
              } else {
                reject(data.message);
              }
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

      } catch (err) {
        console.error(err);
        alert(`「${file.name}」の保存に失敗しました`);
      }
    }

    setUploading(false);
    setUploadProgress('');
    fetchPhotos(pass, currentDate);
    alert(`${total}件のメディアを保存しました！`);
  };

  const handleDeletePhoto = (photoItem) => {
    const rawUrl = photoItem.rawUrl || photoItem.url || photoItem.id || '';
    const fileId = getDriveId(rawUrl);
    if (!fileId) return;

    if (window.confirm('このファイルをGoogleドライブのゴミ箱へ移動しますか？')) {
      setUploading(true);
      fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          pass,
          action: 'deletePhoto',
          fileId: fileId
        })
      })
        .then((res) => res.json())
        .then((res) => {
          setUploading(false);
          if (res.status === 'success') {
            setMediaModalOpen(false);
            fetchPhotos(pass, currentDate);
            alert('ゴミ箱へ移動しました');
          } else {
            alert('削除に失敗しました');
          }
        })
        .catch(() => {
          setUploading(false);
          alert('通信エラーが発生しました');
        });
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatSending(true);

    const tempHistory = [
      ...chatHistory,
      { user: inputUser, role: 'user', text: userMsg, timestamp: '送信中...' }
    ];
    setChatHistory(tempHistory);

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          pass,
          action: 'sendGemini',
          userName: inputUser,
          message: userMsg
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.chatHistory) {
        setChatHistory(data.chatHistory);
      }
    } catch (err) {
      alert('Geminiへの送信に失敗しました');
    } finally {
      setChatSending(false);
    }
  };

  const sortedPhotos = [...photos].sort((a, b) => {
    const nameA = a.name || a.title || a.url || '';
    const nameB = b.name || b.title || b.url || '';
    return nameA.localeCompare(nameB);
  });

  const filteredSchedule = scheduleData.filter((item) => {
    if (!item || item.date === undefined) return false;
    const dateStr = String(item.date);
    const m1 = currentDate;
    const m2 = currentDate.padStart(5, '0');
    return dateStr.includes(m1) || dateStr.includes(m2);
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="text-5xl">🇻🇳</div>
          <h1 className="text-xl font-bold text-slate-800">ベトナム2026</h1>
          <p className="text-xs text-slate-500">ユーザー名とパスワードを入力してログインしてください</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
              <input
                type="text"
                placeholder="ユーザー名 (例: お父さん)"
                value={inputUser}
                onChange={(e) => setInputUser(e.target.value)}
                className="w-full bg-slate-100 border text-center font-bold text-base rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
              <input
                type="password"
                placeholder="パスワード"
                value={inputPass}
                onChange={(e) => setInputPass(e.target.value)}
                className="w-full bg-slate-100 border text-center font-bold text-base rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
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
        </div>
      </div>
    );
  }

  const showDateNav = ['home', 'camera', 'album'].includes(activeNavTab);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      <Header uploading={uploading} onLogout={handleLogout} />

      {showDateNav && (
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
      )}

      <main className="p-4 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeNavTab === 'home' && (
            <ScheduleTab
              currentDate={currentDate}
              filteredSchedule={filteredSchedule}
              isImageUrl={isImageUrl}
              getDirectImageUrl={getDirectImageUrl}
              getDrivePreviewUrl={getDrivePreviewUrl}
              setActiveMediaList={setActiveMediaList}
              setCurrentSlideIdx={setCurrentSlideIdx}
              setMediaModalOpen={setMediaModalOpen}
            />
          )}

          {activeNavTab === 'camera' && (
            <CameraTab
              currentDate={currentDate}
              onPhotoUpload={handlePhotoUpload}
              uploading={uploading}
              uploadProgress={uploadProgress}
            />
          )}

          {activeNavTab === 'album' && (
            <AlbumTab
              currentDate={currentDate}
              sortedPhotos={sortedPhotos}
              onFetchPhotos={() => fetchPhotos(pass, currentDate)}
              getDirectImageUrl={getDirectImageUrl}
              getDrivePreviewUrl={getDrivePreviewUrl}
              setActiveNavTab={setActiveNavTab}
              setActiveMediaList={setActiveMediaList}
              setCurrentSlideIdx={setCurrentSlideIdx}
              setMediaModalOpen={setMediaModalOpen}
            />
          )}

          {activeNavTab === 'translate' && (
            <TranslateTab gasUrl={GAS_URL} pass={pass} />
          )}

          {activeNavTab === 'location' && (
            <LocationTab gasUrl={GAS_URL} pass={pass} userName={inputUser} />
          )}

          {activeNavTab === 'gemini' && (
            <GeminiChatTab
              chatHistory={chatHistory}
              chatInput={chatInput}
              setChatInput={setChatInput}
              chatSending={chatSending}
              onSendChat={handleSendChat}
              onRefresh={() => verifyAndFetch(pass)}
              chatBottomRef={chatBottomRef}
            />
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeNavTab={activeNavTab} setActiveNavTab={setActiveNavTab} />

      <MediaModal
        mediaModalOpen={mediaModalOpen}
        setMediaModalOpen={setMediaModalOpen}
        activeMediaList={activeMediaList}
        currentSlideIdx={currentSlideIdx}
        setCurrentSlideIdx={setCurrentSlideIdx}
        onDeletePhoto={handleDeletePhoto}
      />
    </div>
  );
}