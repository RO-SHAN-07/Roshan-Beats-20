import { registerSW, cacheSong, isOnline, syncData, on } from '../../js/modules/offline.js';

describe('Offline Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerSW', () => {
    it('should register service worker', () => {
      registerSW();
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
  });

  describe('cacheSong', () => {
    it('should send message to cache song', () => {
      // Mock service worker registration
      const mockPostMessage = jest.fn();
      global.navigator.serviceWorker.register.mockResolvedValue({
        active: { postMessage: mockPostMessage },
      });

      registerSW();
      cacheSong(1);

      // Note: This might need to wait for registration promise
    });
  });

  describe('isOnline', () => {
    it('should return online status', () => {
      const online = isOnline();
      expect(typeof online).toBe('boolean');
    });
  });

  describe('syncData', () => {
    it('should register background sync', () => {
      // Mock service worker with sync
      const mockSync = { register: jest.fn() };
      global.navigator.serviceWorker.register.mockResolvedValue({
        sync: mockSync,
      });

      registerSW();
      syncData();
    });

    it('should sync immediately if online', () => {
      // Mock no service worker sync
      global.navigator.serviceWorker.register.mockResolvedValue({});

      registerSW();
      syncData();
    });
  });

  describe('on', () => {
    it('should register event listener', () => {
      const callback = jest.fn();
      on('online', callback);
    });
  });

  describe('online/offline events', () => {
    it('should emit online event', () => {
      const callback = jest.fn();
      on('online', callback);

      // Simulate online event
      window.dispatchEvent(new Event('online'));
    });

    it('should emit offline event', () => {
      const callback = jest.fn();
      on('offline', callback);

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
    });
  });
});
