document.addEventListener('DOMContentLoaded', updateHistoryUI);

function playMusic(manualLink = null) {
    const linkInput = document.getElementById('yt-link');
    const link = manualLink || linkInput.value;
    const container = document.getElementById('player-container');

    if (!link) {
        alert("Boş link gönderemezsin!");
        return;
    }

    try {
        // Yeni taktik: Linki JavaScript'in kendi URL motoruyla analiz ediyoruz
        const urlObj = new URL(link);
        let embedUrl = "";
        let saveLabel = "";

        // 1. Durum: Linkin içinde bir Oynatma Listesi (Playlist) var mı?
        if (urlObj.searchParams.has("list")) {
            const listId = urlObj.searchParams.get("list");
            // Oynatma listeleri için özel YouTube embed linki
            embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`;
            saveLabel = `Liste: ${listId.substring(0, 8)}...`;
        } 
        // 2. Durum: Link normal bir şarkı/video mu?
        else if (urlObj.searchParams.has("v")) {
            const videoId = urlObj.searchParams.get("v");
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            saveLabel = `Şarkı: ${videoId.substring(0, 8)}...`;
        } 
        // 3. Durum: youtu.be şeklindeki kısa linkler
        else if (urlObj.hostname === "youtu.be") {
            const videoId = urlObj.pathname.slice(1);
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            saveLabel = `Şarkı: ${videoId.substring(0, 8)}...`;
        } 
        else {
            throw new Error("Bu linkte ne liste ne de video bulabildim.");
        }

        // Temizlenmiş oynatıcıyı ekrana bas (İndirme butonu kaldırıldı)
        container.innerHTML = `
            <div style="margin-top: 20px; background: #111; padding: 10px; border: 1px solid #ff0000; border-radius: 10px;">
                <iframe src="${embedUrl}" 
                        width="100%" height="250px" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media" 
                        allowfullscreen 
                        style="border-radius: 5px;"></iframe>
            </div>
        `;

        // Geçmişe kaydet
        if (!manualLink) {
            saveToHistory(link, saveLabel);
            linkInput.value = ""; // Kutuyu temizle
        }

    } catch (error) {
        alert("Link okunamadı! YouTube veya YT Music linki olduğundan emin ol.");
        console.error("Hata:", error);
    }
}

// GEÇMİŞ HAFIZASI (Sadeleştirilmiş)
function saveToHistory(fullLink, label) {
    let history = JSON.parse(localStorage.getItem('musicHistoryV3') || "[]");
    
    if (!history.some(item => item.link === fullLink)) {
        history.unshift({ link: fullLink, label: label });
        if (history.length > 10) history.pop(); 
        localStorage.setItem('musicHistoryV3', JSON.stringify(history));
        updateHistoryUI();
    }
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    let history = JSON.parse(localStorage.getItem('musicHistoryV3') || "[]");
    historyList.innerHTML = history.length > 0 ? "<h3>SON ÇALINANLAR</h3>" : "<h3>Henüz kayıt yok.</h3>";
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerText = `▶ ${item.label}`;
        div.onclick = () => playMusic(item.link);
        historyList.appendChild(div);
    });
}
