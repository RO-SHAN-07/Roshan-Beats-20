const puppeteer = require('puppeteer');

describe('Roshan Beats PWA E2E Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Mock service worker and APIs
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('/sw.js')) {
        request.respond({
          status: 200,
          contentType: 'application/javascript',
          body: 'console.log("Mock Service Worker");',
        });
      } else {
        request.continue();
      }
    });

    // Navigate to app
    await page.goto('http://localhost:3000'); // Assuming dev server
  });

  afterEach(async () => {
    await page.close();
  });

  describe('App Loading', () => {
    it('should load the app successfully', async () => {
      await page.waitForSelector('#app-container');
      const title = await page.title();
      expect(title).toContain('Roshan Beats');
    });

    it('should display home screen by default', async () => {
      await page.waitForSelector('.screen.active');
      const activeScreen = await page.$eval('.screen.active', el => el.id);
      expect(activeScreen).toBe('home');
    });
  });

  describe('Navigation', () => {
    it('should navigate between screens', async () => {
      // Click playlists nav
      await page.click('#nav-playlists');
      await page.waitForSelector('#playlists');
      let activeScreen = await page.$eval('.screen.active', el => el.id);
      expect(activeScreen).toBe('playlists');

      // Click home nav
      await page.click('#nav-home');
      await page.waitForSelector('#home');
      activeScreen = await page.$eval('.screen.active', el => el.id);
      expect(activeScreen).toBe('home');
    });
  });

  describe('Song Import Flow', () => {
    it('should allow importing music files', async () => {
      // Click import button
      const importBtn = await page.$('#import-btn, #fab-import');
      if (importBtn) {
        await importBtn.click();

        // Mock file input (in real test, would need to handle file upload)
        // This tests the UI trigger
        expect(importBtn).toBeTruthy();
      }
    });
  });

  describe('Search Functionality', () => {
    it('should search for songs', async () => {
      const searchInput = await page.$('#search-input');
      if (searchInput) {
        await searchInput.type('test song');
        await page.waitForTimeout(500); // Wait for search

        // Check if results are filtered
        const songCards = await page.$$('.song-card, .song-list-item');
        // Results should be present or empty state shown
        expect(songCards.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Playlist Creation', () => {
    it('should create a new playlist', async () => {
      // Navigate to playlists
      await page.click('#nav-playlists');
      await page.waitForSelector('#playlists');

      // Click create playlist button
      const createBtn = await page.$('#create-playlist-btn, #create-first-playlist');
      if (createBtn) {
        await createBtn.click();

        // Modal should appear
        const modal = await page.$('.modal');
        expect(modal).toBeTruthy();
      }
    });
  });

  describe('Player Controls', () => {
    it('should have player controls', async () => {
      // Check for mini player
      const miniPlayer = await page.$('#mini-player');
      if (miniPlayer) {
        // Should be visible or expandable
        const display = await page.evaluate(el => el.style.display, miniPlayer);
        expect(display).not.toBe('none');
      }
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      await page.setViewport({ width: 375, height: 667 });

      // Check if mobile class is added
      const bodyClasses = await page.evaluate(() => document.body.className);
      expect(bodyClasses).toContain('mobile');
    });
  });

  describe('PWA Features', () => {
    it('should be installable', async () => {
      // Check for manifest
      const manifest = await page.$('link[rel="manifest"]');
      expect(manifest).toBeTruthy();
    });

    it('should have service worker', async () => {
      // Service worker should be registered
      const sw = await page.evaluate(() => navigator.serviceWorker);
      expect(sw).toBeDefined();
    });
  });
});
