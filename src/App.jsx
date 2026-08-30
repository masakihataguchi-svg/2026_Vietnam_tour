// handlePhotoUpload 関数の修正部分 (App.jsx 内)

const [uploadProgress, setUploadProgress] = useState('');

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
      
      // 写真（JPEG）のみEXIFから撮影日時を取得、動画はファイル更新日時
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

      // Base64化してGASへ送信
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