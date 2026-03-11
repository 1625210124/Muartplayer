// PROXY VE API AYARLARI
const PROXY_URL = "https://api.allorigins.win/raw?url="; // Veriyi bu köprü üzerinden çekeceğiz
const API_BASE = "https://pipedapi.kavin.rocks"; // Piped'ın en sağlam API'si

let playlist = []; 
let originalPlaylist = []; 
let currentIndex = 0;
let loopState = 0; // 0: KAPALI, 1: LİSTE, 2: TEKLİ
let isShuffled = false;
let loopCheckInterval;
let videoPlayer;

// Sayfa yüklendiğinde oynatıcıyı kur
window.onload = () => {
    const container = document.getElementById('main-player');
    container.innerHTML = ""; 
    
    videoPlayer = document.createElement('video');
    videoPlayer.id = "main-video-player";
    videoPlayer.controls = true;
    videoPlayer.autoplay = true;
    videoPlayer.style.width = "100%";
    videoPlayer.style.height = "100%";
    videoPlayer.style.backgroundColor = "#000";
    
    videoPlayer.onended = onVideoEnded;
    videoPlayer.onerror = onPlayerError;
    container.appendChild(videoPlayer);
    
    updateHistoryUI(); 
    startLoopTimer(); // SENİN DÖNGÜ MOTORUN
    changeVolume(document.getElementById('volume-slider').value);
};

// --- PROXY DESTEKLİ FETCH FONKSİYONU ---
async function fetchWithProxy(url) {
    const response = await fetch(PROXY_URL + encodeURIComponent(url));
    if (!response.ok) throw new Error("Proxy hatası!");
    return await response.json();
}

// 1.2 Saniye Kala Başa Sarma (Senin efsane taktik)
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

function onPlayerError() {
    document.getElementById('status').innerText = "Proxy üzerinden bile gelmedi, atlanıyor...";
    setTimeout(() => nextTrack(), 1000);
}

function onVideoEnded() {
    if (loopState === 2) return; 
    if (currentIndex < playlist.length - 1) {
        nextTrack();
    } else if (loopState === 1) {
        currentIndex = 0;
        playTrack(0);
    }
}

// YÜKLEME BUTONU
async function loadMedia() {
    const inp = document.getElementById('yt-link');
    const link = inp.value.trim();
    if (!link) return;

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    document.getElementById('status').innerText = "Proxy Köprüsü Kuruluyor...";

    if (listId) {
        try {
            // Liste verisini Proxy üzerinden çekiyoruz
            const data = await fetchWithProxy(`${API_BASE}/playlists/${listId}`);
            playlist = data.relatedStreams.map(v => ({
                videoId: v.url.split("?v=")[1] || v.url.split("/watch/")[1],
                title: v.title
            }));
            
            originalPlaylist = [...playlist]; 
            currentIndex = 0;
            
            saveToHistory(link, data.name || "Yeni Playlist");
            updateQueueUI(); 
            playTrack(currentIndex); 
        } catch (e) {
            document.getElementById('status').innerText = "Liste Proxy'ye takıldı!";
        }
    } else if (videoId) {
        playlist = [{ videoId: videoId, title: "Video Bekleniyor..." }];
        originalPlaylist = [...playlist];
        currentIndex = 0;
        playTrack(0);
    }
    inp.value = "";
}

// VİDEO OYNATMA (PROXY DESTEKLİ)
async function playTrack(index) {
    if (!playlist[index]) return;
    const vId = playlist[index].videoId;
    
    document.getElementById('status').innerText = "Medya Ayrıştırılıyor...";
    
    try {
        // Video detaylarını ve stream linklerini Proxy üzerinden çek
        const data = await fetchWithProxy(`${API_BASE}/streams/${vId}`);
        
        // En kaliteli ama güvenli mp4'ü bul
        let stream = data.videoStreams.find(s => !s.videoOnly && s.mimeType.includes("mp4"));
        if (!stream) stream = data.audioStreams[0]; 

        videoPlayer.src = stream.url;
        videoPlayer.play();
        
        playlist[index].title = data.title;
        document.getElementById('status').innerText = "Çalınıyor: " + data.title;
        document.getElementById('play-pause-btn').innerText = "|| DURDUR";
        
        if (playlist.length === 1) saveToHistory("https://www.youtube.com/watch?v="+vId, data.title);
        updateQueueUI(); 
    } catch (e) {
        onPlayerError();
    }
}

// --- TÜM EKSTRA ÖZELLİKLER (Kırpılmadı) ---

function updateQueueUI() {
    const div = document.getElementById('queue-list');
    div.innerHTML = "";
    if (playlist.length <= 1) return;
    playlist.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = `queue-item ${idx === currentIndex ? 'active' : ''}`;
        el.innerText = item.title || "Yükleniyor...";
        el.onclick = () => { currentIndex = idx; playTrack(idx); };
        div.appendChild(el);
    });
}

function toggleShuffle() {
    if (playlist.length <= 1) return;
    isShuffled = !isShuffled;
    const btn = document.getElementById('shuffle-btn');
    btn.style.borderColor = isShuffled ? "#ff0000" : "#fff";

    if (isShuffled) {
        let currentItem = playlist[currentIndex];
        let rest = playlist.filter((_, i) => i !== currentIndex);
        for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        playlist = [currentItem, ...rest];
        currentIndex = 0;
    } else {
        let currentItem = playlist[currentIndex];
        playlist = [...originalPlaylist];
        currentIndex = playlist.findIndex(p => p.videoId === currentItem.videoId);
    }
    updateQueueUI();
}

function toggleLoop() {
    loopState = (loopState + 1) % 3;
    const btn = document.getElementById('loop-btn');
    const cfg = ["KAPALI", "LİSTE", "TEKLİ"];
    btn.innerText = "DÖNGÜ: " + cfg[loopState];
    btn.style.color = loopState === 1 ? "#f00" : (loopState === 2 ? "#0f0" : "#fff");
}

function togglePlay() { 
    videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
    document.getElementById('play-pause-btn').innerText = videoPlayer.paused ? "> OYNAT" : "|| DURDUR";
}

function nextTrack() { if (currentIndex < playlist.length - 1) { currentIndex++; playTrack(currentIndex); } }
function prevTrack() { if (currentIndex > 0) { currentIndex--; playTrack(currentIndex); } }
function changeVolume(v) { if (videoPlayer) videoPlayer.volume = v / 100; }

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
    let h = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    hl.innerHTML = "";
    h.forEach(i => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span class="history-text">>> ${i.title}</span><button class="del-btn">X</button>`;
        item.querySelector('.history-text').onclick = () => { document.getElementById('yt-link').value = i.link; loadMedia(); };
        item.querySelector('.del-btn').onclick = (e) => {
            e.stopPropagation();
            h = h.filter(x => x.link !== i.link);
            localStorage.setItem('muartHistory', JSON.stringify(h));
            updateHistoryUI();
        };
        hl.appendChild(item);
    });
}
