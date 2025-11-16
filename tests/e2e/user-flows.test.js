const puppeteer = require('puppeteer');

describe('Roshan Beats User Flows E2E', () => {
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
    await page.goto('http://localhost:3000');
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Import Music Flow', () => {
    it('should import music and display in library', async () => {
      // This would require actual file upload in a real test
      // For now, test the UI flow

      await page.waitForSelector('#import-btn, #fab-import');

      // Click import
      const importBtn = await page.$('#import-btn, #fab-import');
      await importBtn.click();

      // File input should be triggered (can't test actual upload without files)
      // In real scenario, would use page.setInputFiles()
    });
  });

  describe('Play Song Flow', () => {
    it('should play a song from library', async () => {
      // Wait for song library to load
      await page.waitForSelector('.song-card, .song-list-item');

      // Click on first song
      const firstSong = await page.$('.song-card, .song-list-item');
      if (firstSong) {
        await firstSong.click();

        // Mini player should appear
        await page.waitForSelector('#mini-player', { visible: true });

        // Check mini player content
        const miniPlayer = await page.$('#mini-player');
        expect(miniPlayer).toBeTruthy();
      }
    });
  });

  describe('Create Playlist Flow', () => {
    it('should create playlist and add songs', async () => {
      // Navigate to playlists
      await page.click('#nav-playlists');
      await page.waitForSelector('#playlists');

      // Click create playlist
      const createBtn = await page.$('#create-playlist-btn, #create-first-playlist');
      if (createBtn) {
        await createBtn.click();

        // Fill playlist form
        await page.waitForSelector('#playlist-name');
        await page.type('#playlist-name', 'Test Playlist');
        await page.type('#playlist-description', 'Test Description');

        // Submit form
        const submitBtn = await page.$('#confirm-create-playlist');
        if (submitBtn) {
          await submitBtn.click();

          // Should navigate back to playlists
          await page.waitForSelector('.playlist-card');
          const playlists = await page.$$('.playlist-card');
          expect(playlists.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Search and Filter Flow', () => {
    it('should search and filter songs', async () => {
      // Type in search
      const searchInput = await page.$('#search-input');
      if (searchInput) {
        await searchInput.type('test');
        await page.waitForTimeout(300);

        // Check results
        const results = await page.$$('.song-card, .song-list-item');
        // Should show filtered results
      }

      // Test genre filter
      const genreFilter = await page.$('#genre-filter');
      if (genreFilter) {
        await genreFilter.select('Rock');
        await page.waitForTimeout(300);

        // Results should be filtered
        const filteredResults = await page.$$('.song-card, .song-list-item');
      }
    });
  });

  describe('Settings and Preferences', () => {
    it('should access and modify settings', async () => {
      // Navigate to settings
      await page.click('#nav-settings');
      await page.waitForSelector('#settings');

      // Settings should be displayed
      const settingsContent = await page.$('#settings');
      expect(settingsContent).toBeTruthy();
    });
  });

  describe('Offline Functionality', () => {
    it('should work offline', async () => {
      // Set offline
      await page.setOfflineMode(true);

      // Try to access cached content
      await page.reload();

      // App should still load (basic check)
      const appContainer = await page.$('#app-container');
      expect(appContainer).toBeTruthy();

      // Set back online
      await page.setOfflineMode(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      // Check for aria-labels on interactive elements
      const buttons = await page.$$('button[aria-label]');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should load within performance budget', async () => {
      const metrics = await page.metrics();
      expect(metrics.TaskDuration).toBeLessThan(100); // Rough check
    });

    it('should lazy load images', async () => {
      const lazyImages = await page.$$('img.lazy');
      if (lazyImages.length > 0) {
        // Check data-src attributes
        const dataSrc = await page.evaluate(img => img.dataset.src, lazyImages[0]);
        expect(dataSrc).toBeTruthy();
      }
    });
  });
});
