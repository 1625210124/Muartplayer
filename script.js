document.addEventListener('DOMContentLoaded', updateHistoryUI);

async function playMusic(manualLink = null) {
    const linkInput = document.getElementById('yt-link');
    const link = manualLink || linkInput.value.trim();
    const status = document.getElementById('status');
    const container = document.getElementById('player-container');

    if (!link) return;

    // Önceki oynatıcıyı ve hataları temizle
    container.innerHTML = "";
    status.innerText = "Bağlantı kuruluyor...";

    try {
        let cleanLink = link.replace("music.youtube.com", "www.youtube.com");
        let urlObj = new URL(cleanLink);
        let embedUrl = "";
        let idForFallback = "";

        // Link tipini belirle
        if (urlObj.searchParams.has("list")) {
            const listId = urlObj.searchParams.get("list");
            idForFallback = listId;
            embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`;
        } else {
            const videoId = urlObj.searchParams.get("v") || urlObj.pathname.slice(1);
            idForFallback = videoId;
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }

        // --- MANUEL İSİM SORGUSU ---
        let finalTitle = "";
        if (!manualLink) {
            // Sadece yeni link eklerken sorar, geçmişten tıklarken sormaz
            let userTitle = prompt("Bu şarkı/liste için bir isim gir (Geçmişte böyle görünecek):", "Yeni Kayıt");
            finalTitle = userTitle || ("Kayıt: " + idForFallback);
        }

        // Oynatıcıyı yükle
        container.innerHTML = `
            <iframe src="${embedUrl}" width="100%" height="250px" frameborder="0" 
            allow="autoplay; encrypted-media" allowfullscreen 
            style="border: 2px solid #ff0000; border-radius: 10px; background: #000;"></iframe>
        `;
        
        if (finalTitle) status.innerText = "Çalınıyor: " + finalTitle;

        // Geçmişe kaydet
        if (!manualLink) {
            saveToHistory(link, finalTitle);
            linkInput.value = "";
        }

    } catch (err) {
        status.innerText = "Hata! Geçersiz bir link girdin.";
        console.error(err);
    }
}

function saveToHistory(link, title) {
    let history = JSON.parse(localStorage.getItem('muartHistoryV6') || "[]");
    history = history.filter(item => item.link !== link);
    history.unshift({ link: link, title: title });
    if (history.length > 20) history.pop();
    localStorage.setItem('muartHistoryV6', JSON.stringify(history));
    updateHistoryUI();
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    let history = JSON.parse(localStorage.getItem('muartHistoryV6') || "[]");
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
        localStorage.removeItem('muartHistoryV6');
        updateHistoryUI();
    }
}
