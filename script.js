// PROXY YOK - DOĞRUDAN API BAĞLANTILARI
const COBALT_API = "https://api.cobalt.tools/api/json";
const PIPED_API = "https://pipedapi.kavin.rocks";

let playlist = []; 
let originalPlaylist = []; 
let currentIndex = 0;
let loopState = 0; // 0: KAPALI, 1: LİSTE, 2: TEKLİ
let isShuffled = false;
let loopCheckInterval;
let audioPlayer;

window.onload = () => {
    const container = document.getElementById('main-player');
    container.innerHTML = ""; 
    
    // Video player yerine doğrudan HTML5 Audio Player
    audioPlayer = document.createElement('audio'); 
    audioPlayer.id = "main-video-player"; // CSS bozulmaması için ID aynı
    audioPlayer.controls = true;
    audioPlayer.autoplay = true;
    audioPlayer.style.width = "100%";
    audioPlayer.style.height = "100%";
    audioPlayer.style.backgroundColor = "#111"; 
    
    audioPlayer.onended = onAudioEnded;
    audioPlayer.onerror = onPlayerError;
    container.appendChild(audioPlayer);
    
    updateHistoryUI(); 
    startLoopTimer(); 
    changeVolume(document.getElementById('volume-slider').value);
};

// 1.2 Saniye Kala Başa Saran Döngü Motoru (Kırpılmadı)
function startLoopTimer() {
    if (loopCheckInterval) clearInterval(loopCheckInterval);
    loopCheckInterval = setInterval(() => {
        if (audioPlayer && !audioPlayer.paused && loopState === 2) {
            let now = audioPlayer.currentTime;
            let total = audioPlayer.duration;
            if (total > 0 && (total - now) < 1.2) {
                audioPlayer.currentTime = 0;
                audioPlayer.play();
            }
        }
    }, 500);
}

function onPlayerError() {
    document.getElementById('status').innerText = "Hata oluştu, sıradakine geçiliyor...";
    setTimeout(() => nextTrack(), 1000);
}

function onAudioEnded() {
    if (loopState === 2) return; 
    if (currentIndex < playlist.length - 1) {
        nextTrack();
    } else if (loopState === 1) {
        currentIndex = 0;
        playTrack(0);
    }
}

// PROXY OLMADAN DOĞRUDAN MP3 ÇEKEN FONKSİYON
async function fetchMp3Direct(videoId) {
    const response = await fetch(COBALT_API, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isAudioOnly: true, // SADECE SES
            aFormat: "mp3"     // MP3 FORMATI
        })
    });
    
    if (!response.ok) throw new Error("API Yanıt Vermedi");
    const data = await response.json();
    return data.url; // Proxy'siz doğrudan mp3 stream linki
}

// YÜKLEME BUTONU VE LİSTE ÇEKİCİ
async function loadMedia() {
    const inp = document.getElementById('yt-link');
    const link = inp.value.trim();
    if (!link) return;

    document.getElementById('status').innerText = "Bağlanıyor...";

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    isShuffled = false;
    document.getElementById('shuffle-btn').style.borderColor = "#fff";

    if (listId) {
        try {
            // Piped API'den proxy KULLANMADAN liste detaylarını al
            const res = await fetch(`${PIPED_API}/playlists/${listId}`);
            if (!res.ok) throw new Error("Liste bulunamadı");
            const data = await res.json();
            
            playlist = data.relatedStreams.map(v => {
                let vId = v.url.includes("?v=") ? v.url.split("?v=")[1] : v.url;
                return { videoId: vId, title: v.title };
            });
            
            originalPlaylist = [...playlist]; 
            currentIndex = 0;
            
            saveToHistory(link, data.name || "Yeni Playlist");
            updateQueueUI(); 
            playTrack(currentIndex); 
        } catch (e) {
            document.getElementById('status').innerText = "Liste çekilemedi!";
        }
    } else if (videoId) {
        playlist = [{ videoId: videoId, title: "Bekleniyor..." }];
        originalPlaylist = [...playlist];
        currentIndex = 0;
        playTrack(0);
    }
    inp.value = "";
}

// OYNATMA MOTORU
async function playTrack(index) {
    if (!playlist[index]) return;
    const vId = playlist[index].videoId;
    
    document.getElementById('status').innerText = "MP3 İşleniyor...";
    
    try {
        const mp3Url = await fetchMp3Direct(vId);
        
        audioPlayer.src = mp3Url;
        audioPlayer.play();
        
        // Piped'dan başlık çekme (Görsellik için)
        fetch(`${PIPED_API}/streams/${vId}`).then(r => r.json()).then(d => {
            playlist[index].title = d.title;
            document.getElementById('status').innerText = "Çalınıyor: " + d.title;
            if (playlist.length === 1) saveToHistory("https://www.youtube.com/watch?v="+vId, d.title);
            updateQueueUI();
        }).catch(() => {
            document.getElementById('status').innerText = "Çalınıyor: Ses Modu Aktif";
        });
        
        document.getElementById('play-pause-btn').innerText = "|| DURDUR";
        updateQueueUI(); 
    } catch (e) {
        onPlayerError();
    }
}

// ARAYÜZ, DÖNGÜ VE KARIŞTIRMA KONTROLLERİ (Kırpılmadı)
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

function toggleShuffle() {
    if (playlist.length <= 1) return;
    isShuffled = !isShuffled;
    document.getElementById('shuffle-btn').style.borderColor = isShuffled ? "#ff0000" : "#fff";

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
    audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
    document.getElementById('play-pause-btn').innerText = audioPlayer.paused ? "> OYNAT" : "|| DURDUR";
}

function nextTrack() { if (currentIndex < playlist.length - 1) { currentIndex++; playTrack(currentIndex); } else if (loopState === 1) { currentIndex = 0; playTrack(0); } }
function prevTrack() { if (currentIndex > 0) { currentIndex--; playTrack(currentIndex); } }
function changeVolume(v) { if (audioPlayer) audioPlayer.volume = v / 100; }

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
