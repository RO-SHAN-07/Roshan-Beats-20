s// UI Manager for screen switching and shared UI functions
import { logger } from './modules/logger.js';

// Screen switching
export function showScreen(screenId) {
  logger.debug('Switching to screen', { screenId });

  const startTime = performance.now();
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

  const switchTime = performance.now() - startTime;
  logger.info('Screen switched successfully', { screenId, switchTime: `${switchTime.toFixed(2)}ms` });
}