let player;
let isPlaylist = false;

// YouTube API hazır olduğunda çalışır
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
    updateHistoryUI(); // Sayfa yüklenince geçmişi yükle
}

function loadMedia() {
    const link = document.getElementById('yt-link').value.trim();
    if (!link) return;

    const url = new URL(link.replace("music.", "www."));
    const listId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    // Hata önleyici: Önceki kuyruğu temizle
    isPlaylist = false;
    document.getElementById('queue-list').innerHTML = "";

    if (listId) {
        // LİSTE YÜKLEME
        isPlaylist = true;
        // Çalma listesi için manuel isim girişi iste
        let userTitle = prompt("Bu Oynatma Listesi için bir isim gir (Geçmişte böyle görünecek):", "Favori Listem");
        var finalTitle = userTitle || "Liste (ID: " + listId + ")";
        
        player.loadPlaylist({
            listType: 'playlist',
            list: listId,
            index: 0,
            suggestedQuality: 'default'
        });
        document.getElementById('status').innerText = "Liste yükleniyor...";
        saveToHistory(link, finalTitle); // Geçmişe kaydet
    } else if (videoId) {
        // TEK ŞARKI YÜKLEME
        player.loadVideoById(videoId);
        document.getElementById('status').innerText = "Şarkı yükleniyor...";
        // Tek şarkı için manuel isim istemiyoruz, API'den alacağız.
        // Ama geçmişe manuel isim ekleyemediğimiz için API ismini ana başlıkta gösteriyoruz.
    }
    linkInput.value = "";
}

function onPlayerStateChange(event) {
    // Şarkı başladığında veya değiştiğinde
    if (event.data == YT.PlayerState.PLAYING) {
        document.getElementById('play-pause-btn').innerHTML = "&#x23F8; DURDUR";
        
        // Dinamik İsim Yakalama: Ana durum alanında ID yerine şarkı ismini gösteriyoruz
        try {
            document.getElementById('status').innerText = "Çalınıyor: " + player.getVideoData().title;
        } catch (e) {
            document.getElementById('status').innerText = "Çalınıyor...";
        }
        
        updateQueueUI(); // Yan kuyruğu güncelle
    } else if (event.data == YT.PlayerState.PAUSED) {
        document.getElementById('play-pause-btn').innerHTML = "&#x25B6; DEVAM ET";
    }
}

function togglePlay() {
    const state = player.getPlayerState();
    if (state == 1) { // Çalıyor
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function nextTrack() { player.nextVideo(); }
function prevTrack() { player.previousVideo(); }

// Yan Kuyruk UI (Mevcut ID'li sürüm, daha şık)
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
            div.onclick = () => player.playVideoAt(index); // O şarkıya atla
            listDiv.appendChild(div);
        });
    }
}

// LOCAL STORAGE GEÇMİŞ (Geri Getirildi - V7)
function saveToHistory(link, title) {
    let history = JSON.parse(localStorage.getItem('muartHistoryV7') || "[]");
    history = history.filter(item => item.link !== link); // Aynı link varsa sil
    history.unshift({ link: link, title: title }); // Yeni kaydı başa ekle
    if (history.length > 20) history.pop(); // Son 20 kaydı tut
    localStorage.setItem('muartHistoryV7', JSON.stringify(history));
    updateHistoryUI();
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    let history = JSON.parse(localStorage.getItem('muartHistoryV7') || "[]");
    historyList.innerHTML = "";
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerText = "▶ " + item.title;
        div.onclick = () => loadHistoryMedia(item.link); // Geçmişten yükle
        historyList.appendChild(div);
    });
}

function loadHistoryMedia(link) {
    // Geçmişten tıklanan linki doğrudan yükler
    document.getElementById('yt-link').value = link;
    loadMedia();
}

function clearHistory() {
    if (confirm("Tüm geçmiş silinsin mi?")) {
        localStorage.removeItem('muartHistoryV7');
        updateHistoryUI();
    }
}
