document.addEventListener('DOMContentLoaded', updateHistoryUI);

function playMusic(manualLink = null) {
    const linkInput = document.getElementById('yt-link');
    const link = manualLink || linkInput.value;
    const status = document.getElementById('status');
    const container = document.getElementById('player-container');

    if (!link) {
        alert("Lütfen bir link girin!");
        return;
    }

    try {
        // 1. ADIM: DEBUG VE LİNK PARÇALAMA
        // Eskisi gibi karmaşık regex yerine URL objesi ile parametreleri nokta atışı buluyoruz.
        const url = new URL(link);
        let videoId = url.searchParams.get("v");
        let playlistId = url.searchParams.get("list");

        // youtu.be formatı için özel kontrol
        if (url.hostname.includes("youtu.be")) {
            videoId = url.pathname.slice(1);
        }

        if (!videoId && !playlistId) {
            throw new Error("ID veya Liste bulunamadı");
        }

        status.innerText = "Bağlantı başarılı, player yükleniyor...";

        // 2. ADIM: YOUTUBE EMBED LİNKİNİ OLUŞTURMA
        let embedUrl = "";
        if (playlistId && videoId) {
            // Hem video hem oynatma listesi varsa
            embedUrl = `https://www.youtube.com/embed/${videoId}?list=${playlistId}&autoplay=1`;
        } else if (playlistId) {
            // Sadece oynatma listesi linki atıldıysa
            embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
        } else {
            // Sadece tek şarkıysa
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }

        // 3. ADIM: OYNATICIYI VE İNDİRME BUTONUNU EKRANA BASMA
        container.innerHTML = `
            <div style="margin-top: 20px; background: #111; padding: 10px; border: 1px solid #ff0000; border-radius: 10px;">
                <iframe src="${embedUrl}" 
                        width="100%" height="250px" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media" 
                        allowfullscreen 
                        style="border-radius: 5px;"></iframe>
                
                ${videoId ? `
                <div style="margin-top: 15px;">
                    <a href="https://ytmp3.cc/en13/?url=https://www.youtube.com/watch?v=${videoId}" 
                       target="_blank" 
                       style="display: inline-block; background: #ff0000; color: #000; font-family: 'VT323', monospace; text-decoration: none; font-size: 1.2rem; font-weight: bold; padding: 10px 15px; border-radius: 5px; width: 80%; box-sizing: border-box;">
                       📥 MP3 OLARAK İNDİR
                    </a>
                    <p style="font-size: 0.7rem; color: #666; margin-top: 8px;">*İndirme sayfası güvenlik engellerini aşmak için yeni sekmede açılır.</p>
                </div>` : '<p style="font-size: 0.8rem; color: #888; margin-top: 10px;">(Tüm listeyi indirmek desteklenmiyor, oynatabilirsiniz)</p>'}
            </div>
        `;

        // 4. ADIM: GEÇMİŞE KAYDETME
        if (!manualLink) {
            let saveLabel = playlistId ? `Liste: ${playlistId.substring(0,8)}...` : `Şarkı: ${videoId}`;
            saveToHistory(link, saveLabel);
            linkInput.value = ""; // Kutuyu temizle
        }

    } catch (error) {
        console.error("Hata Detayı:", error);
        alert("Link çözülemedi! Lütfen kopyaladığın linkin tam olduğundan emin ol.");
        status.innerText = "Hata: Geçersiz link.";
    }
}

// GEÇMİŞ HAFIZASI (LİNK TABANLI)
function saveToHistory(fullLink, label) {
    let history = JSON.parse(localStorage.getItem('musicHistoryV2') || "[]");
    
    // Aynı link zaten varsa tekrar ekleme
    if (!history.some(item => item.link === fullLink)) {
        history.unshift({ link: fullLink, label: label });
        if (history.length > 10) history.pop(); // Son 10 kaydı tut
        localStorage.setItem('musicHistoryV2', JSON.stringify(history));
        updateHistoryUI();
    }
}

function updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    let history = JSON.parse(localStorage.getItem('musicHistoryV2') || "[]");
    historyList.innerHTML = history.length > 0 ? "<h3>SON ÇALINANLAR</h3>" : "<h3>Henüz kayıt yok.</h3>";
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerText = `▶ ${item.label}`;
        div.onclick = () => playMusic(item.link);
        historyList.appendChild(div);
    });
}
