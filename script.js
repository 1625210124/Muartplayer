let player, isPlaylist = false, isScanning = false, playlistTitles = {};
let currentListId = "", skipDirection = 1, loopState = 0, isShuffled = false;
let loopCheckInterval;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('main-player', {
        height: '100%', width: '100%',
        playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0, 'enablejsapi': 1 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady() {
    updateHistoryUI();
    startLoopTimer();
}

// TEKLİ DÖNGÜYÜ GARANTİYE ALAN MOTOR
function startLoopTimer() {
    if (loopCheckInterval) clearInterval(loopCheckInterval);
    loopCheckInterval = setInterval(() => {
        if (player && player.getPlayerState() === 1 && loopState === 2) {
            let now = player.getCurrentTime();
            let total = player.getDuration();
            if (total > 0 && (total - now) < 1.2) {
                player.seekTo(0);
                player.playVideo();
            }
        }
    }, 500);
}

function onPlayerError(e) {
    if ([2, 101, 150].includes(e.data)) {
        document.getElementById('status').innerText = "Video engelli, atlanıyor...";
        setTimeout(() => {
            skipDirection === 1 ? player.nextVideo() : player.previousVideo();
        }, 600);
    }
}

function loadMedia() {
    const inp = document.getElementById('yt-link');
    const link = inp.value.trim();
    if (!link) return;
    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list"), videoId = url.searchParams.get("v");
    
    isPlaylist = false; isScanning = false; playlistTitles = {}; skipDirection = 1;

    if (listId) {
        isPlaylist = true; currentListId = listId;
        let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
        let finalTitle = "Liste: " + listId;
        let history = JSON.parse(localStorage.getItem('muartHistory') || "[]");
        let existing = history.find(i => i.link.includes(listId));
        if (existing) finalTitle = existing.title;
        else { let ut = prompt("Liste İsmi:", "Yeni Playlist"); if (ut) finalTitle = ut; }
        
        player.loadPlaylist({ listType: 'playlist', list: listId, index: 0 });
        saveToHistory(link, finalTitle);
        if (cache[listId]) {
            playlistTitles = cache[listId];
            setTimeout(updateQueueUI, 1000);
        } else { isScanning = true; player.mute(); }
    } else if (videoId) {
        player.loadVideoById(videoId);
    }
    inp.value = "";
}

function onPlayerStateChange(e) {
    if (e.data == YT.PlayerState.PLAYING) {
        let vd = player.getVideoData();
        playlistTitles[vd.video_id] = vd.title;
        updateQueueUI();
        if (isScanning) {
            if (player.getPlaylistIndex() < player.getPlaylist().length - 1) {
                setTimeout(() => player.nextVideo(), 800);
            } else {
                let cache = JSON.parse(localStorage.getItem('muartCache') || "{}");
                cache[currentListId] = playlistTitles;
                localStorage.setItem('muartCache', JSON.stringify(cache));
                isScanning = false; player.unMute(); player.playVideoAt(0);
            }
        } else {
            document.getElementById('play-pause-btn').innerText = "|| DURDUR";
            document.getElementById('status').innerText = "Çalınıyor: " + vd.title;
        }
    } else if (e.data == YT.PlayerState.PAUSED) {
        document.getElementById('play-pause-btn').innerText = "> OYNAT";
    }
}

function updateQueueUI() {
    const div = document.getElementById('queue-list');
    if (!isPlaylist) { div.innerHTML = "<p style='color:#888; text-align:center;'>Tekli parça.</p>"; return; }
    const ids = player.getPlaylist(), cur = player.getPlaylistIndex();
    if (ids) {
        div.innerHTML = "";
        ids.forEach((id, idx) => {
            const item = document.createElement('div');
            item.className = `queue-item ${idx === cur ? 'active' : ''}`;
            item.innerText = playlistTitles[id] || "Yükleniyor...";
            item.onclick = () => { isScanning = false; player.unMute(); player.playVideoAt(idx); };
            div.appendChild(item);
        });
    }
}

function toggleLoop() {
    loopState = (loopState + 1) % 3;
    const btn = document.getElementById('loop-btn');
    const cfg = [ ["KAPALI","#fff"], ["LİSTE","#ff0000"], ["TEKLİ","#00ff00"] ];
    btn.innerText = "DÖNGÜ: " + cfg[loopState][0];
    btn.style.color = cfg[loopState][1];
    btn.style.borderColor = cfg[loopState][1];
    if (player.setLoop) player.setLoop(loopState === 1);
}

function toggleShuffle() {
    if (!isPlaylist) return;
    isShuffled = !isShuffled;
    player.setShuffle(isShuffled);
    document.getElementById('shuffle-btn').style.color = isShuffled ? "#ff0000" : "#fff";
}

function changeVolume(v) { if (player.setVolume) player.setVolume(v); }
function togglePlay() { player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo(); }
function nextTrack() { skipDirection = 1; player.nextVideo(); }
function prevTrack() { skipDirection = -1; player.previousVideo(); }

function saveToHistory(l, t) {
    let h = JSON.parse(localStorage.getItem('muartHistory') || "[]");
    if (h.some(i => i.link === l)) return;
    h.unshift({ link: l, title: t }); if (h.length > 15) h.pop();
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
            let newH = JSON.parse(localStorage.getItem('muartHistory')).filter(x => x.link !== i.link);
            localStorage.setItem('muartHistory', JSON.stringify(newH));
            updateHistoryUI();
        };
        hl.appendChild(item);
    });
}
