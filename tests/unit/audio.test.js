import { initAudio, loadSong, play, pause, stop, seek, setVolume, setPlaybackRate, applyEQ, setEQPreset, getVisualizerData, enableGapless, getCurrentTime, getDuration, on } from '../../js/modules/audio.js';

describe('Audio Module', () => {
  let mockAudioContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioContext = new (global.AudioContext || global.webkitAudioContext)();
  });

  describe('initAudio', () => {
    it('should initialize audio context', () => {
      initAudio();
      expect(AudioContext).toHaveBeenCalled();
    });
  });

  describe('loadSong', () => {
    it('should load song from blob', async () => {
      const blob = new Blob(['audio data']);
      await expect(loadSong(blob)).resolves.toBeUndefined();
    });

    it('should load song from url', async () => {
      global.fetch.mockResolvedValue({
        arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
      });
      await expect(loadSong('url')).resolves.toBeUndefined();
    });
  });

  describe('play', () => {
    it('should play audio', () => {
      play();
      // Test that buffer source is created and started
    });
  });

  describe('pause', () => {
    it('should pause audio', () => {
      pause();
    });
  });

  describe('stop', () => {
    it('should stop audio', () => {
      stop();
    });
  });

  describe('seek', () => {
    it('should seek to time', () => {
      seek(30);
    });
  });

  describe('setVolume', () => {
    it('should set volume', () => {
      setVolume(0.5);
    });

    it('should clamp volume to valid range', () => {
      setVolume(1.5);
      setVolume(-0.1);
    });
  });

  describe('setPlaybackRate', () => {
    it('should set playback rate', () => {
      setPlaybackRate(1.2);
    });

    it('should clamp playback rate to valid range', () => {
      setPlaybackRate(2.5);
      setPlaybackRate(0.3);
    });
  });

  describe('applyEQ', () => {
    it('should apply EQ bands', () => {
      const bands = [0, 0, 0, 0, 0];
      applyEQ(bands);
    });
  });

  describe('setEQPreset', () => {
    it('should set EQ preset', () => {
      setEQPreset('rock');
    });
  });

  describe('getVisualizerData', () => {
    it('should get frequency data', () => {
      const data = getVisualizerData('spectrum');
      expect(data).toBeInstanceOf(Uint8Array);
    });

    it('should get time domain data', () => {
      const data = getVisualizerData('waveform');
      expect(data).toBeInstanceOf(Uint8Array);
    });
  });

  describe('enableGapless', () => {
    it('should enable gapless playback', () => {
      enableGapless();
    });
  });

  describe('getCurrentTime', () => {
    it('should get current time', () => {
      const time = getCurrentTime();
      expect(typeof time).toBe('number');
    });
  });

  describe('getDuration', () => {
    it('should get duration', () => {
      const duration = getDuration();
      expect(typeof duration).toBe('number');
    });
  });

  describe('on', () => {
    it('should register event listener', () => {
      const callback = jest.fn();
      on('play', callback);
    });
  });
});
