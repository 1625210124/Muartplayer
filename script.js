let player;
let isPlaylist = false;
let isScanning = false;
let playlistTitles = {}; 
let currentListId = "";
let skipDirection = 1; // 1 = İleri, -1 = Geri
let isLooping = false;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('main-player', {
        height: '100%',
        width: '100%',
        playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    updateHistoryUI();
    player.setVolume(100);
}

function onPlayerError(event) {
    if (event.data == 101 || event.data == 150 || event.data == 2) {
        document.getElementById('status').innerText = "Video engelli, atlanıyor...";
        setTimeout(() => {
            if (skipDirection === 1) {
                player.nextVideo();
            } else {
                player.previousVideo();
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
    skipDirection = 1;

    if (listId) {
        isPlaylist = true;
        currentListId = listId;
        
        // Önbellek (Cache) Kontrolü
        let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
        
        let finalTitle = "Liste: " + listId;
        let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
        let existingItem = history.find(item => item.link.includes(listId));
        if (existingItem) {
            finalTitle = existingItem.title;
        } else {
            let userTitle = prompt("Liste İsmi:", "Yeni Playlist");
            if (userTitle) finalTitle = userTitle;
        }

        player.loadPlaylist({
            listType: 'playlist',
            list: listId,
            index: 0
        });
        saveToHistory(link, finalTitle);

        if (cache[listId]) {
            // Daha önce taranmış, hafızadan çek
            playlistTitles = cache[listId];
            document.getElementById('status').innerText = "Hafızadan yüklendi!";
            setTimeout(updateQueueUI, 1000); 
        } else {
            // İlk defa açılıyor, tara
            isScanning = true;
            player.mute(); 
            document.getElementById('status').innerText = "Liste taranıyor...";
        }
        
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
                // Tarama bitti, önbelleğe kaydet
                let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
                cache[currentListId] = playlistTitles;
                localStorage.setItem('muartCache', JSON.stringify(cache));

                isScanning = false;
                player.unMute();
                player.playVideoAt(0);
                document.getElementById('status').innerText = "Tarama bitti!";
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
    } else if (event.data == YT.PlayerState.ENDED) {
        // Tekli şarkıda döngü açıksa başa sar
        if (!isPlaylist && isLooping) {
            player.playVideo();
        }
    }
}

function updateQueueUI() {
    const listDiv = document.getElementById('queue-list');
    if (!isPlaylist) {
        listDiv.innerHTML = "<p style='color: #888;'>Tekli parça modu.</p>";
        return;
    }

    const playlistIds = player.getPlaylist();
    const currentIndex = player.getPlaylistIndex();
    
    if (playlistIds) {
        listDiv.innerHTML = "";
        playlistIds.forEach((id, index) => {
            const div = document.createElement('div');
            div.className = `queue-item ${index === currentIndex ? 'active' : ''}`;
            
            let displayTitle = playlistTitles[id] || "Şarkı " + (index + 1) + " (Bekleniyor...)";
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

// Ses ve Döngü Kontrolleri
function changeVolume(val) {
    if (player && player.setVolume) player.setVolume(val);
}

function toggleLoop() {
    isLooping = !isLooping;
    const btn = document.getElementById('loop-btn');
    if (isLooping) {
        btn.innerText = "DÖNGÜ: AÇIK";
        btn.style.color = "#ff0000";
        btn.style.borderColor = "#ff0000";
        if (isPlaylist) player.setLoop(true);
    } else {
        btn.innerText = "DÖNGÜ: KAPALI";
        btn.style.color = "#fff";
        btn.style.borderColor = "#fff";
        if (isPlaylist) player.setLoop(false);
    }
}

// Yön kontrollü değiştirme butonları
function togglePlay() { player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo(); }
function nextTrack() { skipDirection = 1; player.nextVideo(); }
function prevTrack() { skipDirection = -1; player.previousVideo(); }

// Geçmiş (Bireysel Silme ve Beyaz Yazı)
function saveToHistory(link, title) {
    let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    if (history.some(item => item.link === link)) return; 
    history.unshift({ link: link, title: title });
    if (history.length > 20) history.pop();
    localStorage.setItem('muartHistory', JSON.stringify(history));
    updateHistoryUI();
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    if (!historyList) return;
    historyList.innerHTML = "";
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'history-text';
        textSpan.innerText = ">> " + item.title;
        textSpan.onclick = () => {
            document.getElementById('yt-link').value = item.link;
            loadMedia();
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'del-btn';
        delBtn.innerText = "X";
        delBtn.onclick = () => deleteHistoryItem(item.link);

        div.appendChild(textSpan);
        div.appendChild(delBtn);
        historyList.appendChild(div);
    });
}

function deleteHistoryItem(link) {
    let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    history = history.filter(item => item.link !== link);
    localStorage.setItem('muartHistory', JSON.stringify(history));
    updateHistoryUI();
}
