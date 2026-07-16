// スケジュールデータを格納する変数
let scheduleData = [];
let displayIndex = 0;
let isAutoMode = true;
let watchId = null;
let map = null;      
let marker = null;   
let notifiedList = JSON.parse(localStorage.getItem('notifiedList')) || [];
let wakeLock = null;

// バナーヒルズ インタラクティブマップオブジェクト用変数
let banaMap = null;

// --- 機能0: データ読み込み (スケジュール) ---
async function loadSchedule() {
    console.log("★最新版JS読み込み成功: ベトナム対応・バナーヒルズマップ統合版★");
    try {
        const configResp = await fetch("config.json?t=" + new Date().getTime());
        if (!configResp.ok) throw new Error("config.jsonが見つかりません");
        
        const config = await configResp.json();
        const sheetUrl = config.sheetUrl;

        const csvResp = await fetch(sheetUrl + "&t=" + new Date().getTime());
        if (!csvResp.ok) throw new Error(`CSV読込エラー: ${csvResp.status}`);
        
        const text = await csvResp.text();
        
        const rows = parseCSV(text);
        
        scheduleData = rows.map(columns => {
            if (columns.length < 2) return null;

            let tIdx = 0;
            if (columns[2] && columns[2].indexOf('2026') > -1) {
                tIdx = 2; 
            } else {
                tIdx = columns.findIndex(col => col && col.indexOf('2026') > -1);
            }
            if (tIdx === -1) return null;

            let modeRaw = (tIdx >= 2 && columns[tIdx - 2]) ? columns[tIdx - 2].trim().toLowerCase() : "other";
            if(modeRaw === "") modeRaw = "other";
            const statusText = (tIdx >= 1 && columns[tIdx - 1]) ? columns[tIdx - 1].trim() : "";
            const time = columns[tIdx].trim();
            const title = columns[tIdx + 1] ? columns[tIdx + 1].trim() : "";
            const detail = columns[tIdx + 2] ? columns[tIdx + 2].trim() : "";
            
            const parseMulti = (descRaw, urlRaw) => {
                if (!urlRaw) return [];
                const regex = /\||\n/;
                const descs = descRaw ? descRaw.split(regex).map(s => s.trim()) : [];
                const urls = urlRaw ? urlRaw.split(regex).map(s => s.trim()) : [];
                const results = [];
                
                urls.forEach((url, i) => {
                    if(url.startsWith('http')) {
                        results.push({ url: url, desc: descs[i] || "" });
                    }
                });
                return results;
            };

            const webLinks = parseMulti(columns[tIdx + 3], columns[tIdx + 4]);
            const images   = parseMulti(columns[tIdx + 5], columns[tIdx + 6]);
            const notifyTime = columns[tIdx + 7] ? columns[tIdx + 7].trim() : "";
            const notifyMsg  = columns[tIdx + 8] ? columns[tIdx + 8].trim() : "";
            const memo       = columns[tIdx + 9] ? columns[tIdx + 9].trim() : "";

            return { time, title, detail, webLinks, images, mode: modeRaw, statusText, notifyTime, notifyMsg, memo };
        }).filter(item => item !== null);

        const now = new Date();
        const nextIdx = scheduleData.findIndex(item => new Date(item.time).getTime() > now.getTime());
        if (nextIdx !== -1) displayIndex = nextIdx;
        else displayIndex = scheduleData.length - 1;

        updateTimeKeeper();
        renderScheduleList(); 
        setupSwipe();
        checkNotificationPermission();

    } catch (error) {
        console.error("読込エラー:", error);
        document.getElementById('next-event').innerText = "読込エラー";
    }
}

function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                currentCell += '"'; 
                i++;
            } else {
                insideQuote = !insideQuote; 
            }
        } else if (char === ',' && !insideQuote) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++; 
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
    return rows;
}

// --- 機能0-2: データ読み込み (観光メモ・インタラクティブ版) ---
async function loadMemoLinks() {
    const memoSheetUrl = "https://docs.google.com/spreadsheets/d/1_AEKO4sGT5O-hGM8QrtPeytAcQabQb3dQ13oCbIiwbM/export?format=csv";
    
    try {
        const resp = await fetch(memoSheetUrl + "&t=" + new Date().getTime());
        if(!resp.ok) throw new Error("Memo Sheet Load Error");

        const text = await resp.text();
        const rows = parseCSV(text); 
        const container = document.getElementById('memo-list-container');
        container.innerHTML = "";

        let currentDayStr = "";

        rows.slice(1).forEach(cols => {
            if(cols.length < 3) return; 

            const dateStr = cols[0].trim();
            const content = cols[2].trim();
            let rawUrl = cols[3] ? cols[3].trim() : "";

            let extractedUrl = "";
            if (rawUrl.startsWith('http')) {
                extractedUrl = rawUrl;
            } else {
                const match = rawUrl.match(/https?:\/\/[^\s"'\)]+/);
                if (match) extractedUrl = match[0];
            }

            if (dateStr !== currentDayStr && dateStr !== "") {
                currentDayStr = dateStr;
                const dateHeader = document.createElement('h3');
                dateHeader.style.cssText = "margin: 25px 0 12px 5px; color: #1e4620; border-bottom: 2px solid #1e4620; display: inline-block; padding-bottom: 4px; font-size: 1.15em; font-weight: bold;";
                dateHeader.innerText = dateStr;
                container.appendChild(dateHeader);
            }

            const div = document.createElement('div');
            div.className = "info-block";
            div.style.background = "white";
            div.style.color = "#333";
            div.style.border = "1px solid #e2e8f0";
            div.style.borderRadius = "10px";
            div.style.padding = "15px";
            div.style.marginBottom = "12px";
            div.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
            
            let html = `<h4 style="margin:0 0 8px 0; font-size:1.05em; line-height:1.4; color:#2c3e50;">${content}</h4>`;
            
            if (extractedUrl) {
                if (extractedUrl.includes('google.com/maps') || extractedUrl.includes('maps.google')) {
                    html += `<a href="${extractedUrl}" target="_blank" class="event-link-btn" style="margin-top:10px; font-size:0.95em; padding:10px; background-color:#d96b43; color:white; border-radius:6px; text-align:center;">
                                📍 Googleマップで場所を確認
                             </a>`;
                } else {
                    html += `<a href="${extractedUrl}" target="_blank" class="event-link-btn" style="margin-top:10px; font-size:0.95em; padding:10px; background-color:#1e4620; color:white; border-radius:6px; text-align:center;">
                                🔗 おすすめ情報サイトを開く
                             </a>`;
                }
            }
            div.innerHTML = html;
            container.appendChild(div);
        });
    } catch (e) {
        console.error("メモ読み込み失敗", e);
        const container = document.getElementById('memo-list-container');
        container.innerHTML = `<p style="text-align:center; color:red;">読み込みエラー<br>(${e.message})</p>`;
    }
}

// --- 機能1: 日程表リスト ---
function renderScheduleList() {
    const container = document.querySelector('#schedule .timeline');
    if (!container || scheduleData.length === 0) return;
    container.innerHTML = '';
    let currentDayStr = "";
    const firstDateObj = new Date(scheduleData[0].time.split(' ')[0]);

    scheduleData.forEach((item, index) => {
        const datePart = item.time.split(' ')[0];
        const timePart = item.time.split(' ')[1] || "";

        if (datePart !== currentDayStr) {
            currentDayStr = datePart;
            const thisDateObj = new Date(datePart);
            const diffTime = Math.abs(thisDateObj - firstDateObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
            const formattedDate = `${thisDateObj.getMonth() + 1}/${thisDateObj.getDate()}`;
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.innerHTML = `<h3>Day ${diffDays} (${formattedDate})</h3><ul></ul>`;
            container.appendChild(dayCard);
        }

        const ul = container.lastElementChild.querySelector('ul');
        const li = document.createElement('li');
        
        let statusIcon = '<i class="fas fa-circle" style="font-size:0.5em; vertical-align:middle;"></i>';
        let iconColor = "#999"; 

        if (item.mode.includes('walking')) { statusIcon = '<i class="fas fa-walking"></i>'; iconColor = "#2ecc71"; }
        else if (item.mode.includes('driving')) { statusIcon = '<i class="fas fa-car"></i>'; iconColor = "#3498db"; }
        else if (item.mode.includes('railway')) { statusIcon = '<i class="fas fa-train"></i>'; iconColor = "#e74c3c"; }
        else if (item.mode.includes('plane')) { statusIcon = '<i class="fas fa-plane"></i>'; iconColor = "#9b59b6"; }
        else if (item.mode.includes('moving')) { statusIcon = '<i class="fas fa-bolt"></i>'; iconColor = "#ff4444"; }
        else if (item.mode.includes('transfer')) { statusIcon = '<i class="fas fa-exchange-alt"></i>'; iconColor = "#f39c12"; }
        else if (item.mode.includes('hotel')) { statusIcon = '<i class="fas fa-hotel"></i>'; iconColor = "#8e44ad"; }
        else if (item.mode.includes('restaurant')) { statusIcon = '<i class="fas fa-utensils"></i>'; iconColor = "#e67e22"; }
        else if (item.mode.includes('sight')) { statusIcon = '<i class="fas fa-camera"></i>'; iconColor = "#16a085"; }
        else if (item.mode.includes('stay')) { statusIcon = '<i class="fas fa-map-pin"></i>'; iconColor = "#16a085"; }
        else if (item.mode.includes('prep')) { statusIcon = '<i class="fas fa-clipboard-list"></i>'; iconColor = "#34495e"; }
        else if (item.mode.includes('departure')) { statusIcon = '<i class="fas fa-flag"></i>'; iconColor = "#1e4620"; }

        let linkIcon = "";
        if (item.webLinks.length > 0) linkIcon = ` <i class="fas fa-external-link-alt" style="color:#1e4620; margin-left:5px; font-size:0.8em;"></i>`;
        
        let calendarIcon = "";
        if (item.notifyTime) {
            const gCalLink = generateGoogleCalendarLink(item.title, item.time, item.detail);
            calendarIcon = ` <a href="${gCalLink}" target="_blank" style="color:#d96b43; margin-left:8px; font-size:0.9em;" onclick="event.stopPropagation();">
                                <i class="far fa-calendar-plus"></i>
                             </a>`;
        }

        li.innerHTML = `<span class="time">${timePart}</span> 
                        <span style="color:${iconColor}; width:20px; display:inline-block; text-align:center; margin-right:5px;">${statusIcon}</span>
                        ${item.title}${linkIcon}${calendarIcon}`;
        li.onclick = () => jumpToCard(index);
        li.style.cursor = "pointer";
        ul.appendChild(li);
    });
}

function generateGoogleCalendarLink(title, startTimeStr, detail) {
    const startDate = new Date(startTimeStr.replace(/\//g, '-'));
    if (isNaN(startDate.getTime())) return "#";
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatTime = (date) => {
        return date.getFullYear() +
            ('0' + (date.getMonth() + 1)).slice(-2) +
            ('0' + date.getDate()).slice(-2) + 'T' +
            ('0' + date.getHours()).slice(-2) +
            ('0' + date.getMinutes()).slice(-2) + '00';
    };
    const start = formatTime(startDate);
    const end = formatTime(endDate);
    const text = encodeURIComponent("【ベトナム旅】" + title);
    const details = encodeURIComponent(detail + "\n\nfrom VIETNAM TOUR App");
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
}

// --- 機能2: タイムキーパー ---
function updateTimeKeeper() {
    if (scheduleData.length === 0) return;
    const item = scheduleData[displayIndex];
    if (!item) return;
    const now = new Date();
    const eventTime = new Date(item.time);
    const diffMs = eventTime - now; 
    
    const upcomingIndex = scheduleData.findIndex(d => new Date(d.time).getTime() > now.getTime());

    const statusLabel = document.getElementById('status-label');
    const statusDesc = document.getElementById('status-description');
    const nextEventDisplay = document.getElementById('next-event');
    const nextDetailDisplay = document.getElementById('next-detail');
    const timeRemainingDisplay = document.getElementById('time-remaining');
    const cardCounter = document.getElementById('card-counter');
    const webContainer = document.getElementById('web-link-container');
    const imageContainer = document.getElementById('image-container');
    const mediaContent = document.getElementById('media-content');
    const speedSection = document.getElementById('speedometer-section');
    const memoContainer = document.getElementById('memo-btn-container');

    webContainer.style.display = "none";
    imageContainer.style.display = "none";
    memoContainer.style.display = "none";
    webContainer.innerHTML = ""; mediaContent.innerHTML = ""; memoContainer.innerHTML = "";
    speedSection.style.display = "none";

    if (diffMs < 0) {
        statusLabel.innerText = "FINISHED"; statusLabel.style.color = "#ccc";
    } else if (upcomingIndex !== -1 && displayIndex === upcomingIndex) {
        statusLabel.innerText = "CURRENT EVENT"; statusLabel.style.color = "white";
    } else {
        statusLabel.innerText = "FUTURE EVENT"; statusLabel.style.color = "#88ccff";
    }

    statusDesc.innerText = item.statusText || "";
    const timeString = item.time.split(' ')[1] || '';
    nextEventDisplay.innerHTML = `<span class="event-time">${timeString}</span><span class="event-title">${item.title}</span>`;
    nextDetailDisplay.innerText = item.detail || "";
    cardCounter.innerText = `${displayIndex + 1} / ${scheduleData.length}`;

    if (item.memo && item.memo !== "") {
        memoContainer.style.display = "block";
        const memoBtn = document.createElement('button');
        memoBtn.className = 'event-link-btn';
        memoBtn.style.width = "100%";
        memoBtn.style.textAlign = "center";
        memoBtn.style.marginTop = "10px";
        memoBtn.innerHTML = `<i class="fas fa-sticky-note"></i> メモを見る`;
        memoBtn.onclick = () => openMemoModal(item.memo);
        memoContainer.appendChild(memoBtn);
    }

    const movingModes = ['moving', 'walking', 'driving', 'railway', 'plane'];
    const isMoving = movingModes.some(m => item.mode.includes(m));

    if (isMoving) {
        speedSection.style.display = "block";
        renderWebLinks(item, webContainer, "経路・マップ");
        renderImages(item, imageContainer, mediaContent, "観光ガイド・車窓");
    } else {
        if (watchId !== null) stopGPS();
        let defaultWebLabel = "Webサイトを開く";
        let defaultImgLabel = "画像情報";
        if (item.mode.includes('transfer')) { defaultWebLabel = "構内図・地図を見る"; defaultImgLabel = "座席表 / 時刻表"; }
        else if (item.mode.includes('hotel')) { defaultWebLabel = "ホテル公式サイト"; defaultImgLabel = "施設案内 / 部屋"; }
        else if (item.mode.includes('restaurant')) { defaultWebLabel = "お店情報 / メニュー"; defaultImgLabel = "料理写真 / 内観"; }
        else if (item.mode.includes('sight')) { defaultWebLabel = "観光情報を見る"; defaultImgLabel = "見どころ / 景色"; }
        else if (item.mode.includes('prep')) { defaultWebLabel = "天気・情報を確認"; defaultImgLabel = "持ち物 / 朝食情報"; }
        
        renderWebLinks(item, webContainer, defaultWebLabel);
        renderImages(item, imageContainer, mediaContent, defaultImgLabel);
    }

    const absDiffMs = Math.abs(diffMs);
    const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
    const diffHrs = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    let timeText = diffDays > 0 ? `${diffDays}日 ${diffHrs}時間` : diffHrs > 0 ? `${diffHrs}時間 ${diffMins}分` : `${diffMins}分`;
    if (diffMs < 0) {
        timeRemainingDisplay.innerText = `${timeText} 前`; timeRemainingDisplay.style.color = "#ccc";
    } else {
        timeRemainingDisplay.innerText = `あと ${timeText}`;
        timeRemainingDisplay.style.color = (diffMs < 1000 * 60 * 30 && diffDays === 0 && diffHrs === 0) ? "#ff4444" : "#ffd700";
    }
    
    document.querySelector('.left-arrow').style.display = (displayIndex === 0) ? 'none' : 'block';
    document.querySelector('.right-arrow').style.display = (displayIndex === scheduleData.length - 1) ? 'none' : 'block';
}

function renderWebLinks(item, container, defaultLabel) {
    if (item.webLinks && item.webLinks.length > 0) {
        container.style.display = "block";
        item.webLinks.forEach(link => {
            const btn = document.createElement('a');
            btn.className = 'event-link-btn'; btn.href = link.url; btn.target = "_blank"; btn.style.marginTop = "10px"; 
            const btnText = link.desc || defaultLabel;
            btn.innerHTML = `<i class="fas fa-external-link-alt"></i> ${btnText}`;
            container.appendChild(btn);
        });
    }
}

function renderImages(item, container, contentArea, defaultLabel) {
    if (item.images && item.images.length > 0) {
        container.style.display = "block";
        const descElem = document.getElementById('image-desc');
        if(descElem) descElem.style.display = 'none';

        item.images.forEach(img => {
            const driveMatch = img.url.match(/\/d\/(.+?)\//);
            let imgSrc = img.url;
            if (driveMatch) imgSrc = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=s4000`;
            
            const imgTag = document.createElement('img');
            imgTag.src = imgSrc; imgTag.className = 'event-image'; imgTag.alt = img.desc || "Event Image"; 
            imgTag.onclick = () => openModal(imgSrc, img.desc || defaultLabel);
            
            contentArea.appendChild(imgTag);

            if (img.desc) {
                const caption = document.createElement('p');
                caption.className = 'image-caption';
                caption.innerText = img.desc;
                contentArea.appendChild(caption);
            }
        });
    }
}

function openMemoModal(text) {
    document.getElementById('memo-text').innerText = text;
    document.getElementById('memo-modal').style.display = 'block';
}
function closeMemoModal() {
    document.getElementById('memo-modal').style.display = 'none';
}

// --- 通貨計算ツールロジック ---
function convertCurrency(type) {
    const rate = 0.006; 
    const vndInput = document.getElementById('vnd-input');
    const jpyInput = document.getElementById('jpy-input');
    
    if (!vndInput || !jpyInput) return;
    
    if (type === 'vnd') {
        const vnd = vndInput.value;
        jpyInput.value = vnd ? Math.round(vnd * rate) : '';
    } else {
        const jpy = jpyInput.value;
        vndInput.value = jpy ? Math.round(jpy / rate) : '';
    }
}

// --- 音声読み上げロジック ---
function speakVietnamese(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);
    } else {
        alert('お使いのブラウザは音声読み上げに対応していません。');
    }
}

// --- バナーヒルズ インタラクティブマップ機能 ---
function openBanaMap() {
    // 園内マップモーダルを起動
    document.getElementById('bana-map-modal').style.display = 'block';
    
    if (banaMap === null) {
        // LeafletをSimple CRSモードで初期化 (ピクセル座標系)
        banaMap = L.map('bana-leaflet-map', {
            crs: L.CRS.Simple,
            minZoom: -1,
            maxZoom: 2,
            zoomSnap: 0.5,
            bounceAtZoomLimits: false,
            attributionControl: false
        });

        // 仮想境界線の設定 [Y座標, X座標] (元のアスペクト比に適合)
        const bounds = [[0, 0], [1000, 1500]];
        
        // アップロード済みのマップ画像を背景に貼り付け
        const imageUrl = 'Flyer_SW_BaNa_Eng_6.2025-02_iq1ato.jpg';
        L.imageOverlay(imageUrl, bounds).addTo(banaMap);
        banaMap.fitBounds(bounds);

        // 主な見どころ・ランドマークの位置情報を設定
        const landmarks = [
            {
                coords: [420, 430], // B2エリア
                title: "⑧ Cầu Vàng (ゴールデンブリッジ)",
                desc: "大人気の「神の手」ブリッジ。早朝か夕方の霧のタイミングを狙うと非常に神秘的です。"
            },
            {
                coords: [280, 700], // スライダー周辺
                title: "③ Máng trượt (アルパインコースター)",
                desc: "自分でブレーキを操作して滑り降りる大人気マウンテンボブスレー。待ち時間が長くなりやすいため最優先推奨！"
            },
            {
                coords: [780, 240], // B1：ルナキャッスル
                title: "① Lâu đài Mặt Trăng (ルナ・キャッスル)",
                desc: "Moon Kingdomの美しいシンボル城。大迫力の4D/5D体感型アトラクションシアターがあります。"
            },
            {
                coords: [750, 850], // A：フランス村・ファンタジーパーク
                title: "② Fantasy Park (屋内テーマパーク)",
                desc: "フランス村の地下に広がる3階建ての超巨大屋内テーマパーク。ほぼすべての乗り物やフリープレイ筐体が無料！"
            }
        ];

        // ランドマークをピンとして配置
        landmarks.forEach(point => {
            const customIcon = L.divIcon({
                className: 'bana-custom-marker',
                html: `<div style="
                    background: #d96b43; 
                    color: white; 
                    border-radius: 50%; 
                    width: 26px; 
                    height: 26px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    font-size: 14px;
                    border: 2px solid white; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                ">!</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            L.marker(point.coords, { icon: customIcon })
                .addTo(banaMap)
                .bindPopup(`
                    <div style="color:#2c3e50; font-family:sans-serif; min-width:180px;">
                        <h4 style="margin:0 0 6px 0; color:#1e4620; font-size:14px; border-bottom:1px solid #eee; padding-bottom:4px;">${point.title}</h4>
                        <p style="margin:0; font-size:12px; line-height:1.5;">${point.desc}</p>
                    </div>
                `);
        });

        // 開発・追加調査用の座標ファインダー
        banaMap.on('click', function(e) {
            console.log("Clicked Coordinates [Y, X]:", [Math.round(e.latlng.lat), Math.round(e.latlng.lng)]);
        });

    } else {
        // 表示ズレ防止のコンテナリサイズ
        setTimeout(() => {
            banaMap.invalidateSize();
        }, 150);
    }
}

function closeBanaMap() {
    document.getElementById('bana-map-modal').style.display = 'none';
}

// --- 共通 ---
function checkAndNotify() {
    if (Notification.permission !== "granted") { console.log("🔔 通知チェック: 権限なし"); return; }
    const now = new Date();
    scheduleData.forEach(item => {
        if (!item.notifyTime || !item.notifyMsg) return;
        let targetTime = new Date(item.notifyTime);
        if (isNaN(targetTime.getTime())) targetTime = new Date(item.notifyTime.replace(/\//g, '-'));
        if (isNaN(targetTime.getTime())) return;
        const diff = now.getTime() - targetTime.getTime();
        const notifyKey = item.notifyTime + "_" + item.notifyMsg;
        if (diff >= 0 && diff < 1800000) {
            if (!notifiedList.includes(notifyKey)) {
                console.log("🚀 通知実行:", item.notifyMsg);
                new Notification("VIETNAM TOUR 2026", { body: item.notifyMsg, icon: "https://img.icons8.com/color/512/vietnam-emulator.png", tag: notifyKey });
                notifiedList.push(notifyKey); localStorage.setItem('notifiedList', JSON.stringify(notifiedList));
            }
        }
    });
}
function requestNotificationPermission() {
    if (!("Notification" in window)) { alert("非対応ブラウザです"); return; }
    if (Notification.permission === "granted") { alert("通知は既に許可されています"); checkNotificationPermission(); return; }
    if (Notification.permission === "denied") { alert("通知がブロックされています。設定から許可してください"); return; }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") { checkNotificationPermission(); new Notification("設定完了", { body: "通知がONになりました！" }); }
    });
}
function checkNotificationPermission() {
    const statusText = document.getElementById('notify-status');
    const btn = document.getElementById('notify-btn');
    if (!statusText || !btn) return;
    if (!("Notification" in window)) { statusText.innerText = "通知機能: 非対応"; btn.disabled = true; return; }
    if (Notification.permission === "granted") {
        statusText.innerText = "通知設定: 許可済み (OK)"; statusText.style.color = "#88ff88";
        btn.innerHTML = '<i class="fas fa-bell"></i> 設定済み'; btn.style.opacity = "0.5";
    } else if (Notification.permission === "denied") {
        statusText.innerText = "通知設定: ブロックされています"; statusText.style.color = "#ff8888";
    } else { statusText.innerText = "通知設定: 未設定"; }
}
async function toggleWakeLock() {
    const btn = document.getElementById('wakelock-btn');
    if ('wakeLock' in navigator) {
        if (wakeLock === null) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                btn.innerHTML = '<i class="fas fa-lightbulb"></i> 常時表示: ON';
                btn.style.background = "#d96b43"; btn.style.fontWeight = "bold";
                wakeLock.addEventListener('release', () => {});
            } catch (err) { alert("常時表示機能のエラー: " + err.message); }
        } else {
            wakeLock.release(); wakeLock = null;
            btn.innerHTML = '<i class="fas fa-lightbulb"></i> 常時表示: OFF'; btn.style.background = "#7f8c8d";
        }
    } else { alert("お使いのブラウザは常時表示に対応していません。"); }
}
function toggleGPS() { if (watchId === null) startGPS(); else stopGPS(); }
function startGPS() {
    if (!navigator.geolocation) { alert("GPS非対応です"); return; }
    const btn = document.getElementById('gps-btn'); const display = document.getElementById('speed-display'); const status = document.getElementById('gps-status'); const mapContainer = document.getElementById('live-map-container');
    btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-stop"></i> 計測停止 (地図OFF)'; display.style.display = 'block'; status.innerText = "GPS信号を探しています...";
    mapContainer.style.display = 'block';
    
    const hanoiLat = 21.0285;
    const hanoiLng = 105.8521;
    
    if (map === null) {
        map = L.map('live-map').setView([hanoiLat, hanoiLng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        marker = L.marker([hanoiLat, hanoiLng]).addTo(map);
    }
    setTimeout(() => { map.invalidateSize(); }, 100);
    watchId = navigator.geolocation.watchPosition((pos) => {
            const speedKmh = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(0) : 0;
            document.getElementById('current-speed').innerText = speedKmh;
            status.innerText = `精度: ±${Math.round(pos.coords.accuracy)}m`;
            const lat = pos.coords.latitude; const lng = pos.coords.longitude;
            const newLatLng = new L.LatLng(lat, lng);
            marker.setLatLng(newLatLng); map.setView(newLatLng);
        }, (err) => { console.error(err); status.innerText = "GPS取得失敗"; }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}
function stopGPS() {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    const btn = document.getElementById('gps-btn'); const display = document.getElementById('speed-display'); const mapContainer = document.getElementById('live-map-container');
    if(btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="fas fa-tachometer-alt"></i> 速度計測＆マップ表示'; }
    if(display) { display.style.display = 'none'; }
    if(mapContainer) mapContainer.style.display = 'none';
}
function changeCard(dir) {
    const newIndex = displayIndex + dir;
    if (newIndex >= 0 && newIndex < scheduleData.length) {
        displayIndex = newIndex; isAutoMode = false;
        const swipeArea = document.getElementById('swipe-area');
        swipeArea.classList.remove('fade-in'); void swipeArea.offsetWidth; swipeArea.classList.add('fade-in');
        updateTimeKeeper();
    }
}
function jumpToCard(index) { displayIndex = index; isAutoMode = false; switchTab('home'); updateTimeKeeper(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function setupSwipe() {
    const swipeArea = document.getElementById('time-keeper'); let startX = 0; let endX = 0; let startY = 0; let endY = 0;
    swipeArea.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    swipeArea.addEventListener('touchmove', (e) => { endX = e.touches[0].clientX; endY = e.touches[0].clientY; }, { passive: true });
    swipeArea.addEventListener('touchend', () => { 
        if (startX === 0 || endX === 0) return; 
        const diffX = startX - endX; const diffY = startY - endY;
        if (Math.abs(diffY) > Math.abs(diffX)) { startX = 0; endX = 0; startY = 0; endY = 0; return; }
        if (diffX > 50) changeCard(1); else if (diffX < -50) changeCard(-1); 
        startX = 0; endX = 0; startY = 0; endY = 0;
    });
}
function openModal(src, caption) { const modal = document.getElementById("image-modal"); document.getElementById("modal-img").src = src; document.getElementById("caption").innerText = caption || ""; modal.style.display = "block"; document.getElementById("modal-img").classList.remove("zoomed"); }
function closeModal() { document.getElementById("image-modal").style.display = "none"; }
document.getElementById("modal-img").addEventListener('click', function(e) { e.stopPropagation(); this.classList.toggle("zoomed"); });

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadSchedule();
    loadMemoLinks();
    setInterval(() => {
        if (isAutoMode) { const now = new Date(); const nextIdx = scheduleData.findIndex(item => new Date(item.time).getTime() > now.getTime()); if (nextIdx !== -1 && nextIdx !== displayIndex) displayIndex = nextIdx; }
        updateTimeKeeper(); checkAndNotify();
    }, 60000);
    document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible") {
            const now = new Date(); const nextIdx = scheduleData.findIndex(item => new Date(item.time).getTime() > now.getTime()); if (nextIdx !== -1) displayIndex = nextIdx;
            updateTimeKeeper(); checkAndNotify();
            if (wakeLock !== null) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} }
        }
    });
    setTimeout(checkAndNotify, 3000);
});
