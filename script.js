let player;
let queue = [];
let currentIndex = -1;

// YouTube API hazır olduğunda çalışır
function onYouTubeIframeAPIReady() {
    player = new YT.Player('main-player', {
        height: '100%',
        width: '100%',
        playerVars: { 'autoplay': 1, 'controls': 1 },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        nextTrack(); // Şarkı bitince sonrakine geç
    }
}

async function addToQueue() {
    const linkInput = document.getElementById('yt-link');
    const link = linkInput.value.trim();
    if (!link) return;

    const urlObj = new URL(link.replace("music.", "www."));
    const videoId = urlObj.searchParams.get("v") || urlObj.pathname.slice(1);
    
    let title = prompt("Şarkı İsmi:", "Yeni Şarkı") || "Bilinmeyen Şarkı";

    queue.push({ id: videoId, title: title });
    linkInput.value = "";
    
    updateQueueUI();
    
    if (currentIndex === -1) {
        playTrack(0); // İlk şarkıysa hemen başlat
    }
}

function playTrack(index) {
    if (index >= 0 && index < queue.length) {
        currentIndex = index;
        player.loadVideoById(queue[currentIndex].id);
        document.getElementById('status').innerText = "Çalıyor: " + queue[currentIndex].title;
        updateQueueUI();
    }
}

function togglePlay() {
    const state = player.getPlayerState();
    const btn = document.getElementById('play-pause-btn');
    if (state == 1) { // 1 = Çalıyor
        player.pauseVideo();
        btn.innerText = "DEVAM ET";
    } else {
        player.playVideo();
        btn.innerText = "DURDUR";
    }
}

function nextTrack() {
    if (currentIndex < queue.length - 1) {
        playTrack(currentIndex + 1);
    }
}

function prevTrack() {
    if (currentIndex > 0) {
        playTrack(currentIndex - 1);
    }
}

function updateQueueUI() {
    const listDiv = document.getElementById('queue-list');
    listDiv.innerHTML = "";
    queue.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `queue-item ${index === currentIndex ? 'active' : ''}`;
        div.innerText = `${index + 1}. ${item.title}`;
        div.onclick = () => playTrack(index);
        listDiv.appendChild(div);
    });
}

function clearQueue() {
    if (confirm("Liste temizlensin mi?")) {
        queue = [];
        currentIndex = -1;
        player.stopVideo();
        updateQueueUI();
        document.getElementById('status').innerText = "Liste temizlendi.";
    }
}
