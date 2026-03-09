let player;
let isPlaylist = false;

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
    document.getElementById('status').innerText = "Oynatıcı hazır.";
}

function loadMedia() {
    const link = document.getElementById('yt-link').value.trim();
    if (!link) return;

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    if (listId) {
        // LİSTE YÜKLEME
        isPlaylist = true;
        player.loadPlaylist({
            listType: 'playlist',
            list: listId,
            index: 0,
            suggestedQuality: 'default'
        });
        document.getElementById('status').innerText = "Liste yükleniyor...";
    } else if (videoId) {
        // TEK ŞARKI YÜKLEME
        isPlaylist = false;
        player.loadVideoById(videoId);
        document.getElementById('status').innerText = "Şarkı yükleniyor...";
    }
}

function onPlayerStateChange(event) {
    // Şarkı başladığında yan listeyi güncelle
    if (event.data == YT.PlayerState.PLAYING) {
        document.getElementById('play-pause-btn').innerText = "DURDUR";
        updateQueueUI();
    }
}

function togglePlay() {
    const state = player.getPlayerState();
    if (state == 1) {
        player.pauseVideo();
        document.getElementById('play-pause-btn').innerText = "DEVAM ET";
    } else {
        player.playVideo();
        document.getElementById('play-pause-btn').innerText = "DURDUR";
    }
}

function nextTrack() { player.nextVideo(); }
function prevTrack() { player.previousVideo(); }

function updateQueueUI() {
    const listDiv = document.getElementById('queue-list');
    if (!isPlaylist) {
        listDiv.innerHTML = "<p>Şu an tek bir şarkı çalıyor.</p>";
        return;
    }

    // YouTube'un içindeki listeyi çekiyoruz
    const playlistIds = player.getPlaylist();
    const currentIndex = player.getPlaylistIndex();
    
    if (playlistIds) {
        listDiv.innerHTML = "";
        playlistIds.forEach((id, index) => {
            const div = document.createElement('div');
            div.className = `queue-item ${index === currentIndex ? 'active' : ''}`;
            div.innerText = `${index + 1}. Şarkı (ID: ${id})`;
            div.onclick = () => player.playVideoAt(index);
            listDiv.appendChild(div);
        });
    }
}
