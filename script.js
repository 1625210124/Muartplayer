document.addEventListener('DOMContentLoaded', updateHistoryUI);

async function playMusic(manualLink = null) {
    const linkInput = document.getElementById('yt-link');
    const link = manualLink || linkInput.value;
    const container = document.getElementById('player-container');
    const status = document.getElementById('status');

    if (!link) return;

    try {
        const urlObj = new URL(link);
        let embedUrl = "";
        let title = "Bilinmeyen Kayıt";

        // 1. Oynatıcı Linkini Hazırlama
        if (urlObj.searchParams.has("list")) {
            const listId = urlObj.searchParams.get("list");
            embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`;
        } else if (urlObj.searchParams.has("v") || urlObj.hostname === "youtu.be") {
            const videoId = urlObj.searchParams.get("v") || urlObj.pathname.slice(1);
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }

        // 2. İsmi Yakalama (Sihirli Kısım)
        status.innerText = "İsim aranıyor...";
        try {
            // YouTube'un oEmbed servisini kullanarak başlığı çekiyoruz
            const response = await fetch(`https://noembed.com/embed?url=${link}`);
            const data = await response.json();
            title = data.title || "İsimsiz İçerik";
        } catch (e) {
            title = "Gizli Kayıt";
        }

        // Oynatıcıyı yükle
        container.innerHTML = `<iframe src="${embedUrl}" width="100%" height="250px" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border: 1px solid #ff0000; border-radius: 10px;"></iframe>`;
        status.innerText = `Çalınan: ${title}`;

        // Geçmişe isimle birlikte kaydet
        if (!manualLink) {
            saveToHistory(link, title);
            linkInput.value = "";
        }

    } catch (error) {
        alert("Link okunamadı!");
    }
}

function saveToHistory(link, title) {
    let history = JSON.parse(localStorage.getItem('musicHistoryV4') || "[]");
    if (!history.some(item => item.link === link)) {
        history.unshift({ link: link, title: title });
        if (history.length > 10) history.pop();
        localStorage.setItem('musicHistoryV4', JSON.stringify(history));
        updateHistoryUI();
    }
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    let history = JSON.parse(localStorage.getItem('musicHistoryV4') || "[]");
    historyList.innerHTML = history.length > 0 ? "<h3>SON ÇALINANLAR</h3>" : "";
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerText = `▶ ${item.title}`;
        div.onclick = () => playMusic(item.link);
        historyList.appendChild(div);
    });
}
