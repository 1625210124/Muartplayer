// PIPED API ALTYAPISI & TAM MUARTPLAYER ÖZELLİKLERİ
const PIPED_INSTANCE = "https://pipedapi.kavin.rocks"; // Piped'ın ana sunucusu

let playlist = []; 
let originalPlaylist = []; 
let currentIndex = 0;
let loopState = 0; // 0: KAPALI, 1: LİSTE, 2: TEKLİ
let isShuffled = false;
let loopCheckInterval;
let videoPlayer;

window.onload = () => {
    const container = document.getElementById('main-player');
    container.innerHTML = ""; 
    
    // HTML5 Oynatıcı
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
    startLoopTimer(); 
    changeVolume(document.getElementById('volume-slider').value);
};

// Kusursuz Tekli Döngü Motoru
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
    document.getElementById('status').innerText = "Video oynatılamıyor, atlanıyor...";
    setTimeout(() => nextTrack(), 800);
}

function onVideoEnded() {
    if (loopState === 2) return; 
    
    if (currentIndex < playlist.length - 1) {
        nextTrack();
    } else if (loopState === 1) {
        currentIndex = 0;
        playTrack(0);
    } else {
        document.getElementById('status').innerText = "Liste bitti.";
        document.getElementById('play-pause-btn').innerText = "> OYNAT";
    }
}

// Piped API ile Liste ve Video Çekme
async function loadMedia() {
    const inp = document.getElementById('yt-link');
    const link = inp.value.trim();
    if (!link) return;

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    isShuffled = false; 
    document.getElementById('shuffle-btn').style.color = "#fff";
    document.getElementById('shuffle-btn').style.borderColor = "#fff";
    document.getElementById('status').innerText = "Piped API'den veri çekiliyor...";

    if (listId) {
        try {
            const res = await fetch(`${PIPED_INSTANCE}/playlists/${listId}`);
            if (!res.ok) throw new Error("API Hatası");
            const data = await res.json();
            
            // Piped'ın yapısına göre listeyi ayıkla
            playlist = data.relatedStreams.map(v => {
                // Piped URL formatı genelde "/watch?v=ID" şeklindedir
                let vId = v.url.includes("?v=") ? v.url.split("?v=")[1] : v.url;
                return { videoId: vId, title: v.title };
            });
            
            originalPlaylist = [...playlist]; 
            currentIndex = 0;
            
            let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
            let existing = history.find(i => i.link.includes(listId));
            let finalTitle = existing ? existing.title : (prompt("Liste İsmi:", data.name || "Yeni Playlist") || data.name);
            
            saveToHistory(link, finalTitle);
            updateQueueUI(); 
            playTrack(currentIndex); 
        } catch (e) {
            document.getElementById('status').innerText = "Liste çekilemedi! Gizli liste olabilir.";
        }
    } else if (videoId) {
        playlist = [{ videoId: videoId, title: "Bekleniyor..." }];
        originalPlaylist = [...playlist];
        currentIndex = 0;
        playTrack(0);
    }
    inp.value = "";
}

// Piped API üzerinden Saf Video Oynatma
async function playTrack(index) {
    if (!playlist[index]) return;
    const vId = playlist[index].videoId;
    
    document.getElementById('status').innerText = "Medya çözülüyor (Piped)...";
    
    try {
        const res = await fetch(`${PIPED_INSTANCE}/streams/${vId}`);
        if (!res.ok) throw new Error("API Hatası");
        const data = await res.json();
        
        // Piped'dan uygun MP4 veya Audio stream bul
        // Önce hem ses hem görüntü olanı arar, bulamazsa ilk bulduğuna geçer
        let stream = data.videoStreams.find(s => s.videoOnly === false && s.mimeType.includes("mp4"));
        if (!stream && data.audioStreams.length > 0) stream = data.audioStreams[0]; // Sadece ses
        if (!stream) stream = data.videoStreams[0]; 

        if (!stream) throw new Error("Oynatılabilir stream bulunamadı");

        videoPlayer.src = stream.url;
        videoPlayer.play();
        
        playlist[index].title = data.title || "Bilinmeyen Şarkı";
        document.getElementById('status').innerText = "Çalınıyor: " + playlist[index].title;
        document.getElementById('play-pause-btn').innerText = "|| DURDUR";
        
        if (playlist.length === 1) {
            saveToHistory("https://www.youtube.com/watch?v=" + vId, playlist[index].title);
        }
        
        updateQueueUI(); 
    } catch (e) {
        console.error(e);
        onPlayerError();
    }
}

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
        el.innerText = item.title || "Şarkı " + (idx + 1);
        el.onclick = () => { currentIndex = idx; playTrack(idx); };
        div.appendChild(el);
    });
}

function toggleLoop() {
    loopState = (loopState + 1) % 3;
    const btn = document.getElementById('loop-btn');
    const cfg = [ {t:"KAPALI", c:"#fff"}, {t:"LİSTE", c:"#ff0000"}, {t:"TEKLİ", c:"#00ff00"} ];
    btn.innerText = "DÖNGÜ: " + cfg[loopState].t;
    btn.style.color = cfg[loopState].c;
    btn.style.borderColor = cfg[loopState].c;
}

function toggleShuffle() {
    if (playlist.length <= 1) return;
    
    isShuffled = !isShuffled;
    const btn = document.getElementById('shuffle-btn');
    btn.style.color = isShuffled ? "#ff0000" : "#fff";
    btn.style.borderColor = isShuffled ? "#ff0000" : "#fff";

    if (isShuffled) {
        let currentItem = playlist[currentIndex];
        let remaining = playlist.filter((_, idx) => idx !== currentIndex);
        
        for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        
        playlist = [currentItem, ...remaining]; 
        currentIndex = 0; 
    } else {
        let currentItem = playlist[currentIndex];
        playlist = [...originalPlaylist];
        
        currentIndex = playlist.findIndex(p => p.videoId === currentItem.videoId);
        if(currentIndex === -1) currentIndex = 0;
    }
    updateQueueUI(); 
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
            e.stopPropagation(); 
            let newH = JSON.parse(localStorage.getItem('muartHistory')).filter(x => x.link !== i.link);
            localStorage.setItem('muartHistory', JSON.stringify(newH));
            updateHistoryUI();
        };
        hl.appendChild(item);
    });
}
