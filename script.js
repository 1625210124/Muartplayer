function playMusic() {
    const link = document.getElementById('yt-link').value;
    const status = document.getElementById('status');
    const container = document.getElementById('player-container');

    // YouTube ID'sini ayıklayan sihirli regex (Normal ve Music linkleri için)
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11})/;
    const match = link.match(regex);

    if (match && match[1]) {
        const videoId = match[1];
        status.innerText = "Müzik yükleniyor...";
        
        // Ücretsiz bir API üzerinden ses akışını yakalıyoruz
        // Not: Bu tür API'ler zaman zaman değişebilir, bu en stabil olanlardan biridir.
        const audioUrl = `https://api.vevioz.com/@api/button/mp3/${videoId}`;
        
        container.innerHTML = `
            <div style="margin-top: 20px; background: #1e1e1e; padding: 15px; border-radius: 15px;">
                <p>Şu an çalınıyor (veya indirmeye hazır):</p>
                <iframe src="${audioUrl}" width="100%" height="150px" style="border:none; border-radius:10px;"></iframe>
                <p style="font-size: 12px; color: #888; margin-top: 10px;">
                    Not: Arka planda çalmak için tarayıcıda "Masaüstü Sitesi" modunu açman gerekebilir.
                </p>
            </div>
        `;
    } else {
        alert("Lütfen geçerli bir YouTube veya YouTube Music linki girin!");
        status.innerText = "Hatalı link.";
    }
}
