document.addEventListener('DOMContentLoaded', updateHistoryUI);

async function playMusic(manualLink = null) {
    const linkInput = document.getElementById('yt-link');
    const link = manualLink || linkInput.value.trim();
    const status = document.getElementById('status');
    const container = document.getElementById('player-container');

    if (!link) return;

    // Hata önleyici: Her yeni aramada içeriği sıfırla
    container.innerHTML = "";
    status.innerText = "Yükleniyor...";

    try {
        // Linki temizle ve analiz et
        let cleanLink = link.replace("music.youtube.com", "www.youtube.com");
        let urlObj;
        
        try {
            urlObj = new URL(cleanLink);
        } catch (e) {
            status.innerText = "Geçersiz link formatı!";
            return;
        }

        let embedUrl = "";
        let idForFallback = "";

        if (urlObj.searchParams.has("list")) {
            const listId = urlObj.searchParams.get("list");
            idForFallback = listId;
            embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`;
        } else {
            const videoId = urlObj.searchParams.get("v") || urlObj.pathname.slice(1);
            idForFallback = videoId;
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }

        // İsim Çekme Operasyonu
        let finalTitle = "";
        try {
            const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanLink)}`);
            const data = await response.json();
            finalTitle = data.title || "Müzik: " + idForFallback;
        } catch (e) {
            finalTitle = "Kayıt: " + idForFallback;
        }

        // Oynatıcıyı bas
        status.innerText = "Çalınıyor: " + finalTitle;
        container.innerHTML = `
            <iframe src="${embedUrl}" width="100%" height="250px" frameborder="0" 
            allow="autoplay; encrypted-media" allowfullscreen 
            style="border: 2px solid #ff0000; border-radius: 10px; background: #000;"></iframe>
        `;

        if (!manualLink) {
            saveToHistory(link, finalTitle);
            linkInput.value = "";
        }

    } catch (err) {
        status.innerText = "Sistem hatası! Sayfayı yenileyin.";
        console.error(err);
    }
}

function saveToHistory(link, title) {
    let history = JSON.parse(localStorage.getItem('muartHistoryV5') || "[]");
    // Aynı link varsa sil ki en başa gelsin
    history = history.filter(item => item.link !== link);
    history.unshift({ link: link, title: title });
    if (history.length > 15) history.pop();
    localStorage.setItem('muartHistoryV5', JSON.stringify(history));
    updateHistoryUI();
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    let history = JSON.parse(localStorage.getItem('muartHistoryV5') || "[]");
    historyList.innerHTML = "";
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerText = "▶ " + item.title;
        div.onclick = () => playMusic(item.link);
        historyList.appendChild(div);
    });
}

function clearHistory() {
    if (confirm("Tüm geçmiş silinsin mi?")) {
        localStorage.removeItem('muartHistoryV5');
        updateHistoryUI();
    }
}
