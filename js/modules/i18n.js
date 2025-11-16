class I18nManager {
  constructor() {
    this.currentLang = 'en';
    this.translations = {
      en: {
        'home': 'Home',
        'search': 'Search',
        'notifications': 'Notifications',
        'settings': 'Settings',
        'play': 'Play',
        'pause': 'Pause',
        'next': 'Next',
        'previous': 'Previous',
        'login': 'Login',
        'logout': 'Logout',
        'welcome': 'Welcome to Roshan Beats',
        'theme': 'Theme',
        'language': 'Language',
        'dark_mode': 'Dark Mode',
        'auto': 'Auto',
        'light': 'Light',
        'dark': 'Dark'
      },
      es: {
        'home': 'Inicio',
        'search': 'Buscar',
        'notifications': 'Notificaciones',
        'settings': 'Configuración',
        'play': 'Reproducir',
        'pause': 'Pausar',
        'next': 'Siguiente',
        'previous': 'Anterior',
        'login': 'Iniciar sesión',
        'logout': 'Cerrar sesión',
        'welcome': 'Bienvenido a Roshan Beats',
        'theme': 'Tema',
        'language': 'Idioma',
        'dark_mode': 'Modo oscuro',
        'auto': 'Automático',
        'light': 'Claro',
        'dark': 'Oscuro'
      },
      fr: {
        'home': 'Accueil',
        'search': 'Rechercher',
        'notifications': 'Notifications',
        'settings': 'Paramètres',
        'play': 'Lire',
        'pause': 'Pause',
        'next': 'Suivant',
        'previous': 'Précédent',
        'login': 'Connexion',
        'logout': 'Déconnexion',
        'welcome': 'Bienvenue sur Roshan Beats',
        'theme': 'Thème',
        'language': 'Langue',
        'dark_mode': 'Mode sombre',
        'auto': 'Auto',
        'light': 'Clair',
        'dark': 'Sombre'
      },
      de: {
        'home': 'Startseite',
        'search': 'Suchen',
        'notifications': 'Benachrichtigungen',
        'settings': 'Einstellungen',
        'play': 'Abspielen',
        'pause': 'Pause',
        'next': 'Nächste',
        'previous': 'Vorherige',
        'login': 'Anmelden',
        'logout': 'Abmelden',
        'welcome': 'Willkommen bei Roshan Beats',
        'theme': 'Thema',
        'language': 'Sprache',
        'dark_mode': 'Dunkler Modus',
        'auto': 'Auto',
        'light': 'Hell',
        'dark': 'Dunkel'
      },
      zh: {
        'home': '首页',
        'search': '搜索',
        'notifications': '通知',
        'settings': '设置',
        'play': '播放',
        'pause': '暂停',
        'next': '下一首',
        'previous': '上一首',
        'login': '登录',
        'logout': '登出',
        'welcome': '欢迎来到 Roshan Beats',
        'theme': '主题',
        'language': '语言',
        'dark_mode': '深色模式',
        'auto': '自动',
        'light': '浅色',
        'dark': '深色'
      }
    };
  }

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      document.documentElement.lang = lang;
      localStorage.setItem('language', lang);
      this.updateUI();
    }
  }

  getText(key) {
    return this.translations[this.currentLang][key] || this.translations.en[key] || key;
  }

  updateUI() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.getText(key);
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.getText(key);
    });

    // Update titles and labels
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.getText(key);
    });
  }

  init() {
    const savedLang = localStorage.getItem('language') || navigator.language.split('-')[0] || 'en';
    this.setLanguage(savedLang);

    // Update language selector
    const langSelect = document.getElementById('language');
    if (langSelect) {
      langSelect.value = this.currentLang;
      langSelect.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    }
  }
}

export default new I18nManager();