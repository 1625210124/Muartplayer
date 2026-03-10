// INVIDIOUS ALTYAPISI & TAM MUARTPLAYER ÖZELLİKLERİ
const INVIDIOUS_INSTANCE = "https://yewtu.be"; // Alternatif: https://invidious.nerdvpn.de

let playlist = []; // Çalınan liste
let originalPlaylist = []; // Karıştırma kapandığında orijinal sıraya dönmek için
let currentIndex = 0;
let loopState = 0; // 0: KAPALI, 1: LİSTE, 2: TEKLİ
let isShuffled = false;
let loopCheckInterval;
let videoPlayer;

// Sayfa yüklendiğinde oynatıcıyı ve geçmişi hazırla
window.onload = () => {
    const container = document.getElementById('main-player');
    container.innerHTML = ""; 
    
    // HTML5 Reklamsız Oynatıcımızı yaratıyoruz
    videoPlayer = document.createElement('video');
    videoPlayer.id = "main-video-player";
    videoPlayer.controls = true;
    videoPlayer.autoplay = true;
    videoPlayer.style.width = "100%";
    videoPlayer.style.height = "100%";
    videoPlayer.style.backgroundColor = "#000";
    
    // Şarkı bittiğinde ne olacağını biz belirliyoruz (Google değil)
    videoPlayer.onended = onVideoEnded;
    
    // Hata olursa o şarkıyı atla
    videoPlayer.onerror = onPlayerError;

    container.appendChild(videoPlayer);
    
    updateHistoryUI(); // Geçmiş listesini doldur
    startLoopTimer(); // SENİN O EFSANE TEKLİ DÖNGÜ MOTORUN BURADA!
    changeVolume(document.getElementById('volume-slider').value);
};

// Kusursuz Tekli Döngü Motoru (Şarkı bitmeden 1.2 saniye kala başa sarma taktiği)
function startLoopTimer() {
    if (loopCheckInterval) clearInterval(loopCheckInterval);
    loopCheckInterval = setInterval(() => {
        if (videoPlayer && !videoPlayer.paused && loopState === 2) {
            let now = videoPlayer.currentTime;
            let total = videoPlayer.duration;
            if (total > 0 && (total - now) < 1.2) {
                videoPlayer.currentTime = 0;
                videoPlayer.play();
            }
        }
    }, 500);
}

// Oynatılamayan videoyu otomatik atlama
function onPlayerError() {
    document.getElementById('status').innerText = "Video oynatılamıyor, atlanıyor...";
    setTimeout(() => nextTrack(), 800);
}

// Oynatıcı sonu davranışları (Eskiden YouTube'un kendisinin yaptığı şeyler)
function onVideoEnded() {
    if (loopState === 2) return; // Tekli döngüyü timer (LoopTimer) hallediyor
    
    if (currentIndex < playlist.length - 1) {
        nextTrack();
    } else if (loopState === 1) {
        // Liste sonuna geldik ve liste döngüsü açıksa başa dön
        currentIndex = 0;
        playTrack(0);
    } else {
        document.getElementById('status').innerText = "Liste bitti.";
        document.getElementById('play-pause-btn').innerText = "> OYNAT";
    }
}

// YÜKLEME BUTONU (Linkleri Ayıkla, Hafızaya At)
async function loadMedia() {
    const inp = document.getElementById('yt-link');
    const link = inp.value.trim();
    if (!link) return;

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    isShuffled = false; // Karıştırmayı sıfırla
    document.getElementById('shuffle-btn').style.color = "#fff";
    document.getElementById('shuffle-btn').style.borderColor = "#fff";
    document.getElementById('status').innerText = "Özgür API'den liste çekiliyor (Reklamsız)...";

    if (listId) {
        // LİSTE YÜKLEME
        try {
            const res = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/playlists/${listId}`);
            const data = await res.json();
            
            // YouTube API'deki gibi listeyi kendi objemize çeviriyoruz
            playlist = data.videos.map(v => ({ videoId: v.videoId, title: v.title }));
            originalPlaylist = [...playlist]; // Karıştırma için yedek al
            currentIndex = 0;
            
            // Eskiden olduğu gibi liste ismini sor/hafızadan çek
            let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
            let existing = history.find(i => i.link.includes(listId));
            let finalTitle = existing ? existing.title : (prompt("Liste İsmi:", data.title || "Yeni Playlist") || data.title);
            
            saveToHistory(link, finalTitle);
            updateQueueUI(); // Sağ tarafa listeyi döşe
            playTrack(currentIndex); // Çalmaya başla
        } catch (e) {
            document.getElementById('status').innerText = "Liste çekilirken hata oluştu!";
        }
    } else if (videoId) {
        // TEKLİ VİDEO YÜKLEME
        playlist = [{ videoId: videoId, title: "Bekleniyor..." }];
        originalPlaylist = [...playlist];
        currentIndex = 0;
        playTrack(0);
    }
    inp.value = "";
}

// SEÇİLEN VİDEOYU OYNATAN GERÇEK MOTOR (API'den MP4 Link Çeker)
async function playTrack(index) {
    if (!playlist[index]) return;
    const vId = playlist[index].videoId;
    
    document.getElementById('status').innerText = "Medya çözülüyor...";
    
    try {
        const res = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${vId}`);
        const data = await res.json();
        
        // SIFIR REKLAM! Saf videoyu sunucudan çek
        const stream = data.formatStreams.find(s => s.container === "mp4" && s.resolution !== "audio only") || data.formatStreams[0];
        
        if (!stream) throw new Error("Stream bulunamadı");

        videoPlayer.src = stream.url;
        videoPlayer.play();
        
        // Başlığı güncelle
        playlist[index].title = data.title || "Bilinmeyen Şarkı";
        document.getElementById('status').innerText = "Çalınıyor: " + playlist[index].title;
        document.getElementById('play-pause-btn').innerText = "|| DURDUR";
        
        // Tekli video yüklediyse geçmişe kaydet
        if (playlist.length === 1) {
            saveToHistory("https://www.youtube.com/watch?v=" + vId, playlist[index].title);
        }
        
        updateQueueUI(); // Oynatılan şarkıyı sarı vs. boyamak için listeyi güncelle
    } catch (e) {
        onPlayerError();
    }
}

// LİSTEYİ GÜNCELLEME EKRANI (Queue)
function updateQueueUI() {
    const div = document.getElementById('queue-list');
    if (playlist.length <= 1) { 
        div.innerHTML = "<p style='color:#888; text-align:center;'>Tekli parça modu.</p>"; 
        return; 
    }
    
    div.innerHTML = "";
    playlist.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = `queue-item ${idx === currentIndex ? 'active' : ''}`;
        el.innerText = item.title || "Şarkı " + (idx + 1) + " (Bekleniyor...)";
        el.onclick = () => { currentIndex = idx; playTrack(idx); };
        div.appendChild(el);
    });
}

// BUTON - DÖNGÜ (Loop)
function toggleLoop() {
    loopState = (loopState + 1) % 3;
    const btn = document.getElementById('loop-btn');
    const cfg = [ {t:"KAPALI", c:"#fff"}, {t:"LİSTE", c:"#ff0000"}, {t:"TEKLİ", c:"#00ff00"} ];
    btn.innerText = "DÖNGÜ: " + cfg[loopState].t;
    btn.style.color = cfg[loopState].c;
    btn.style.borderColor = cfg[loopState].c;
}

// BUTON - KARIŞTIR (Shuffle) - Kendi Karıştırma Algoritmamız!
function toggleShuffle() {
    if (playlist.length <= 1) return;
    
    isShuffled = !isShuffled;
    const btn = document.getElementById('shuffle-btn');
    btn.style.color = isShuffled ? "#ff0000" : "#fff";
    btn.style.borderColor = isShuffled ? "#ff0000" : "#fff";

    if (isShuffled) {
        // Mevcut çalan şarkıyı koru, geri kalanı dağıt
        let currentItem = playlist[currentIndex];
        let remaining = playlist.filter((_, idx) => idx !== currentIndex);
        
        // Gelişmiş Matematiksel Karıştırma (Fisher-Yates Shuffle)
        for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        
        playlist = [currentItem, ...remaining]; // Çalan şarkı en başa, kalanlar arkaya karışık
        currentIndex = 0; 
    } else {
        // Orijinal Sıraya Geri Dön
        let currentItem = playlist[currentIndex];
        playlist = [...originalPlaylist];
        
        // Şarkının eski yerini bul, dinlemeye oradan devam etsin
        currentIndex = playlist.findIndex(p => p.videoId === currentItem.videoId);
        if(currentIndex === -1) currentIndex = 0;
    }
    updateQueueUI(); // Yan listeyi baştan çiz
}

function togglePlay() { 
    if(videoPlayer.paused) {
        videoPlayer.play();
        document.getElementById('play-pause-btn').innerText = "|| DURDUR";
    } else {
        videoPlayer.pause();
        document.getElementById('play-pause-btn').innerText = "> OYNAT";
    }
}

function nextTrack() { 
    if (currentIndex < playlist.length - 1) {
        currentIndex++;
        playTrack(currentIndex);
    } else if (loopState === 1) {
        currentIndex = 0;
        playTrack(0);
    }
}

function prevTrack() { 
    if (currentIndex > 0) {
        currentIndex--;
        playTrack(currentIndex);
    }
}

function changeVolume(v) { 
    if (videoPlayer) videoPlayer.volume = v / 100; 
}

// GEÇMİŞ FONKSİYONLARI (Tamamen bozulmadan duruyor)
function saveToHistory(l, t) {
    let h = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    if (h.some(i => i.link === l)) return;
    h.unshift({ link: l, title: t });
    if (h.length > 20) h.pop();
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
            e.stopPropagation(); // Butona basılınca şarkının açılmasını engeller
            let newH = JSON.parse(localStorage.getItem('muartHistory')).filter(x => x.link !== i.link);
            localStorage.setItem('muartHistory', JSON.stringify(newH));
            updateHistoryUI();
        };
        hl.appendChild(item);
    });
}
