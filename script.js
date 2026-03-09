<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Muart Player v2</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <h1>MUART PLAYER</h1>
        
        <div class="input-group">
            <input type="text" id="yt-link" placeholder="YouTube linkini buraya bırak...">
            <button onclick="playMusic()">OYNAT</button>
        </div>

        <div id="player-container">
            <p id="status">Bekleniyor...</p>
        </div>

        <div id="history-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0;">GEÇMİŞ</h3>
                <button onclick="clearHistory()" style="width: auto; padding: 5px 10px; font-size: 0.8rem; background: #333; color: #ff0000; border: 1px solid #ff0000;">LİSTEYİ SİL</button>
            </div>
            <div id="history-list"></div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
