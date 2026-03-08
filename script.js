// Sayfa yüklendiğinde geçmişi yükle
document.addEventListener('DOMContentLoaded', updateHistoryUI);

function playMusic(manualId = null) {
    const linkInput = document.getElementById('yt-link');
    const link = manualId ? `https://www.youtube.com/watch?v=${manualId}` : linkInput.value;
    const status = document.getElementById('status');
    const container = document.getElementById('player-container');

    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11})/;
    const match = link.match(regex);

    if (match && match[1]) {
        const videoId = match[1];
        status.innerText = "Ruhun müzikle doluyor...";
        
        // Alternatif ve daha hızlı bir API arayüzü
        const audioUrl = `https://api.vevioz.com/@api/button/mp3/${videoId}`;
        
        container.innerHTML = `
            <div style="margin-top: 20px; background: #111; padding: 10px; border: 1px solid #ff0000; border-radius: 10px;">
                <iframe src="${audioUrl}" width="100%" height="150px" style="border:none; border-radius: 5px;"></iframe>
                <p style="font-size: 10px; color: #555; margin-top: 5px;">Masaüstü modunda arka planda çalabilir.</p>
            </div>
        `;

        if (!manualId) {
            saveToHistory(videoId);
            linkInput.value = ""; 
        }
    } else {
        alert("Geçersiz link! Lütfen bir YouTube Music linki gir.");
    }
}

function saveToHistory(id) {
    let history = JSON.parse(localStorage.getItem('musicHistory') || "[]");
    if (!history.includes(id)) {
        history.unshift(id); // Yeni şarkıyı başa ekle
        if (history.length > 10) history.pop(); // Son 10 şarkıyı tut
        localStorage.setItem('musicHistory', JSON.stringify(history));
        updateHistoryUI();
    }
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    let history = JSON.parse(localStorage.getItem('musicHistory') || "[]");
    
    if (history.length === 0) {
        historyList.innerHTML = "<h3>Henüz kayıt yok.</h3>";
        return;
    }

    historyList.innerHTML = "<h3>SON ÇALINANLAR</h3>";
    history.forEach(id => {
        const item = document.createElement('div');
        item.className = 'history-item'; // CSS'deki stilimizi kullanıyoruz
        item.innerText = `▶ Şarkı Kodu: ${id}`;
        item.onclick = () => playMusic(id);
        historyList.appendChild(item);
    });
}
