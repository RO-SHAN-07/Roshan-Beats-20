// Roshan Beats Voice Module
// Uses Web Speech API for voice commands

let recognition = null;
let isListening = false;
const eventListeners = {};

function emit(event, data) {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback(data));
  }
}

export function on(event, callback) {
  eventListeners[event] = eventListeners[event] || [];
  eventListeners[event].push(callback);
}

export function startListening() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    emit('error', 'Speech recognition not supported');
    return;
  }

  if (isListening) {
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US'; // Can be made configurable

  recognition.onstart = () => {
    isListening = true;
    emit('listening-start');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    processCommand(transcript);
  };

  recognition.onerror = (event) => {
    emit('error', event.error);
  };

  recognition.onend = () => {
    isListening = false;
    emit('listening-end');
  };

  recognition.start();
}

export function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

export function processCommand(text) {
  emit('command', text);

  // Parse commands
  if (text.includes('play')) {
    emit('play');
  } else if (text.includes('pause') || text.includes('stop')) {
    emit('pause');
  } else if (text.includes('next')) {
    emit('next');
  } else if (text.includes('previous') || text.includes('prev')) {
    emit('previous');
  } else if (text.includes('search')) {
    const query = text.replace('search', '').trim();
    if (query) {
      emit('search', query);
    }
  } else if (text.includes('volume up') || text.includes('louder')) {
    emit('volume-up');
  } else if (text.includes('volume down') || text.includes('quieter')) {
    emit('volume-down');
  } else if (text.includes('mute')) {
    emit('mute');
  } else if (text.includes('shuffle')) {
    emit('shuffle');
  } else if (text.includes('repeat') || text.includes('loop')) {
    emit('repeat');
  } else {
    emit('unknown-command', text);
  }
}
