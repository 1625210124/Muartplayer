/**
 * MUARTPLAYER - ANTI-AD & UNDERTALE EDITION (2026)
 * Reklam Yakalama, Otomatik Sessize Alma ve Kesin Döngü Modu
 */

let player, isPlaylist = false, isScanning = false, playlistTitles = {};
let currentListId = "", skipDirection = 1, loopState = 0, isShuffled = false;
let loopCheckInterval;

// 1. YouTube API Hazırlığı (Reklam Engelleme Parametreleriyle)
function onYouTubeIframeAPIReady() {
    player = new YT.Player('main-player', {
        height: '100%', 
        width: '100%',
        playerVars: { 
            'autoplay': 1, 
            'controls': 1, 
            'rel': 0, 
            'enablejsapi': 1,
            'modestbranding': 1, // YouTube logosunu gizle
            'iv_load_policy': 3,  // Video içi duyuruları kapat
            'showinfo': 0,
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
    startUltraControlTimer(); // Reklam ve Döngü motoru
}

// 2. ULTRA KONTROL MOTORU (Reklam Atlatma & Döngü)
function startUltraControlTimer() {
    if (loopCheckInterval) clearInterval(loopCheckInterval);
    loopCheckInterval = setInterval(() => {
        if (!player || typeof player.getPlayerState !== "function") return;

        let state = player.getPlayerState();
        let videoData = player.getVideoData();

        // --- REKLAM YAKALAYICI (Burası Önemli) ---
        // Reklam oynuyorsa veya başlık boşsa (reklam belirtisi) devreye girer
        let isAd = (player.getAdState && player.getAdState() === 1) || 
                   (videoData && (videoData.title === "" || videoData.title === "Advertisement"));

        if (isAd) {
            player.setVolume(0); // Reklam sesini anında kes
            document.getElementById('status').innerText = "🛡️ Reklam Atlanıyor / Sessiz Mod...";
            
            // Reklamı ileri sararak bitirmeye zorla (Eğer YouTube izin verirse)
            if (player.getDuration() > 0) {
                player.seekTo(player.getDuration() + 10, true);
            }
        } else {
            // Reklam değilse ve tarama modunda değilsek sesi geri aç
            if (!isScanning) {
                let vol = document.getElementById('volume-slider').value;
                player.setVolume(vol);
            }
        }

        // --- TEKLİ DÖNGÜ (Loop) ---
        if (state === 1 && loopState === 2) {
            let now = player.getCurrentTime();
            let total = player.getDuration();
            if (total > 0 && (total - now) < 1.3) {
                player.seekTo(0);
                player.playVideo();
            }
        }
    }, 500); // Her yarım saniyede bir kontrol et
}

// 3. HATA YÖNETİMİ
function onPlayerError(e) {
    document.getElementById('status').innerText = "Video engelli, atlanıyor...";
    setTimeout(() => {
        skipDirection === 1 ? player.nextVideo() : player.previousVideo();
    }, 800);
}

// 4. MEDYA YÜKLEME (No-Cookie Zorlaması)
function loadMedia() {
    const inp = document.getElementById('yt-link');
    let rawLink = inp.value.trim();
    if (!rawLink) return;

    // Reklamları zorlaştırmak için Linki Embed/No-Cookie formatına yaklaştır
    let cleanLink = rawLink.replace("music.youtube.com", "www.youtube-nocookie.com")
                           .replace("www.youtube.com", "www.youtube-nocookie.com");
    
    const url = new URL(cleanLink);
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");
    
    isPlaylist = false; isScanning = false; playlistTitles = {}; skipDirection = 1;

    if (listId) {
        isPlaylist = true; 
        currentListId = listId;
        let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
        let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
        let existing = history.find(i => i.link.includes(listId));
        
        let finalTitle = existing ? existing.title : (prompt("Liste İsmi:", "Yeni Liste") || "Yeni Liste");
        
        player.loadPlaylist({ listType: 'playlist', list: listId, index: 0 });
        saveToHistory(rawLink, finalTitle);

        if (cache[listId]) {
            playlistTitles = cache[listId];
            setTimeout(updateQueueUI, 1000);
        } else { 
            isScanning = true; 
            player.setVolume(0); 
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
                    let vol = document.getElementById('volume-slider').value;
                    player.setVolume(vol);
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

// 6. LİSTE ARAYÜZÜ
function updateQueueUI() {
    const div = document.getElementById('queue-list');
    if (!isPlaylist) { 
        div.innerHTML = "<p style='color:#666; text-align:center;'>Tekli parça modu.</p>"; 
        return; 
    }
    const ids = player.getPlaylist(), cur = player.getPlaylistIndex();
    if (ids) {
        div.innerHTML = "";
        ids.forEach((id, idx) => {
            const item = document.createElement('div');
            item.className = `queue-item ${idx === cur ? 'active' : ''}`;
            item.innerText = playlistTitles[id] || "Yükleniyor...";
            item.onclick = () => { isScanning = false; player.playVideoAt(idx); };
            div.appendChild(item);
        });
    }
}

// 7. DİĞER KONTROLLER
function toggleLoop() {
    loopState = (loopState + 1) % 3;
    const btn = document.getElementById('loop-btn');
    const cfg = [ {t:"KAPALI", c:"#fff"}, {t:"LİSTE", c:"#ff0000"}, {t:"TEKLİ", c:"#00ff00"} ];
    btn.innerText = "DÖNGÜ: " + cfg[loopState].t;
    btn.style.color = cfg[loopState].c;
    btn.style.borderColor = cfg[loopState].c;
    if (player.setLoop) player.setLoop(loopState === 1);
}

function toggleShuffle() {
    if (!isPlaylist) return;
    isShuffled = !isShuffled;
    player.setShuffle(isShuffled);
    document.getElementById('shuffle-btn').style.color = isShuffled ? "#ff0000" : "#fff";
}

function changeVolume(v) { if (player && player.setVolume) player.setVolume(v); }
function togglePlay() { player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo(); }
function nextTrack() { skipDirection = 1; player.nextVideo(); }
function prevTrack() { skipDirection = -1; player.previousVideo(); }

// 8. GEÇMİŞ
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
        item.innerHTML = `<span class="history-text">>> ${i.title}</span><button class="del-btn">X</button>`;
        item.querySelector('.history-text').onclick = () => { document.getElementById('yt-link').value = i.link; loadMedia(); };
        item.querySelector('.del-btn').onclick = (e) => {
            e.stopPropagation();
            let newH = JSON.parse(localStorage.getItem('muartHistory')).filter(x => x.link !== i.link);
            localStorage.setItem('muartHistory', JSON.stringify(newH));
            updateHistoryUI();
        };
        hl.appendChild(item);
    });
}
