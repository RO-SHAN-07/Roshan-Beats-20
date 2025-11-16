const puppeteer = require('puppeteer');
const fs = require('fs');

async function profileApp() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--memory-pressure-off']
  });

  const page = await browser.newPage();

  // Enable performance monitoring
  await page.tracing.start({ path: 'trace.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.screenshot'] });

  // Navigate to the app
  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Wait for app to load
  await page.waitForTimeout(3000);

  // Simulate user actions
  console.log('Starting user actions...');

  // 1. Navigate to home (already on home)
  await page.waitForSelector('#nav-home', { timeout: 10000 });
  await page.click('#nav-home');
  await page.waitForTimeout(1000);

  // 2. Load songs - click on a song if available
  const songItems = await page.$$('.song-item');
  if (songItems.length > 0) {
    await songItems[0].click();
    await page.waitForTimeout(2000);
  }

  // 3. Play audio - use mini player or player screen
  const playBtn = await page.$('#mini-play-pause') || await page.$('#play-pause-btn');
  if (playBtn) {
    await playBtn.click();
    console.log('Playing audio...');
    await page.waitForTimeout(5000); // Play for 5 seconds
  }

  // 4. Navigate to player screen
  await page.click('#nav-player');
  await page.waitForTimeout(1000);

  // 5. Import files - click fab import
  const fabImport = await page.$('#fab-import');
  if (fabImport) {
    await fabImport.click();
    await page.waitForTimeout(1000);
    // Assume modal opens, but for simplicity, skip actual upload
  }

  // 6. Navigate to playlists
  await page.click('#nav-playlists');
  await page.waitForTimeout(1000);

  // 7. Navigate to settings
  await page.click('#nav-settings');
  await page.waitForTimeout(1000);

  // Stop tracing
  await page.tracing.stop();

  // Take memory snapshot
  const heapSnapshot = await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  });

  console.log('Heap Snapshot:', heapSnapshot);

  // Capture performance metrics
  const metrics = await page.metrics();
  console.log('Performance Metrics:', metrics);

  // Get console logs for errors
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  // Analyze for bottlenecks
  const bottlenecks = await page.evaluate(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      return entries.filter(entry => entry.duration > 100); // Long tasks > 100ms
    });
    observer.observe({ entryTypes: ['longtask'] });

    // Wait a bit
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(observer.takeRecords().map(entry => ({
          duration: entry.duration,
          startTime: entry.startTime
        })));
      }, 1000);
    });
  });

  console.log('Long Tasks:', bottlenecks);

  await browser.close();

  // Save results
  const results = {
    heapSnapshot,
    metrics,
    bottlenecks,
    logs: logs.slice(-20) // Last 20 logs
  };

  fs.writeFileSync('profile-results.json', JSON.stringify(results, null, 2));

  console.log('Profiling complete. Results saved to profile-results.json and trace.json');
}

profileApp().catch(console.error);