let player;
let isPlaylist = false;
let isScanning = false;
let playlistTitles = {}; 

function onYouTubeIframeAPIReady() {
    player = new YT.Player('main-player', {
        height: '100%',
        width: '100%',
        playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError // Hata yakalayıcı eklendi
        }
    });
}

function onPlayerReady(event) {
    updateHistoryUI();
}

// VIDEO OYNATILAMIYORSA BURASI ÇALIŞIR
function onPlayerError(event) {
    console.log("Hata yakalandı, kod:", event.data);
    
    // 101 veya 150: Video sahibi yerleştirmeye izin vermiyor demektir
    if (event.data == 101 || event.data == 150 || event.data == 2) {
        document.getElementById('status').innerText = "Video engelli, atlanıyor...";
        
        // Yarım saniye bekle ve sonrakine geç
        setTimeout(() => {
            if (isPlaylist) {
                nextTrack();
            } else {
                document.getElementById('status').innerText = "Bu video oynatılamıyor.";
            }
        }, 500);
    }
}

function loadMedia() {
    const linkInput = document.getElementById('yt-link');
    const link = linkInput.value.trim();
    if (!link) return;

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    isPlaylist = false;
    isScanning = false;
    playlistTitles = {}; 

    if (listId) {
        isPlaylist = true;
        let userTitle = prompt("Liste İsmi:", "Yeni Playlist");
        let finalTitle = userTitle || "Liste: " + listId;
        
        player.loadPlaylist({
            listType: 'playlist',
            list: listId,
            index: 0
        });
        saveToHistory(link, finalTitle);
        
        isScanning = true;
        player.mute(); 
        document.getElementById('status').innerText = "Liste taranıyor...";
    } else if (videoId) {
        player.loadVideoById(videoId);
    }
    linkInput.value = "";
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        let videoData = player.getVideoData();
        let currentTitle = videoData.title;
        let currentId = videoData.video_id;

        playlistTitles[currentId] = currentTitle;
        updateQueueUI();

        if (isScanning) {
            const currentIndex = player.getPlaylistIndex();
            const playlistLength = player.getPlaylist().length;

            if (currentIndex < playlistLength - 1) {
                setTimeout(() => player.nextVideo(), 800); 
            } else {
                isScanning = false;
                player.unMute();
                player.playVideoAt(0);
                document.getElementById('status').innerText = "Tarama bitti, keyifli dinlemeler!";
            }
        } else {
            document.getElementById('play-pause-btn').innerHTML = "|| DURDUR";
            document.getElementById('status').innerText = "Çalınıyor: " + currentTitle;
            if (!isPlaylist) {
                saveToHistory("https://www.youtube.com/watch?v=" + currentId, currentTitle);
            }
        }
    } else if (event.data == YT.PlayerState.PAUSED && !isScanning) {
        document.getElementById('play-pause-btn').innerHTML = "> OYNAT";
    }
}

function updateQueueUI() {
    const listDiv = document.getElementById('queue-list');
    if (!isPlaylist) {
        listDiv.innerHTML = "<p style='color: #444;'>Tekli parça modu.</p>";
        return;
    }

    const playlistIds = player.getPlaylist();
    const currentIndex = player.getPlaylistIndex();
    
    if (playlistIds) {
        listDiv.innerHTML = "";
        playlistIds.forEach((id, index) => {
            const div = document.createElement('div');
            div.className = `queue-item ${index === currentIndex ? 'active' : ''}`;
            
            let displayTitle = playlistTitles[id] || "Şarkı " + (index + 1) + " (Taranıyor...)";
            div.innerText = displayTitle;
            div.onclick = () => {
                isScanning = false;
                player.unMute();
                player.playVideoAt(index);
            };
            listDiv.appendChild(div);
        });
    }
}

// Hafıza sisteminde hata linkInput'u düzeltildi
function saveToHistory(link, title) {
    let history = JSON.parse(localStorage.getItem('muartHistoryV9') || "[]");
    if (history.some(item => item.link === link)) return; 
    history.unshift({ link: link, title: title });
    if (history.length > 15) history.pop();
    localStorage.setItem('muartHistoryV9', JSON.stringify(history));
    updateHistoryUI();
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    let history = JSON.parse(localStorage.getItem('muartHistoryV9') || "[]");
    if (!historyList) return;
    historyList.innerHTML = "";
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.style.cssText = "padding: 8px; border-bottom: 1px solid #111; cursor: pointer; color: #666;";
        div.innerText = ">> " + item.title;
        div.onclick = () => {
            document.getElementById('yt-link').value = item.link;
            loadMedia();
        };
        historyList.appendChild(div);
    });
}

function clearHistory() {
    if (confirm("Geçmiş silinsin mi?")) {
        localStorage.removeItem('muartHistoryV9');
        updateHistoryUI();
    }
}

function togglePlay() { player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo(); }
function nextTrack() { player.nextVideo(); }
function prevTrack() { player.previousVideo(); }
