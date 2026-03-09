/**
 * MUARTPLAYER - GENOCIDE EDITION (2026)
 * Özellikler: Reklam Savar, Kesin Döngü, Otomatik Tarama, Geçmiş Kaydı
 */

let player, isPlaylist = false, isScanning = false, playlistTitles = {};
let currentListId = "", skipDirection = 1, loopState = 0, isShuffled = false;
let loopCheckInterval;

// 1. YouTube API Hazırlığı
function onYouTubeIframeAPIReady() {
    player = new YT.Player('main-player', {
        height: '100%', 
        width: '100%',
        playerVars: { 
            'autoplay': 1, 
            'controls': 1, 
            'rel': 0, 
            'enablejsapi': 1,
            'origin': window.location.origin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady() {
    updateHistoryUI();
    startLoopTimer(); // Döngü motorunu başlat
}

// 2. REKLAM SAVAR VE DÖNGÜ MOTORU (Saniyelik Kontrol)
function startLoopTimer() {
    if (loopCheckInterval) clearInterval(loopCheckInterval);
    loopCheckInterval = setInterval(() => {
        if (!player || typeof player.getPlayerState !== "function") return;

        let state = player.getPlayerState();
        let videoData = player.getVideoData();

        // REKLAM TESPİTİ: Başlık yoksa veya "Advertisement" ise sesi kıs
        if (state === 1 && videoData) {
            if (videoData.title === "" || videoData.author === "" || videoData.title === "Advertisement") {
                player.mute();
                document.getElementById('status').innerText = "🛡️ Reklam Sessize Alındı...";
            } else {
                if (!isScanning) player.unMute();
            }
        }

        // TEKLİ DÖNGÜ GARANTİSİ: Şarkı bitmeden 1.2 sn önce yakala ve başa sar
        if (state === 1 && loopState === 2) {
            let now = player.getCurrentTime();
            let total = player.getDuration();
            if (total > 0 && (total - now) < 1.2) {
                player.seekTo(0);
                player.playVideo();
            }
        }
    }, 500);
}

// 3. HATA YÖNETİMİ (Engelli Videoları Atla)
function onPlayerError(e) {
    const errorMsg = "Video oynatılamıyor, atlanıyor...";
    document.getElementById('status').innerText = errorMsg;
    setTimeout(() => {
        skipDirection === 1 ? player.nextVideo() : player.previousVideo();
    }, 800);
}

// 4. MEDYA YÜKLEME (No-Cookie Modu Aktif)
function loadMedia() {
    const inp = document.getElementById('yt-link');
    const rawLink = inp.value.trim();
    if (!rawLink) return;

    // Reklam takibini zorlaştırmak için linki modifiye et
    const cleanLink = rawLink.replace("music.youtube.com", "www.youtube-nocookie.com")
                             .replace("www.youtube.com", "www.youtube-nocookie.com");
    
    const url = new URL(cleanLink);
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");
    
    isPlaylist = false; isScanning = false; playlistTitles = {}; skipDirection = 1;

    if (listId) {
        isPlaylist = true; 
        currentListId = listId;
        let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
        let finalTitle = "Liste: " + listId;
        let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
        let existing = history.find(i => i.link.includes(listId));
        
        if (existing) finalTitle = existing.title;
        else { 
            let ut = prompt("Playlist'e bir isim ver:", "Yeni Liste"); 
            if (ut) finalTitle = ut; 
        }
        
        player.loadPlaylist({ listType: 'playlist', list: listId, index: 0 });
        saveToHistory(rawLink, finalTitle); // Orijinal linki kaydet

        if (cache[listId]) {
            playlistTitles = cache[listId];
            setTimeout(updateQueueUI, 1000);
        } else { 
            isScanning = true; 
            player.mute(); 
            document.getElementById('status').innerText = "Liste taranıyor...";
        }
    } else if (videoId) {
        player.loadVideoById(videoId);
    }
    inp.value = "";
}

// 5. OYNATICI DURUM DEĞİŞİKLİĞİ
function onPlayerStateChange(e) {
    if (e.data == YT.PlayerState.PLAYING) {
        let vd = player.getVideoData();
        if (vd && vd.title !== "") {
            playlistTitles[vd.video_id] = vd.title;
            updateQueueUI();
            
            if (isScanning) {
                const idx = player.getPlaylistIndex();
                const len = player.getPlaylist().length;
                if (idx < len - 1) {
                    setTimeout(() => player.nextVideo(), 800);
                } else {
                    let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
                    cache[currentListId] = playlistTitles;
                    localStorage.setItem('muartCache', JSON.stringify(cache));
                    isScanning = false; 
                    player.unMute(); 
                    player.playVideoAt(0);
                    document.getElementById('status').innerText = "Sistem Hazır.";
                }
            } else {
                document.getElementById('play-pause-btn').innerText = "|| DURDUR";
                document.getElementById('status').innerText = "Çalınıyor: " + vd.title;
            }
        }
    } else if (e.data == YT.PlayerState.PAUSED) {
        document.getElementById('play-pause-btn').innerText = "> OYNAT";
    }
}

// 6. LİSTE ARAYÜZÜNÜ GÜNCELLE
function updateQueueUI() {
    const div = document.getElementById('queue-list');
    if (!isPlaylist) { 
        div.innerHTML = "<p style='color:#666; text-align:center;'>Tekli parça modundasın.</p>"; 
        return; 
    }
    const ids = player.getPlaylist(), cur = player.getPlaylistIndex();
    if (ids) {
        div.innerHTML = "";
        ids.forEach((id, idx) => {
            const item = document.createElement('div');
            item.className = `queue-item ${idx === cur ? 'active' : ''}`;
            item.innerText = playlistTitles[id] || "Şarkı " + (idx + 1);
            item.onclick = () => { isScanning = false; player.unMute(); player.playVideoAt(idx); };
            div.appendChild(item);
        });
    }
}

// 7. KONTROL FONKSİYONLARI
function toggleLoop() {
    loopState = (loopState + 1) % 3;
    const btn = document.getElementById('loop-btn');
    const config = [
        { text: "DÖNGÜ: KAPALI", color: "#fff" },
        { text: "DÖNGÜ: LİSTE", color: "#ff0000" },
        { text: "DÖNGÜ: TEKLİ", color: "#00ff00" }
    ];
    btn.innerText = config[loopState].text;
    btn.style.color = config[loopState].color;
    btn.style.borderColor = config[loopState].color;
    if (player.setLoop) player.setLoop(loopState === 1);
}

function toggleShuffle() {
    if (!isPlaylist) return;
    isShuffled = !isShuffled;
    player.setShuffle(isShuffled);
    const btn = document.getElementById('shuffle-btn');
    btn.style.color = isShuffled ? "#ff0000" : "#fff";
    btn.style.borderColor = isShuffled ? "#ff0000" : "#fff";
}

function changeVolume(v) { if (player && player.setVolume) player.setVolume(v); }
function togglePlay() { player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo(); }
function nextTrack() { skipDirection = 1; player.nextVideo(); }
function prevTrack() { skipDirection = -1; player.previousVideo(); }

// 8. GEÇMİŞ YÖNETİMİ
function saveToHistory(l, t) {
    let h = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    if (h.some(i => i.link === l)) return;
    h.unshift({ link: l, title: t });
    if (h.length > 15) h.pop();
    localStorage.setItem('muartHistory', JSON.stringify(h));
    updateHistoryUI();
}

function updateHistoryUI() {
    const hl = document.getElementById('history-list');
    if (!hl) return;
    let h = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    hl.innerHTML = "";
    h.forEach(i => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span class="history-text">>> ${i.title}</span>
            <button class="del-btn" onclick="event.stopPropagation(); deleteHistoryItem('${i.link}')">X</button>
        `;
        item.onclick = () => { document.getElementById('yt-link').value = i.link; loadMedia(); };
        hl.appendChild(item);
    });
}

function deleteHistoryItem(l) {
    let h = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    localStorage.setItem('muartHistory', JSON.stringify(h.filter(i => i.link !== l)));
    updateHistoryUI();
}
