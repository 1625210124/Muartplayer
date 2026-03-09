async function playMusic(manualLink = null) {
    const linkInput = document.getElementById('yt-link');
    const link = manualLink || linkInput.value;
    const status = document.getElementById('status');
    const container = document.getElementById('player-container');

    if (!link) return;

    try {
        // 1. Linki Temizle (Music -> WWW dönüşümü)
        // noembed bazen "music." uzantısında takılabiliyor, ana domaini kullanıyoruz.
        let cleanLink = link.replace("music.youtube.com", "www.youtube.com");
        const urlObj = new URL(cleanLink);
        let embedUrl = "";

        if (urlObj.searchParams.has("list")) {
            const listId = urlObj.searchParams.get("list");
            embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`;
        } else {
            const videoId = urlObj.searchParams.get("v") || urlObj.pathname.slice(1);
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }

        // 2. İsim Çekme (Daha sağlam bir mantıkla)
        status.innerText = "Dosya bilgileri okunuyor...";
        
        try {
            // noembed servisine temizlenmiş linki gönderiyoruz
            const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanLink)}`);
            const data = await response.json();
            
            // Eğer başlık gelmezse linkin sonundaki ID'yi göster ki tamamen boş kalmasın
            var title = data.title || "Gizli Kayıt - " + (urlObj.searchParams.get("v") || "Bilinmeyen");
        } catch (e) {
            var title = "Bağlantı Hatası (İsim Çekilemedi)";
        }

        // 3. Arayüzü Güncelle
        container.innerHTML = `<iframe src="${embedUrl}" width="100%" height="250px" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border: 1px solid #ff0000; border-radius: 10px;"></iframe>`;
        status.innerText = `Çalınan: ${title}`;

        if (!manualLink) {
            saveToHistory(link, title);
            linkInput.value = "";
        }

    } catch (error) {
        console.error("Hata:", error);
        status.innerText = "Hata: Link çözümlenemedi.";
    }
}
