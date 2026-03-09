let player;
let isPlaylist = false;
let isScanning = false;
let playlistTitles = {}; 
let currentListId = "";
let skipDirection = 1; 

let loopState = 0; // 0: Kapalı, 1: Liste, 2: Tekli
let isShuffled = false;

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
            if (skipDirection === 1) player.nextVideo();
            else player.previousVideo();
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
    isShuffled = false; // Yeni liste açılınca karıştırma sıfırlansın
    document.getElementById('shuffle-btn').style.color = "#fff";
    document.getElementById('shuffle-btn').style.borderColor = "#fff";

    if (listId) {
        isPlaylist = true;
        currentListId = listId;
        
        let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
        let finalTitle = "Liste: " + listId;
        let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
        let existingItem = history.find(item => item.link.includes(listId));
        
        if (existingItem) finalTitle = existingItem.title;
        else {
            let userTitle = prompt("Liste İsmi:", "Yeni Playlist");
            if (userTitle) finalTitle = userTitle;
        }

        player.loadPlaylist({ listType: 'playlist', list: listId, index: 0 });
        saveToHistory(link, finalTitle);

        if (cache[listId]) {
            playlistTitles = cache[listId];
            document.getElementById('status').innerText = "Hafızadan yüklendi!";
            setTimeout(updateQueueUI, 1000); 
        } else {
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
            if (!isPlaylist) saveToHistory("https://www.youtube.com/watch?v=" + currentId, currentTitle);
        }
    } else if (event.data == YT.PlayerState.PAUSED && !isScanning) {
        document.getElementById('play-pause-btn').innerHTML = "> OYNAT";
    } else if (event.data == YT.PlayerState.ENDED) {
        // Tekli şarkı döngüsü açıksa başa sarıp tekrar çal
        if (loopState === 2) {
            player.seekTo(0);
            player.playVideo();
        }
    }
}

function updateQueueUI() {
    const listDiv = document.getElementById('queue-list');
    if (!isPlaylist) {
        listDiv.innerHTML = "<p style='color: #888; text-align: center;'>Tekli parça modu.</p>";
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

// Yeni Karıştır (Shuffle) Modu
function toggleShuffle() {
    if (!isPlaylist) return;
    isShuffled = !isShuffled;
    player.setShuffle(isShuffled);
    
    const btn = document.getElementById('shuffle-btn');
    if (isShuffled) {
        btn.style.color = "#ff0000";
        btn.style.borderColor = "#ff0000";
    } else {
        btn.style.color = "#fff";
        btn.style.borderColor = "#fff";
    }
    // YouTube'un listeyi karıştırması için kısa bir süre bekleyip UI'yi güncelliyoruz
    setTimeout(updateQueueUI, 500);
}

// 3 Aşamalı Döngü Sistemi
function toggleLoop() {
    loopState = (loopState + 1) % 3; // 0, 1, 2 arasında döner
    const btn = document.getElementById('loop-btn');
    
    if (loopState === 0) {
        btn.innerText = "DÖNGÜ: KAPALI";
        btn.style.color = "#fff";
        btn.style.borderColor = "#fff";
        if (isPlaylist) player.setLoop(false);
    } else if (loopState === 1) {
        btn.innerText = "DÖNGÜ: LİSTE";
        btn.style.color = "#ff0000";
        btn.style.borderColor = "#ff0000";
        if (isPlaylist) player.setLoop(true);
    } else if (loopState === 2) {
        btn.innerText = "DÖNGÜ: TEKLİ";
        btn.style.color = "#00ff00"; // Tekli döngü yeşil renk olsun ki belli olsun
        btn.style.borderColor = "#00ff00";
        if (isPlaylist) player.setLoop(false); // API loop'unu kapatıp ENDED event'i ile biz hallediyoruz
    }
}

function changeVolume(val) { if (player && player.setVolume) player.setVolume(val); }
function togglePlay() { player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo(); }
function nextTrack() { skipDirection = 1; player.nextVideo(); }
function prevTrack() { skipDirection = -1; player.previousVideo(); }

// Geçmiş Fonksiyonları
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
