// Screen switching, event listeners, dynamic updates
// Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    // Update nav active states
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (screenId === 'home-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-home"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'playlists-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-playlists"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'settings-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-settings"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'search-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-search"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'notifications-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-notifications"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'chat-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-chat"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'gallery-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-gallery"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'dashboard-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-dashboard"]').forEach(btn => btn.classList.add('active'));
    } else if (screenId === 'profile-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-profile"]').forEach(btn => btn.classList.add('active'));
    }
}

// Search
document.querySelector('.search-bar').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterSongs(query);
});

function filterSongs(query) {
    const songList = document.getElementById('song-list');
    songList.innerHTML = '';
    const filtered = songs.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.album.toLowerCase().includes(query)
    );
    if (filtered.length === 0 && songs.length > 0) {
        songList.innerHTML = '<div class="empty-state"><h3>No songs found</h3><p>Try a different search term.</p></div>';
    } else {
        filtered.forEach((song, index) => {
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
            songList.appendChild(item);
        });
    }
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Filter logic here
    });
});

// Mini player tap to open full player
document.getElementById('mini-player').addEventListener('click', () => {
    showScreen('player-screen');
});

// Navigation
document.getElementById('nav-home').addEventListener('click', () => showScreen('home-screen'));
document.getElementById('nav-playlists').addEventListener('click', () => showScreen('playlists-screen'));
document.getElementById('nav-settings').addEventListener('click', () => showScreen('settings-screen'));
document.getElementById('nav-home2').addEventListener('click', () => showScreen('home-screen'));
document.getElementById('nav-playlists2').addEventListener('click', () => showScreen('playlists-screen'));
document.getElementById('nav-settings2').addEventListener('click', () => showScreen('settings-screen'));
document.getElementById('nav-home3').addEventListener('click', () => showScreen('home-screen'));
document.getElementById('nav-playlists3').addEventListener('click', () => showScreen('playlists-screen'));
document.getElementById('nav-dashboard3').addEventListener('click', () => {
    showScreen('dashboard-screen');
    updateDashboardMetrics();
});
document.getElementById('nav-profile3').addEventListener('click', () => {
    showScreen('profile-screen');
    loadProfile();
});
document.getElementById('nav-map3').addEventListener('click', () => {
    showScreen('map-screen');
    initMap();
});
document.getElementById('nav-calendar3').addEventListener('click', () => {
    showScreen('calendar-screen');
    renderCalendar();
});
document.getElementById('nav-cart3').addEventListener('click', () => {
    showScreen('cart-screen');
    updateCartDisplay();
});
document.getElementById('nav-payment3').addEventListener('click', () => showScreen('payment-screen'));
document.getElementById('nav-feedback3').addEventListener('click', () => showScreen('feedback-screen'));
document.getElementById('nav-settings3').addEventListener('click', () => showScreen('settings-screen'));
document.getElementById('nav-dashboard4').addEventListener('click', () => {
    showScreen('dashboard-screen');
    updateDashboardMetrics();
});
document.getElementById('nav-profile4').addEventListener('click', () => {
    showScreen('profile-screen');
    loadProfile();
});
document.getElementById('nav-dashboard5').addEventListener('click', () => {
    showScreen('dashboard-screen');
    updateDashboardMetrics();
});
document.getElementById('nav-profile5').addEventListener('click', () => {
    showScreen('profile-screen');
    loadProfile();
});
document.getElementById('nav-dashboard6').addEventListener('click', () => {
    showScreen('dashboard-screen');
    updateDashboardMetrics();
});
document.getElementById('nav-profile6').addEventListener('click', () => {
    showScreen('profile-screen');
    loadProfile();
});

// Settings
document.getElementById('set-theme-purple').addEventListener('click', () => {
    document.body.className = 'theme-purple';
    currentTheme = 'purple';
});

document.getElementById('set-theme-ice').addEventListener('click', () => {
    document.body.className = 'theme-ice';
    currentTheme = 'ice';
});

document.getElementById('set-theme-amoled').addEventListener('click', () => {
    document.body.className = '';
    currentTheme = 'amoled';
});

document.getElementById('import-more').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('clear-data').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        const db = await openDB();
        const tx = db.transaction(['songs', 'metadata', 'playlists'], 'readwrite');
        tx.objectStore('songs').clear();
        tx.objectStore('metadata').clear();
        tx.objectStore('playlists').clear();
        songs = [];
        playlists = [];
        updateSongList();
        updatePlaylistList();
        showScreen('welcome-screen');
    }
});

// Onboarding
let currentOnboardingStep = 1;

function showOnboardingStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    document.querySelectorAll('.indicator').forEach(i => i.classList.remove('active'));
    document.querySelector(`.indicator[data-step="${step}"]`).classList.add('active');
    currentOnboardingStep = step;
}

document.getElementById('next-step1').addEventListener('click', () => showOnboardingStep(2));
document.getElementById('prev-step2').addEventListener('click', () => showOnboardingStep(1));
document.getElementById('next-step2').addEventListener('click', () => showOnboardingStep(3));
document.getElementById('prev-step3').addEventListener('click', () => showOnboardingStep(2));
document.getElementById('finish-onboarding').addEventListener('click', () => showScreen('login-screen'));

document.querySelectorAll('.indicator').forEach(ind => {
    ind.addEventListener('click', () => showOnboardingStep(parseInt(ind.dataset.step)));
});

// Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    // Simulate login
    alert('Logged in successfully!');
    showScreen('dashboard-screen');
});

document.getElementById('google-login').addEventListener('click', () => {
    alert('Logged in with Google!');
    showScreen('dashboard-screen');
});

document.getElementById('facebook-login').addEventListener('click', () => {
    alert('Logged in with Facebook!');
    showScreen('dashboard-screen');
});

document.getElementById('apple-login').addEventListener('click', () => {
    alert('Logged in with Apple!');
    showScreen('dashboard-screen');
});

document.getElementById('signup-link').addEventListener('click', () => {
    alert('Sign up feature coming soon!');
});

// Dashboard
function updateDashboardMetrics() {
    document.getElementById('total-songs').textContent = songs.length;
    document.getElementById('total-playlists').textContent = playlists.length;
    // Simulate listening time
    document.getElementById('listening-time').textContent = Math.floor(Math.random() * 100) + ' min';
    document.getElementById('favorite-genre').textContent = 'Pop'; // Placeholder
}

// Profile
async function loadProfile() {
    const user = await loadUser();
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('profile-pic').src = user.pic || '';
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = {
        id: 'profile',
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        bio: document.getElementById('bio').value,
        pic: document.getElementById('profile-pic').src
    };
    await saveUser(user);
    alert('Profile saved!');
});

document.getElementById('change-pic').addEventListener('click', () => {
    // Simulate change pic
    document.getElementById('profile-pic').src = generateCover();
});

// Navigation for new screens
document.getElementById('nav-dashboard').addEventListener('click', () => {
    showScreen('dashboard-screen');
    updateDashboardMetrics();
});
document.getElementById('nav-profile').addEventListener('click', () => {
    showScreen('profile-screen');
    loadProfile();
});
document.getElementById('nav-dashboard2').addEventListener('click', () => {
    showScreen('dashboard-screen');
    updateDashboardMetrics();
});
document.getElementById('nav-profile2').addEventListener('click', () => {
    showScreen('profile-screen');
    loadProfile();
});
document.getElementById('nav-home4').addEventListener('click', () => showScreen('home-screen'));
document.getElementById('nav-home5').addEventListener('click', () => showScreen('home-screen'));

// New nav buttons
document.querySelectorAll('[id*="nav-search"]').forEach(btn => btn.addEventListener('click', () => {
    showScreen('search-screen');
    populateSearchFilters();
}));
document.querySelectorAll('[id*="nav-notifications"]').forEach(btn => btn.addEventListener('click', () => showScreen('notifications-screen')));
document.querySelectorAll('[id*="nav-chat"]').forEach(btn => btn.addEventListener('click', () => showScreen('chat-screen')));
document.querySelectorAll('[id*="nav-gallery"]').forEach(btn => btn.addEventListener('click', () => showScreen('gallery-screen')));
document.querySelectorAll('[id*="nav-map"]').forEach(btn => btn.addEventListener('click', () => {
    showScreen('map-screen');
    initMap();
}));
document.querySelectorAll('[id*="nav-calendar"]').forEach(btn => btn.addEventListener('click', () => {
    showScreen('calendar-screen');
    renderCalendar();
}));
document.querySelectorAll('[id*="nav-cart"]').forEach(btn => btn.addEventListener('click', () => {
    showScreen('cart-screen');
    updateCartDisplay();
}));
document.querySelectorAll('[id*="nav-payment"]').forEach(btn => btn.addEventListener('click', () => showScreen('payment-screen')));
document.querySelectorAll('[id*="nav-feedback"]').forEach(btn => btn.addEventListener('click', () => showScreen('feedback-screen')));

// New nav buttons
document.querySelectorAll('[id*="nav-analytics"]').forEach(btn => btn.addEventListener('click', () => {
    showScreen('analytics-screen');
    drawAnalyticsChart();
    updateAnalyticsStats();
}));
document.querySelectorAll('[id*="nav-help"]').forEach(btn => btn.addEventListener('click', () => showScreen('help-screen')));
document.querySelectorAll('[id*="nav-privacy"]').forEach(btn => btn.addEventListener('click', () => {
    showScreen('privacy-screen');
    loadPrivacySettings();
}));
document.querySelectorAll('[id*="nav-offline-queue"]').forEach(btn => btn.addEventListener('click', () => {
    showScreen('offline-queue-screen');
    updateOfflineQueue();
}));
document.querySelectorAll('[id*="nav-ar-camera"]').forEach(btn => btn.addEventListener('click', () => showScreen('ar-camera-screen')));

// Other events
document.getElementById('save-privacy').addEventListener('click', savePrivacySettings);
document.getElementById('sync-now').addEventListener('click', () => {
    alert('Syncing... (simulated)');
    offlineQueue = [];
    updateOfflineQueue();
});
document.getElementById('start-ar').addEventListener('click', startAR);
document.getElementById('stop-ar').addEventListener('click', stopAR);
document.getElementById('add-overlay').addEventListener('click', addOverlay);

// Update showScreen for new nav
const originalShowScreen = showScreen;
showScreen = function(screenId) {
    originalShowScreen(screenId);
    // Update nav active for new screens
    if (screenId === 'dashboard-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-dashboard"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn[id*="nav-profile"]').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.nav-btn[id*="nav-home"]').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'profile-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-profile"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn[id*="nav-dashboard"]').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.nav-btn[id*="nav-home"]').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'map-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-map"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-map"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'calendar-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-calendar"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-calendar"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'cart-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-cart"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-cart"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'payment-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-payment"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-payment"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'feedback-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-feedback"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-feedback"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'analytics-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-analytics"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-analytics"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'help-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-help"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-help"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'privacy-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-privacy"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-privacy"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'offline-queue-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-offline-queue"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-offline-queue"])').forEach(btn => btn.classList.remove('active'));
    } else if (screenId === 'ar-camera-screen') {
        document.querySelectorAll('.nav-btn[id*="nav-ar-camera"]').forEach(btn => btn.classList.add('active'));
        document.querySelectorAll('.nav-btn:not([id*="nav-ar-camera"])').forEach(btn => btn.classList.remove('active'));
    }
};

// Dark mode functionality
function applyDarkMode(mode) {
    const body = document.body;
    body.removeAttribute('data-theme-override');

    if (mode === 'light') {
        body.setAttribute('data-theme-override', 'light');
    } else if (mode === 'dark') {
        body.setAttribute('data-theme-override', 'dark');
    }
    // 'auto' uses system preference
}

function checkDarkModeSchedule() {
    const scheduleEnabled = localStorage.getItem('darkSchedule') === 'true';
    if (!scheduleEnabled) return;

    const now = new Date();
    const hour = now.getHours();
    // Simple schedule: dark mode from 6 PM to 6 AM
    const isNight = hour >= 18 || hour < 6;

    if (isNight && document.body.getAttribute('data-theme-override') !== 'dark') {
        applyDarkMode('dark');
    } else if (!isNight && document.body.getAttribute('data-theme-override') === 'dark') {
        applyDarkMode('auto');
    }
}

// Initialize dark mode on load
const savedDarkMode = localStorage.getItem('darkMode') || 'auto';
document.getElementById('dark-mode').value = savedDarkMode;
applyDarkMode(savedDarkMode);

const scheduleEnabled = localStorage.getItem('darkSchedule') === 'true';
document.getElementById('dark-schedule').checked = scheduleEnabled;

// Event listeners for dark mode
document.getElementById('dark-mode').addEventListener('change', (e) => {
    const mode = e.target.value;
    localStorage.setItem('darkMode', mode);
    applyDarkMode(mode);
});

document.getElementById('dark-schedule').addEventListener('change', (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('darkSchedule', enabled);
    if (enabled) {
        checkDarkModeSchedule();
    }
});

// Check schedule every minute
setInterval(checkDarkModeSchedule, 60000);