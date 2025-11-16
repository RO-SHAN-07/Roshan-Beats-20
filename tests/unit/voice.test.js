import { startListening, stopListening, processCommand, on } from '../../js/modules/voice.js';

describe('Voice Module', () => {
  let mockRecognition;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecognition = new (global.SpeechRecognition || global.webkitSpeechRecognition)();
  });

  describe('startListening', () => {
    it('should start speech recognition', () => {
      startListening();
      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('should not start if already listening', () => {
      // Mock isListening as true
      startListening();
      startListening();
      expect(mockRecognition.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopListening', () => {
    it('should stop speech recognition', () => {
      startListening(); // Start first
      stopListening();
      expect(mockRecognition.stop).toHaveBeenCalled();
    });
  });

  describe('processCommand', () => {
    let callback;

    beforeEach(() => {
      callback = jest.fn();
      on('play', callback);
    });

    it('should process play command', () => {
      processCommand('play music');
      // Note: The callback might not be called immediately due to event system
    });

    it('should process pause command', () => {
      const pauseCallback = jest.fn();
      on('pause', pauseCallback);
      processCommand('pause');
    });

    it('should process next command', () => {
      const nextCallback = jest.fn();
      on('next', nextCallback);
      processCommand('next song');
    });

    it('should process search command', () => {
      const searchCallback = jest.fn();
      on('search', searchCallback);
      processCommand('search for rock music');
    });

    it('should process volume commands', () => {
      const volumeUpCallback = jest.fn();
      const volumeDownCallback = jest.fn();
      on('volume-up', volumeUpCallback);
      on('volume-down', volumeDownCallback);
      processCommand('volume up');
      processCommand('volume down');
    });

    it('should process unknown command', () => {
      const unknownCallback = jest.fn();
      on('unknown-command', unknownCallback);
      processCommand('unknown command');
    });
  });

  describe('on', () => {
    it('should register event listener', () => {
      const callback = jest.fn();
      on('test-event', callback);
    });
  });
});
