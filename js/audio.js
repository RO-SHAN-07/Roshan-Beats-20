// Audio handling, playback, visualizer, equalizer
const audio = document.getElementById('audio');
const visualizer = document.getElementById('visualizer');
const ctx = visualizer.getContext('2d');

let audioContext, analyser, dataArray, bufferLength;
let visualizerType = 'spectrum'; // spectrum, waveform, circular
let songs = [];
let currentSongIndex = 0;
let playlists = [];
let currentPlaylist = null;
let currentPlaylistDetail = null;
let queue = [];
let isPlaying = false;
let isShuffled = false;
let isLooped = false;
let volume = 0.7;
let currentTheme = 'purple';

// IndexedDB setup
const dbName = 'RoshanBeatsDB';
const dbVersion = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('songs')) {
                db.createObjectStore('songs', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('playlists')) {
                db.createObjectStore('playlists', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('user')) {
                db.createObjectStore('user', { keyPath: 'id' });
            }
        };
    });
}

// Load data from IndexedDB
async function loadData() {
    const db = await openDB();
    const tx = db.transaction(['songs', 'metadata', 'playlists'], 'readonly');
    const songsStore = tx.objectStore('songs');
    const metadataStore = tx.objectStore('metadata');
    const playlistsStore = tx.objectStore('playlists');

    songs = await new Promise(resolve => {
        const request = songsStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    const metadata = await new Promise(resolve => {
        const request = metadataStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    playlists = await new Promise(resolve => {
        const request = playlistsStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });

    // Merge metadata with songs
    songs.forEach(song => {
        const meta = metadata.find(m => m.id === song.id);
        if (meta) Object.assign(song, meta);
    });

    updateSongList();
    updatePlaylistList();
}

// Save data to IndexedDB
async function saveSong(song) {
    const db = await openDB();
    const tx = db.transaction(['songs', 'metadata'], 'readwrite');
    tx.objectStore('songs').put(song);
    tx.objectStore('metadata').put({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        cover: song.cover
    });
}

async function savePlaylist(playlist) {
    const db = await openDB();
    const tx = db.transaction('playlists', 'readwrite');
    tx.objectStore('playlists').put(playlist);
}

// ID3 Tag parsing (simplified)
function parseID3Tags(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const buffer = e.target.result;
            const data = new Uint8Array(buffer);
            let title = file.name.replace(/\.[^/.]+$/, '');
            let artist = 'Unknown Artist';
            let cover = null;

            // Simple ID3v2 parsing
            if (data[0] === 73 && data[1] === 68 && data[2] === 51) { // 'ID3'
                let offset = 10;
                while (offset < data.length - 10) {
                    const frameId = String.fromCharCode(data[offset], data[offset+1], data[offset+2], data[offset+3]);
                    const size = (data[offset+4] << 21) | (data[offset+5] << 14) | (data[offset+6] << 7) | data[offset+7];
                    if (frameId === 'TIT2') {
                        title = new TextDecoder('utf-8').decode(data.slice(offset+10, offset+10+size)).replace(/\0/g, '');
                    } else if (frameId === 'TPE1') {
                        artist = new TextDecoder('utf-8').decode(data.slice(offset+10, offset+10+size)).replace(/\0/g, '');
                    } else if (frameId === 'APIC') {
                        // Extract cover (simplified)
                        const mimeStart = offset + 11;
                        let mimeEnd = mimeStart;
                        while (data[mimeEnd] !== 0) mimeEnd++;
                        const mime = new TextDecoder('utf-8').decode(data.slice(mimeStart, mimeEnd));
                        const picStart = mimeEnd + 3;
                        const picData = data.slice(picStart, offset+10+size);
                        cover = URL.createObjectURL(new Blob([picData], { type: mime }));
                    }
                    offset += 10 + size;
                    if (frameId === '\0\0\0\0') break;
                }
            }

            resolve({ title, artist, cover });
        };
        reader.readAsArrayBuffer(file.slice(0, 1024 * 10)); // Read first 10KB for tags
    });
}

// Import files
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('fab-import').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    let imported = 0;
    for (const file of files) {
        if (file.type.startsWith('audio/')) {
            try {
                const metadata = await parseID3Tags(file);
                const song = {
                    id: Date.now() + Math.random(),
                    file: file,
                    url: URL.createObjectURL(file),
                    title: metadata.title,
                    artist: metadata.artist,
                    duration: 0, // Will be set when loaded
                    cover: metadata.cover || generateCover(),
                    album: 'Unknown Album'
                };
                songs.push(song);
                await saveSong(song);
                imported++;
            } catch (error) {
                console.error('Error importing file:', file.name, error);
                // TODO: Show error message via UI
                console.error(`Failed to import ${file.name}: ${error.message}`);
            }
        } else {
            // TODO: Show error message via UI
            console.error(`${file.name} is not a supported audio format.`);
        }
    }
    updateSongList();
    if (songs.length > 0) {
        showScreen('home-screen');
    }
    if (imported > 0) {
        // TODO: Show success message via UI
        console.log(`Imported ${imported} songs successfully.`);
    }
});

function generateCover() {
    // Generate a dynamic gradient cover
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 200, 200);
    gradient.addColorStop(0, '#8a2be2');
    gradient.addColorStop(1, '#ff1493');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 200);
    return canvas.toDataURL();
}

// Update song list
function updateSongList() {
    const songList = document.getElementById('song-list');
    songList.innerHTML = '';
    if (songs.length === 0) {
        songList.innerHTML = '<div class="empty-state"><h3>No songs yet</h3><p>Import some music to get started.</p></div>';
    } else {
        songs.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.innerHTML = `
                <div class="song-cover" style="background-image: url(${song.cover})"></div>
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                </div>
            `;
            item.addEventListener('click', () => playSong(index));
            songList.appendChild(item);
        });
    }
}

// Play song
function playSong(index) {
    currentSongIndex = index;
    const song = songs[index];
    audio.src = song.url;
    document.getElementById('track-title').textContent = song.title;
    document.getElementById('track-artist').textContent = song.artist;
    document.getElementById('album-art').style.backgroundImage = `url(${song.cover})`;
    document.getElementById('player-background').style.backgroundImage = `url(${song.cover})`;
    updateMiniPlayer();
    showScreen('player-screen');
    audio.play();
    isPlaying = true;
    updatePlayPauseBtn();
    initVisualizer();
    updateQueue();
}

function updateQueue() {
    queue = songs.slice(currentSongIndex + 1);
    if (isLooped) {
        queue = queue.concat(songs.slice(0, currentSongIndex));
    }
    renderQueue();
}

function renderQueue() {
    const queueList = document.getElementById('queue-list');
    queueList.innerHTML = '';
    if (queue.length === 0) {
        queueList.innerHTML = '<p>No more songs in queue</p>';
    } else {
        queue.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.innerHTML = `
                <div class="song-cover" style="background-image: url(${song.cover})"></div>
                <div class="song-info">
                    <h4>${song.title}</h4>
                    <p>${song.artist}</p>
                </div>
            `;
            item.addEventListener('click', () => {
                playSong(songs.indexOf(song));
            });
            queueList.appendChild(item);
        });
    }
}

// Update mini player
function updateMiniPlayer() {
    const song = songs[currentSongIndex];
    document.getElementById('mini-title').textContent = song.title;
    document.getElementById('mini-artist').textContent = song.artist;
    document.getElementById('mini-cover').style.backgroundImage = `url(${song.cover})`;
    document.getElementById('mini-player').style.display = 'flex';
}

// Theme switching
document.getElementById('theme-purple').addEventListener('click', () => {
    document.body.className = 'theme-purple';
    currentTheme = 'purple';
});

document.getElementById('theme-ice').addEventListener('click', () => {
    document.body.className = 'theme-ice';
    currentTheme = 'ice';
});

// Shuffle and Loop
document.getElementById('shuffle-btn').addEventListener('click', () => {
    isShuffled = !isShuffled;
    document.getElementById('shuffle-btn').classList.toggle('active', isShuffled);
});

document.getElementById('loop-btn').addEventListener('click', () => {
    isLooped = !isLooped;
    document.getElementById('loop-btn').classList.toggle('active', isLooped);
});

// Controls
document.getElementById('play-pause-btn').addEventListener('click', () => {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
    updatePlayPauseBtn();
});

document.getElementById('mini-play-pause').addEventListener('click', () => {
    document.getElementById('play-pause-btn').click();
});

function updatePlayPauseBtn() {
    const btn = document.getElementById('play-pause-btn');
    const miniBtn = document.getElementById('mini-play-pause');
    btn.textContent = isPlaying ? '⏸' : '▶';
    miniBtn.textContent = isPlaying ? '⏸' : '▶';
    document.getElementById('album-art').classList.toggle('playing', isPlaying);
}

document.getElementById('next-btn').addEventListener('click', () => {
    nextSong();
});

document.getElementById('mini-next').addEventListener('click', () => {
    nextSong();
});

function nextSong() {
    if (isShuffled) {
        currentSongIndex = Math.floor(Math.random() * songs.length);
    } else {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
    }
    playSong(currentSongIndex);
    updateQueue();
}

document.getElementById('prev-btn').addEventListener('click', () => {
    prevSong();
});

document.getElementById('mini-prev').addEventListener('click', () => {
    prevSong();
});

function prevSong() {
    currentSongIndex = currentSongIndex > 0 ? currentSongIndex - 1 : songs.length - 1;
    playSong(currentSongIndex);
}

// Seek bar
const seekBar = document.getElementById('seek-bar');
seekBar.addEventListener('click', (e) => {
    const rect = seekBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
});

audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    document.getElementById('seek-fill').style.width = `${percent}%`;
});

// Volume
audio.volume = volume;
const volumeBar = document.getElementById('volume-bar');
volumeBar.addEventListener('click', (e) => {
    const rect = volumeBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    volume = percent;
    audio.volume = volume;
    document.getElementById('volume-fill').style.width = `${percent * 100}%`;
});

document.getElementById('mute-btn').addEventListener('click', () => {
    audio.muted = !audio.muted;
    document.getElementById('mute-btn').textContent = audio.muted ? '🔇' : '🔊';
});

// Visualizer
function initVisualizer() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 256;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }
    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, visualizer.width, visualizer.height);

    if (visualizerType === 'spectrum') {
        const barWidth = (visualizer.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * visualizer.height;
            ctx.fillStyle = `hsl(${i * 360 / bufferLength}, 100%, 50%)`;
            ctx.fillRect(x, visualizer.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    } else if (visualizerType === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#8a2be2';
        ctx.beginPath();

        const sliceWidth = visualizer.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * visualizer.height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();
    } else if (visualizerType === 'circular') {
        const centerX = visualizer.width / 2;
        const centerY = visualizer.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        ctx.strokeStyle = '#8a2be2';
        ctx.lineWidth = 3;

        for (let i = 0; i < bufferLength; i++) {
            const angle = (i / bufferLength) * Math.PI * 2;
            const barHeight = (dataArray[i] / 255) * 50;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
}

// Equalizer
let filters = [];
const eqPresets = {
    normal: [0, 0, 0, 0, 0],
    bass: [5, 3, 0, -2, -3],
    pop: [-2, 1, 3, 2, -1],
    rock: [3, 1, -1, 1, 3],
    jazz: [2, 1, -1, 0, 2],
    classical: [0, 0, 0, 0, 0]
};

function initEqualizer() {
    if (!audioContext) return;
    filters = [];
    for (let i = 0; i < 5; i++) {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = [60, 250, 1000, 4000, 16000][i];
        filter.Q.value = 1;
        filter.gain.value = 0;
        filters.push(filter);
    }
    // Connect filters
    const source = audioContext.createMediaElementSource(audio);
    source.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(audioContext.destination);
}

document.getElementById('eq-presets').addEventListener('click', (e) => {
    if (e.target.classList.contains('eq-preset')) {
        const preset = e.target.dataset.preset;
        const gains = eqPresets[preset];
        if (!filters.length) initEqualizer();
        filters.forEach((filter, i) => {
            filter.gain.value = gains[i];
        });
    }
});

document.getElementById('visualizer-presets').addEventListener('click', (e) => {
    if (e.target.classList.contains('eq-preset')) {
        visualizerType = e.target.dataset.viz;
    }
});