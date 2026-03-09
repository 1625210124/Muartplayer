let player;
let isPlaylist = false;
let playlistTitles = {}; // Öğrenilen şarkı isimleri

function onYouTubeIframeAPIReady() {
    player = new YT.Player('main-player', {
        height: '100%',
        width: '100%',
        playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    updateHistoryUI();
}

function loadMedia() {
    const linkInput = document.getElementById('yt-link');
    const link = linkInput.value.trim();
    if (!link) return;

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    isPlaylist = false;
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
    } else if (videoId) {
        player.loadVideoById(videoId);
        // İsim çalmaya başlayınca otomatik kaydedilecek
    }
    linkInput.value = "";
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        document.getElementById('play-pause-btn').innerHTML = "|| DURDUR";
        
        let videoData = player.getVideoData();
        let currentTitle = videoData.title;
        let currentId = videoData.video_id;

        document.getElementById('status').innerText = "Çalınıyor: " + currentTitle;

        // Akıllı İsimlendirme: İsmi listeye kaydet
        playlistTitles[currentId] = currentTitle;
        
        if (!isPlaylist) {
            saveToHistory("https://www.youtube.com/watch?v=" + currentId, currentTitle);
        }

        updateQueueUI(); 
    } else if (event.data == YT.PlayerState.PAUSED) {
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
            
            // İsmi biliyorsak göster, yoksa ID göster
            let displayTitle = playlistTitles[id] || "Şarkı " + (index + 1) + " (Bekleniyor...)";
            
            div.innerText = displayTitle;
            div.onclick = () => player.playVideoAt(index);
            listDiv.appendChild(div);
        });
    }
}

function saveToHistory(link, title) {
    let history = JSON.parse(localStorage.getItem('muartHistoryV8') || "[]");
    if (history.some(item => item.link === link)) return; 

    history.unshift({ link: link, title: title });
    if (history.length > 15) history.pop();
    localStorage.setItem('muartHistoryV8', JSON.stringify(history));
    updateHistoryUI();
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    let history = JSON.parse(localStorage.getItem('muartHistoryV8') || "[]");
    if (!historyList) return;
    historyList.innerHTML = "";
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
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
        localStorage.removeItem('muartHistoryV8');
        updateHistoryUI();
    }
}

function togglePlay() { player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo(); }
function nextTrack() { player.nextVideo(); }
function prevTrack() { player.previousVideo(); }
