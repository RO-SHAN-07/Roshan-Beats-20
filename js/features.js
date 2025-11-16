// Additional features like chat, map, calendar, etc.
// Search functions
function populateSearchFilters() {
    const artistSelect = document.getElementById('filter-artist');
    const albumSelect = document.getElementById('filter-album');
    const genreSelect = document.getElementById('filter-genre');
    artistSelect.innerHTML = '<option value="">All Artists</option>';
    albumSelect.innerHTML = '<option value="">All Albums</option>';
    genreSelect.innerHTML = '<option value="">All Genres</option>';
    const artists = [...new Set(songs.map(s => s.artist))];
    const albums = [...new Set(songs.map(s => s.album))];
    const genres = [...new Set(songs.map(s => s.genre || 'Unknown'))];
    artists.forEach(artist => {
        artistSelect.innerHTML += `<option value="${artist}">${artist}</option>`;
    });
    albums.forEach(album => {
        albumSelect.innerHTML += `<option value="${album}">${album}</option>`;
    });
    genres.forEach(genre => {
        genreSelect.innerHTML += `<option value="${genre}">${genre}</option>`;
    });
}

document.getElementById('advanced-search-input').addEventListener('input', performSearch);
document.getElementById('apply-filters').addEventListener('click', performSearch);

function performSearch() {
    const query = document.getElementById('advanced-search-input').value.toLowerCase();
    const artist = document.getElementById('filter-artist').value;
    const album = document.getElementById('filter-album').value;
    const genre = document.getElementById('filter-genre').value;
    const year = document.getElementById('filter-year').value;
    const results = songs.filter(song => {
        return (song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query)) &&
               (!artist || song.artist === artist) &&
               (!album || song.album === album) &&
               (!genre || song.genre === genre) &&
               (!year || song.year == year);
    });
    displaySearchResults(results);
}

function displaySearchResults(results) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    if (results.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No results found</h3><p>Try different search terms or filters.</p></div>';
    } else {
        results.forEach(song => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.innerHTML = `
                <div class="song-cover" style="background-image: url(${song.cover})"></div>
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                </div>
            `;
            item.addEventListener('click', () => playSong(songs.indexOf(song)));
            container.appendChild(item);
        });
    }
}

// Chat functions
document.getElementById('emoji-btn').addEventListener('click', () => {
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
});

document.querySelectorAll('.emoji').forEach(emoji => {
    emoji.addEventListener('click', () => {
        document.getElementById('chat-input').value += emoji.dataset.emoji;
        document.getElementById('emoji-picker').style.display = 'none';
    });
});

document.getElementById('attach-btn').addEventListener('click', () => {
    document.getElementById('file-input-chat').click();
});

document.getElementById('file-input-chat').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        sendMessage(`Attached: ${file.name}`, 'sent');
    }
});

document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
        sendMessage(input.value, 'sent');
        input.value = '';
        // Simulate response
        setTimeout(() => sendMessage('Thanks for your message!', 'received'), 1000);
    }
});

function sendMessage(text, type) {
    const messages = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

// Gallery functions
document.getElementById('upload-media').addEventListener('click', () => {
    document.getElementById('media-input').click();
});

document.getElementById('media-input').addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        const url = URL.createObjectURL(file);
        addMediaToGallery(url, file.type);
    });
});

function addMediaToGallery(url, type) {
    const grid = document.getElementById('media-grid');
    const item = document.createElement('div');
    item.className = 'media-item';
    if (type.startsWith('image/')) {
        item.innerHTML = `<img src="${url}" alt="Media">`;
    } else if (type.startsWith('video/')) {
        item.innerHTML = `<video src="${url}" controls></video>`;
    } else if (type.startsWith('audio/')) {
        item.innerHTML = `<audio src="${url}" controls></audio>`;
    }
    grid.appendChild(item);
}

// Map functions
function initMap() {
    const canvas = document.getElementById('map-canvas');
    const ctx = canvas.getContext('2d');
    // Draw simple map background
    ctx.fillStyle = '#e0f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw some roads
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(250, 50);
    ctx.moveTo(50, 100);
    ctx.lineTo(250, 100);
    ctx.moveTo(150, 50);
    ctx.lineTo(150, 350);
    ctx.stroke();
    drawMapElements();
}

function drawMapElements() {
    const canvas = document.getElementById('map-canvas');
    const ctx = canvas.getContext('2d');
    // Draw pins
    mapPins.forEach(pin => {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillText(pin.label, pin.x + 10, pin.y - 5);
    });
    // Draw routes
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    mapRoutes.forEach(route => {
        ctx.beginPath();
        ctx.moveTo(route.start.x, route.start.y);
        ctx.lineTo(route.end.x, route.end.y);
        ctx.stroke();
    });
}

document.getElementById('add-pin').addEventListener('click', () => {
    const label = prompt('Enter pin label:');
    if (label) {
        const x = Math.random() * 250 + 25;
        const y = Math.random() * 300 + 50;
        mapPins.push({ x, y, label });
        drawMapElements();
    }
});

document.getElementById('add-route').addEventListener('click', () => {
    if (mapPins.length >= 2) {
        const start = mapPins[mapPins.length - 2];
        const end = mapPins[mapPins.length - 1];
        mapRoutes.push({ start, end });
        drawMapElements();
    } else {
        alert('Add at least 2 pins first');
    }
});

document.getElementById('clear-map').addEventListener('click', () => {
    mapPins = [];
    mapRoutes = [];
    initMap();
});

// Calendar functions
let currentCalendarDate = new Date();

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();
    document.getElementById('calendar-month-year').textContent = `${currentCalendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    // Days of week
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.style.fontWeight = 'bold';
        grid.appendChild(dayEl);
    });
    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        grid.appendChild(empty);
    }
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        dayEl.addEventListener('click', () => {
            // Could add event details
        });
        grid.appendChild(dayEl);
    }
    renderEvents();
}

function renderEvents() {
    const list = document.getElementById('events-list');
    list.innerHTML = '';
    calendarEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `<strong>${event.title}</strong><br>${event.date} ${event.time}`;
        list.appendChild(item);
    });
}

document.getElementById('prev-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
});

document.getElementById('add-event').addEventListener('click', () => {
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    if (title && date && time) {
        calendarEvents.push({ title, date, time });
        renderEvents();
        document.getElementById('event-title').value = '';
        document.getElementById('event-date').value = '';
        document.getElementById('event-time').value = '';
        // Reminder simulation
        setTimeout(() => alert(`Reminder: ${title} at ${time}`), 5000);
    }
});

// Cart functions
function updateCartDisplay() {
    const itemsEl = document.getElementById('cart-items');
    itemsEl.innerHTML = '';
    let total = 0;
    cartItems.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <span>${item.name} - $${item.price}</span>
            <button onclick="removeFromCart(${index})">Remove</button>
        `;
        itemsEl.appendChild(itemEl);
        total += item.price;
    });
    document.getElementById('cart-total').textContent = total.toFixed(2);
}

function addToCart(name, price) {
    cartItems.push({ name, price });
    updateCartDisplay();
}

function removeFromCart(index) {
    cartItems.splice(index, 1);
    updateCartDisplay();
}

document.getElementById('checkout').addEventListener('click', () => {
    if (cartItems.length > 0) {
        showScreen('payment-screen');
    } else {
        alert('Cart is empty');
    }
});

// Payment functions
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const cardNumber = document.getElementById('card-number').value;
    const expiry = document.getElementById('expiry').value;
    const cvv = document.getElementById('cvv').value;
    const name = document.getElementById('card-name').value;
    if (cardNumber && expiry && cvv && name) {
        alert('Payment processed successfully!');
        cartItems = [];
        showScreen('home-screen');
    } else {
        alert('Please fill all fields');
    }
});

// Feedback functions
document.getElementById('stars').addEventListener('click', (e) => {
    if (e.target.classList.contains('star')) {
        selectedRating = parseInt(e.target.dataset.rating);
        document.querySelectorAll('.star').forEach((star, index) => {
            star.classList.toggle('selected', index < selectedRating);
        });
    }
});

document.getElementById('submit-feedback').addEventListener('click', () => {
    const review = document.getElementById('review').value;
    if (selectedRating > 0) {
        alert(`Thank you for ${selectedRating} star rating!${review ? ' Review: ' + review : ''}`);
        selectedRating = 0;
        document.querySelectorAll('.star').forEach(star => star.classList.remove('selected'));
        document.getElementById('review').value = '';
    } else {
        alert('Please select a rating');
    }
});

// Analytics functions
function drawAnalyticsChart() {
    const canvas = document.getElementById('analytics-chart');
    const ctx = canvas.getContext('2d');
    // Simple bar chart for weekly plays
    const data = [Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), Math.floor(Math.random() * 50)];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = 40;
    const gap = 20;
    const maxVal = Math.max(...data);
    data.forEach((val, i) => {
        const x = i * (barWidth + gap) + 20;
        const height = maxVal > 0 ? (val / maxVal) * 150 : 0;
        ctx.fillStyle = '#8a2be2';
        ctx.fillRect(x, canvas.height - height - 20, barWidth, height);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(labels[i], x + 10, canvas.height - 5);
        ctx.fillText(val.toString(), x + 10, canvas.height - height - 25);
    });
}

function updateAnalyticsStats() {
    document.getElementById('total-plays').textContent = songs.length * Math.floor(Math.random() * 10); // Simulate
    document.getElementById('top-genre').textContent = 'Pop'; // Placeholder
    document.getElementById('avg-session').textContent = Math.floor(Math.random() * 30) + ' min';
}

// Privacy functions
async function loadPrivacySettings() {
    const settings = localStorage.getItem('privacySettings') ? JSON.parse(localStorage.getItem('privacySettings')) : {};
    document.getElementById('share-listening-data').checked = settings.shareListening || false;
    document.getElementById('allow-analytics').checked = settings.allowAnalytics || false;
    document.getElementById('enable-location').checked = settings.enableLocation || false;
    document.getElementById('share-third-party').checked = settings.shareThirdParty || false;
}

async function savePrivacySettings() {
    const settings = {
        shareListening: document.getElementById('share-listening-data').checked,
        allowAnalytics: document.getElementById('allow-analytics').checked,
        enableLocation: document.getElementById('enable-location').checked,
        shareThirdParty: document.getElementById('share-third-party').checked
    };
    localStorage.setItem('privacySettings', JSON.stringify(settings));
    alert('Privacy settings saved!');
}

// Offline Queue functions
function updateOfflineQueue() {
    const list = document.getElementById('offline-queue-list');
    list.innerHTML = '';
    if (offlineQueue.length === 0) {
        list.innerHTML = '<p>No pending actions.</p>';
    } else {
        offlineQueue.forEach((action, index) => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.innerHTML = `<p>${action.description}</p><button onclick="removeFromQueue(${index})">Remove</button>`;
            list.appendChild(item);
        });
    }
}

function addToOfflineQueue(description) {
    offlineQueue.push({ description });
    updateOfflineQueue();
}

function removeFromQueue(index) {
    offlineQueue.splice(index, 1);
    updateOfflineQueue();
}

// AR Camera functions
async function startAR() {
    try {
        const video = document.getElementById('ar-video');
        const overlay = document.getElementById('ar-overlay');
        arStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = arStream;
        video.onloadedmetadata = () => {
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
        };
        drawAROverlay();
    } catch (error) {
        alert('Camera access denied or not available: ' + error.message);
    }
}

function stopAR() {
    if (arStream) {
        arStream.getTracks().forEach(track => track.stop());
        arStream = null;
    }
}

function drawAROverlay() {
    if (!arStream) return;
    const overlay = document.getElementById('ar-overlay');
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    // Draw some overlay, e.g., a circle
    ctx.strokeStyle = '#ff1493';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(overlay.width / 2, overlay.height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();
    // Continue drawing if needed
    requestAnimationFrame(drawAROverlay);
}

function addOverlay() {
    // Add more overlays, e.g., text
    const overlay = document.getElementById('ar-overlay');
    const ctx = overlay.getContext('2d');
    ctx.fillStyle = '#8a2be2';
    ctx.font = '20px Arial';
    ctx.fillText('AR Overlay', 50, 50);
}

// Social features
async function sharePlaylist(playlistId) {
    try {
        // Get playlist data
        const playlists = await getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist) {
            throw new Error('Playlist not found');
        }

        const shareData = {
            title: `Check out this playlist: ${playlist.name}`,
            text: `Listen to "${playlist.name}" on Roshan Beats!`,
            url: `${window.location.origin}/playlist/${playlistId}`
        };

        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
            await navigator.clipboard.writeText(text);
            alert('Playlist link copied to clipboard!');
        }
    } catch (error) {
        console.error('Error sharing playlist:', error);
        alert('Failed to share playlist');
    }
}

// Device hardware features
async function connectBluetoothSpeaker() {
    try {
        if (!navigator.bluetooth) {
            throw new Error('Web Bluetooth not supported');
        }

        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['audio_sink'] // Or specific UUIDs for audio devices
        });

        console.log('Bluetooth device selected:', device.name);
        alert(`Connected to ${device.name}`);

        // In a real implementation, you'd connect to GATT server and control audio
        // For demo, just log
    } catch (error) {
        console.error('Bluetooth connection failed:', error);
        alert('Failed to connect to Bluetooth device');
    }
}