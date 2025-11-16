// Polyfills for ES6+ features and Web APIs
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'intersection-observer';
import 'resize-observer-polyfill';
import 'web-animations-js';
import 'abortcontroller-polyfill';
import 'whatwg-fetch';

// Custom polyfills for specific features

// Promise.finally polyfill if not available
if (!Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const P = this.constructor;
    return this.then(
      value => P.resolve(callback()).then(() => value),
      reason => P.resolve(callback()).then(() => { throw reason; })
    );
  };
}

// Object.entries polyfill
if (!Object.entries) {
  Object.entries = function(obj) {
    const ownProps = Object.keys(obj);
    let i = ownProps.length;
    const resArray = new Array(i);
    while (i--) {
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    }
    return resArray;
  };
}

// Object.values polyfill
if (!Object.values) {
  Object.values = function(obj) {
    const ownProps = Object.keys(obj);
    let i = ownProps.length;
    const resArray = new Array(i);
    while (i--) {
      resArray[i] = obj[ownProps[i]];
    }
    return resArray;
  };
}

// Array.includes polyfill
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      const o = Object(this);
      const len = o.length >>> 0;

      if (len === 0) {
        return false;
      }

      const n = fromIndex | 0;
      let k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      while (k < len) {
        if (o[k] === searchElement) {
          return true;
        }
        k++;
      }
      return false;
    }
  });
}

// String.includes polyfill
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// Element.matches polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector ||
                              Element.prototype.webkitMatchesSelector;
}

// Element.closest polyfill
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    let el = this;
    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// CustomEvent polyfill
if (typeof window !== 'undefined' && typeof window.CustomEvent !== 'function') {
  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    const evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }
  window.CustomEvent = CustomEvent;
}

// URLSearchParams polyfill (basic)
if (typeof window !== 'undefined' && !window.URLSearchParams) {
  window.URLSearchParams = function(searchString) {
    this.params = {};
    if (searchString) {
      const pairs = searchString.replace(/^\?/, '').split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        this.params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }
  };

  window.URLSearchParams.prototype.get = function(key) {
    return this.params[key] || null;
  };

  window.URLSearchParams.prototype.set = function(key, value) {
    this.params[key] = value;
  };

  window.URLSearchParams.prototype.toString = function() {
    return Object.entries(this.params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  };
}

// Performance.now polyfill
if (typeof window !== 'undefined' && !window.performance) {
  window.performance = {};
}
if (!window.performance.now) {
  const start = Date.now();
  window.performance.now = function() {
    return Date.now() - start;
  };
}

// requestAnimationFrame polyfill
if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  window.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 16);
  };
  window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };
}

// WeakMap polyfill (basic)
if (typeof window !== 'undefined' && !window.WeakMap) {
  window.WeakMap = function() {
    this.keys = [];
    this.values = [];
  };

  window.WeakMap.prototype.set = function(key, value) {
    const index = this.keys.indexOf(key);
    if (index === -1) {
      this.keys.push(key);
      this.values.push(value);
    } else {
      this.values[index] = value;
    }
    return this;
  };

  window.WeakMap.prototype.get = function(key) {
    const index = this.keys.indexOf(key);
    return index === -1 ? undefined : this.values[index];
  };

  window.WeakMap.prototype.has = function(key) {
    return this.keys.indexOf(key) !== -1;
  };

  window.WeakMap.prototype.delete = function(key) {
    const index = this.keys.indexOf(key);
    if (index !== -1) {
      this.keys.splice(index, 1);
      this.values.splice(index, 1);
      return true;
    }
    return false;
  };
}

// Symbol polyfill (basic)
if (typeof window !== 'undefined' && !window.Symbol) {
  window.Symbol = function(description) {
    return `Symbol(${description})`;
  };
  window.Symbol.iterator = 'Symbol.iterator';
}

// Iterator protocol polyfill for arrays
if (!Array.prototype[Symbol.iterator]) {
  Array.prototype[Symbol.iterator] = Array.prototype.values;
}

// Web Audio API context creation polyfill
if (typeof window !== 'undefined' && !window.AudioContext && !window.webkitAudioContext) {
  window.AudioContext = window.webkitAudioContext = function() {
    throw new Error('Web Audio API not supported in this browser');
  };
}

// Service Worker API polyfill
if (typeof window !== 'undefined' && !navigator.serviceWorker) {
  navigator.serviceWorker = {
    register: () => Promise.reject(new Error('Service Worker not supported')),
    ready: Promise.reject(new Error('Service Worker not supported')),
    controller: null,
    oncontrollerchange: null,
    onmessage: null
  };
}

// Notification API polyfill
if (typeof window !== 'undefined' && !window.Notification) {
  window.Notification = function() {
    throw new Error('Notification API not supported');
  };
  window.Notification.permission = 'denied';
  window.Notification.requestPermission = () => Promise.resolve('denied');
}

// Geolocation API polyfill
if (typeof window !== 'undefined' && !navigator.geolocation) {
  navigator.geolocation = {
    getCurrentPosition: (success, error) => {
      if (error) error({ code: 2, message: 'Geolocation not supported' });
    },
    watchPosition: () => -1,
    clearWatch: () => {}
  };
}

// Vibration API polyfill
if (typeof window !== 'undefined' && !navigator.vibrate) {
  navigator.vibrate = function() { return false; };
}

// Battery API polyfill
if (typeof window !== 'undefined' && !navigator.getBattery) {
  navigator.getBattery = () => Promise.reject(new Error('Battery API not supported'));
}

// Web Share API polyfill
if (typeof window !== 'undefined' && !navigator.share) {
  navigator.share = () => Promise.reject(new Error('Web Share API not supported'));
}

// Media Session API polyfill
if (typeof window !== 'undefined' && !navigator.mediaSession) {
  navigator.mediaSession = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: () => {},
    setPositionState: () => {}
  };
}

// IndexedDB polyfill (basic fallback)
if (typeof window !== 'undefined' && !window.indexedDB) {
  window.indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
}

// Console methods polyfill for older browsers
if (typeof window !== 'undefined' && !window.console) {
  window.console = {};
}
const methods = ['log', 'warn', 'error', 'info', 'debug', 'trace'];
methods.forEach(method => {
  if (!window.console[method]) {
    window.console[method] = function() {};
  }
});

// Export for module usage
export default {};