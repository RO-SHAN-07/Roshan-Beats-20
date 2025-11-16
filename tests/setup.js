// Jest setup for Roshan Beats PWA tests
// Mock Service Worker for offline functionality
global.fetch = jest.fn();
global.navigator.serviceWorker = {
  register: jest.fn(),
  ready: Promise.resolve(),
};

// Mock localStorage and sessionStorage
const createMockStorage = () => {
  let storage = {};
  return {
    getItem: jest.fn(key => storage[key] || null),
    setItem: jest.fn((key, value) => { storage[key] = value.toString(); }),
    removeItem: jest.fn(key => { delete storage[key]; }),
    clear: jest.fn(() => { storage = {}; }),
    key: jest.fn(index => Object.keys(storage)[index] || null),
    get length() { return Object.keys(storage).length; }
  };
};

Object.defineProperty(window, 'localStorage', { value: createMockStorage() });
Object.defineProperty(window, 'sessionStorage', { value: createMockStorage() });

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock Web Audio API
const mockAudioContext = {
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1, setValueAtTime: jest.fn() }
  })),
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    fftSize: 2048,
    getByteFrequencyData: jest.fn(),
    getByteTimeDomainData: jest.fn(),
    frequencyBinCount: 1024
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null,
    playbackRate: { value: 1 }
  })),
  createBiquadFilter: jest.fn(() => ({
    connect: jest.fn(),
    type: 'peaking',
    frequency: { value: 1000 },
    Q: { value: 1 },
    gain: { value: 0 }
  })),
  decodeAudioData: jest.fn((buffer) => Promise.resolve({
    duration: 180,
    sampleRate: 44100
  })),
  currentTime: 0,
  state: 'running',
  resume: jest.fn(),
  destination: {}
};

global.AudioContext = jest.fn(() => mockAudioContext);
global.webkitAudioContext = jest.fn(() => mockAudioContext);

// Mock IndexedDB
const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: null,
  error: null,
  readyState: 'done'
};

const mockIDBTransaction = {
  objectStore: jest.fn(() => mockIDBObjectStore),
  oncomplete: null,
  onerror: null
};

const mockIDBObjectStore = {
  put: jest.fn(() => mockIDBRequest),
  get: jest.fn(() => mockIDBRequest),
  getAll: jest.fn(() => mockIDBRequest),
  delete: jest.fn(() => mockIDBRequest),
  clear: jest.fn(() => mockIDBRequest),
  openCursor: jest.fn(() => mockIDBRequest),
  index: jest.fn(() => mockIDBIndex),
  createIndex: jest.fn(),
  add: jest.fn(() => mockIDBRequest)
};

const mockIDBIndex = {
  getAll: jest.fn(() => mockIDBRequest),
  openCursor: jest.fn(() => mockIDBRequest)
};

const mockIDBDatabase = {
  objectStoreNames: { contains: jest.fn(() => false) },
  createObjectStore: jest.fn(() => mockIDBObjectStore),
  transaction: jest.fn(() => mockIDBTransaction),
  close: jest.fn()
};

global.indexedDB = {
  open: jest.fn(() => mockIDBRequest)
};

// Mock Fuse.js
global.Fuse = jest.fn().mockImplementation((list, options) => ({
  search: jest.fn((query) => list.filter(item => item.title?.includes(query) || item.artist?.includes(query)))
}));

// Mock Speech Recognition
const mockSpeechRecognition = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null
}));

global.SpeechRecognition = mockSpeechRecognition;
global.webkitSpeechRecognition = mockSpeechRecognition;

// Mock crypto for encryption
global.crypto = {
  subtle: {
    generateKey: jest.fn(() => Promise.resolve({})),
    encrypt: jest.fn(() => Promise.resolve(new Uint8Array())),
    decrypt: jest.fn(() => Promise.resolve(new Uint8Array())),
    importKey: jest.fn(() => Promise.resolve({})),
    exportKey: jest.fn(() => Promise.resolve(new Uint8Array()))
  },
  getRandomValues: jest.fn((arr) => arr.fill(0))
};

// Mock MediaSession
if (!navigator.mediaSession) {
  navigator.mediaSession = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: jest.fn(),
    setPositionState: jest.fn(),
  };
}

// Mock Vibration API
navigator.vibrate = jest.fn();

// Mock Permissions API
navigator.permissions = {
  query: jest.fn(() => Promise.resolve({ state: 'granted' }))
};

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));