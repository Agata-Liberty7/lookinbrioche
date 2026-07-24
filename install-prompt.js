(() => {
  'use strict';

  let deferredInstallPrompt = null;
  let instructionOverlay = null;

  const TRANSLATIONS = {
    es: {
      button: 'Instalar',
      buttonFull: 'Instalar la aplicación',
      title: 'Instala Look-in Brioche',
      intro:
        'Abre la tienda directamente desde la pantalla de tu dispositivo.',
      ios:
        'Pulsa Compartir y después “Añadir a pantalla de inicio”.',
      macSafari:
        'En Safari, abre Archivo y elige “Añadir al Dock”.',
      mobile:
        'Abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.',
      desktop:
        'Abre el menú del navegador y elige “Instalar Look-in Brioche”.',
      close: 'Entendido'
    },

    ru: {
      button: 'Установить',
      buttonFull: 'Установить приложение',
      title: 'Установите Look-in Brioche',
      intro:
        'Открывайте магазин прямо с экрана телефона или компьютера.',
      ios:
        'Нажмите «Поделиться», затем выберите «На экран Домой».',
      macSafari:
        'В Safari откройте меню «Файл» и выберите «Добавить в Dock».',
      mobile:
        'Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».',
      desktop:
        'Откройте меню браузера и выберите «Установить Look-in Brioche».',
      close: 'Понятно'
    },

    en: {
      button: 'Install',
      buttonFull: 'Install the app',
      title: 'Install Look-in Brioche',
      intro:
        'Open the shop directly from your phone or computer.',
      ios:
        'Tap Share, then choose “Add to Home Screen”.',
      macSafari:
        'In Safari, open File and choose “Add to Dock”.',
      mobile:
        'Open the browser menu and choose “Install app” or “Add to Home Screen”.',
      desktop:
        'Open the browser menu and choose “Install Look-in Brioche”.',
      close: 'Got it'
    }
  };

  function currentLanguage() {
    const htmlLanguage = String(
      document.documentElement.lang || ''
    ).slice(0, 2).toLowerCase();

    const storedLanguage = String(
      localStorage.getItem('lang') || ''
    ).slice(0, 2).toLowerCase();

    if (TRANSLATIONS[htmlLanguage]) return htmlLanguage;
    if (TRANSLATIONS[storedLanguage]) return storedLanguage;

    return 'es';
  }

  function text() {
    return TRANSLATIONS[currentLanguage()] || TRANSLATIONS.es;
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.startsWith('android-app://')
    );
  }

  function isIos() {
    return (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1
      )
    );
  }

  function isMacSafari() {
    const ua = navigator.userAgent;

    return (
      /Macintosh/i.test(ua) &&
      /Safari/i.test(ua) &&
      !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua)
    );
  }

  function isMobile() {
    return (
      isIos() ||
      /Android|Mobile/i.test(navigator.userAgent)
    );
  }

  function injectStyles() {
    if (document.getElementById('install-app-common-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'install-app-common-style';

    style.textContent = `
      [data-install-app] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }

      .install-app-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0, 0, 0, .48);
      }

      .install-app-dialog {
        width: min(100%, 420px);
        padding: 22px;
        border: 1px solid var(--bdr, rgba(0,0,0,.12));
        border-radius: 18px;
        background: var(--bgc, #fff);
        color: var(--text, #2d211b);
        box-shadow: 0 18px 50px rgba(0, 0, 0, .22);
        font-family: var(--font-body, system-ui, sans-serif);
      }

      .install-app-dialog-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .install-app-dialog-title {
        margin: 0;
        font-size: 20px;
        line-height: 1.25;
      }

      .install-app-dialog-close {
        flex: 0 0 auto;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 25px;
        line-height: 1;
      }

      .install-app-dialog p {
        margin: 13px 0 0;
        color: var(--text2, #5d514a);
        font-size: 14px;
        line-height: 1.55;
      }

      .install-app-dialog-instruction {
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--bg2, #f7f2ec);
        font-weight: 600;
      }

      .install-app-dialog-action {
        width: 100%;
        margin-top: 18px;
        padding: 11px 16px;
        border: 0;
        border-radius: 12px;
        background: var(--brand, #c4551a);
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }

      @media (max-width: 720px) {
        /* Public homepage:
           keep the language selector and install action visible
           without crowding the first row. */
        .lb-nav {
          height: auto !important;
          min-height: 58px;
          padding-top: 6px;
          padding-bottom: 6px;
          align-items: flex-start !important;
        }

        .lb-actions {
          width: 106px;
          flex: 0 0 106px;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 4px !important;
        }

        .lb-actions .install-app-btn-header {
          display: inline-flex !important;
          width: 100%;
          min-height: 30px;
          padding: 6px 8px !important;
          font-size: 11px;
          line-height: 1.1;
        }

        .lb-actions .install-app-btn-header > span:first-child {
          display: none;
        }

        /* Shop mobile header: one clean row. */
        #main-header {
          flex-wrap: nowrap;
          gap: 8px;
        }

        #main-header .header-title {
          min-width: 0;
          flex: 1 1 auto;
        }

        #main-header .header-title h1,
        #main-header #hdr-tag {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #main-header .header-right {
          width: auto;
          flex: 0 0 auto;
          margin-left: auto;
          justify-content: flex-end;
          flex-wrap: nowrap;
          gap: 5px;
        }

        #main-header .install-app-btn-shop {
          min-width: 0;
          min-height: 34px;
          padding: 7px 11px !important;
          border-color: var(--brand) !important;
          border-radius: 999px !important;
          background: var(--brand) !important;
          color: #fff !important;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
        }

        #main-header .install-app-btn-shop:hover {
          background: var(--brand-dk) !important;
        }

        #main-header .install-app-btn-shop > span:first-child {
          display: none;
        }

        #main-header .install-app-btn-shop [data-install-app-label] {
          display: inline !important;
        }

        #main-header .header-right > .btn-ghost:not(.install-app-btn-shop),
        #main-header #lang-toggle {
          width: 34px;
          height: 34px;
          padding: 0 !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
        }

        #main-header .header-right > div {
          flex: 0 0 auto;
        }

        @media (max-width: 380px) {
          #main-header #hdr-tag {
            display: none;
          }

          #main-header .install-app-btn-shop {
            padding-left: 8px !important;
            padding-right: 8px !important;
            font-size: 11px;
          }
        }
      }
    `;

    document.head.appendChild(style);
  }

  function updateButtons() {
    const labels = text();
    const installed = isStandalone();

    document.querySelectorAll('[data-install-app]').forEach(button => {
      button.hidden = installed;
      button.title = labels.buttonFull;
      button.setAttribute('aria-label', labels.buttonFull);

      const label = button.querySelector(
        '[data-install-app-label]'
      );

      if (label) label.textContent = labels.button;
    });

    if (instructionOverlay) {
      const title = instructionOverlay.querySelector(
        '[data-install-dialog-title]'
      );

      const intro = instructionOverlay.querySelector(
        '[data-install-dialog-intro]'
      );

      const close = instructionOverlay.querySelector(
        '[data-install-dialog-action]'
      );

      if (title) title.textContent = labels.title;
      if (intro) intro.textContent = labels.intro;
      if (close) close.textContent = labels.close;
    }
  }

  function instructionText() {
    const labels = text();

    if (isIos()) return labels.ios;
    if (isMacSafari()) return labels.macSafari;
    if (isMobile()) return labels.mobile;

    return labels.desktop;
  }

  function closeInstructions() {
    if (!instructionOverlay) return;

    instructionOverlay.remove();
    instructionOverlay = null;
  }

  function showInstructions() {
    closeInstructions();

    const labels = text();
    const overlay = document.createElement('div');

    overlay.className = 'install-app-overlay';
    overlay.setAttribute('role', 'presentation');

    overlay.innerHTML = `
      <section
        class="install-app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-app-dialog-title"
      >
        <div class="install-app-dialog-header">
          <h2
            class="install-app-dialog-title"
            id="install-app-dialog-title"
            data-install-dialog-title
          ></h2>

          <button
            type="button"
            class="install-app-dialog-close"
            data-install-dialog-close
            aria-label="Close"
          >×</button>
        </div>

        <p data-install-dialog-intro></p>

        <p class="install-app-dialog-instruction">
          ${instructionText()}
        </p>

        <button
          type="button"
          class="install-app-dialog-action"
          data-install-dialog-action
        ></button>
      </section>
    `;

    overlay.addEventListener('click', event => {
      if (
        event.target === overlay ||
        event.target.closest('[data-install-dialog-close]') ||
        event.target.closest('[data-install-dialog-action]')
      ) {
        closeInstructions();
      }
    });

    document.body.appendChild(overlay);
    instructionOverlay = overlay;
    updateButtons();

    overlay.querySelector(
      '[data-install-dialog-close]'
    )?.focus();
  }

  async function requestInstallation() {
    if (isStandalone()) {
      updateButtons();
      return;
    }

    if (!deferredInstallPrompt) {
      showInstructions();
      return;
    }

    try {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch (error) {
      console.warn('Install prompt failed:', error);
    } finally {
      deferredInstallPrompt = null;
      updateButtons();
    }
  }

  function bindButtons() {
    document.querySelectorAll('[data-install-app]').forEach(button => {
      if (button.dataset.installBound === '1') return;

      button.dataset.installBound = '1';
      button.addEventListener('click', requestInstallation);
    });

    updateButtons();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateButtons();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    closeInstructions();
    updateButtons();
  });

  window.matchMedia('(display-mode: standalone)')
    .addEventListener?.('change', updateButtons);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeInstructions();
  });

  document.addEventListener('click', event => {
    if (
      event.target.closest('[data-lang]') ||
      event.target.closest('.lang-btn')
    ) {
      setTimeout(updateButtons, 0);
    }
  });

  new MutationObserver(updateButtons).observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: ['lang']
    }
  );

  injectStyles();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }
})();
