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
        
        // Daha stabil çalışan bir oynatıcı arayüzü
        container.innerHTML = `
            <div style="margin-top: 20px; background: #111; padding: 10px; border: 1px solid #ff0000; border-radius: 10px;">
                <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                        width="100%" height="200px" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media" 
                        allowfullscreen 
                        style="border-radius: 5px;"></iframe>
                <div style="margin-top: 10px;">
                    <a href="https://api.vevioz.com/@api/button/mp3/${videoId}" 
                       target="_blank" 
                       style="color: #ff0000; text-decoration: none; font-size: 14px; border: 1px solid #ff0000; padding: 5px 10px; border-radius: 5px;">
                       📥 ŞARKIYI İNDİR
                    </a>
                </div>
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
        history.unshift(id);
        if (history.length > 10) history.pop();
        localStorage.setItem('musicHistory', JSON.stringify(history));
        updateHistoryUI();
    }
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    let history = JSON.parse(localStorage.getItem('musicHistory') || "[]");
    historyList.innerHTML = history.length > 0 ? "<h3>SON ÇALINANLAR</h3>" : "<h3>Henüz kayıt yok.</h3>";
    
    history.forEach(id => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerText = `▶ Kayıtlı Şarkı: ${id}`;
        item.onclick = () => playMusic(id);
        historyList.appendChild(item);
    });
}
