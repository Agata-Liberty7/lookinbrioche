(() => {
  'use strict';

  let deferredInstallPrompt = null;
  let instructionOverlay = null;

  const COPY = {
    es: {
      button: 'Instalar',
      fullButton: 'Instalar la aplicación',
      title: 'Instala Look-in Brioche',
      intro:
        'Añade la tienda a la pantalla de inicio para abrirla como una aplicación.',
      step1: 'Pulsa el botón Compartir del navegador.',
      step2: 'Elige “Añadir a pantalla de inicio”.',
      step3: 'Pulsa “Añadir”.',
      fallback:
        'Si esta opción no aparece, abre la página en Safari.',
      close: 'Entendido'
    },

    ru: {
      button: 'Установить',
      fullButton: 'Установить приложение',
      title: 'Установите Look-in Brioche',
      intro:
        'Добавьте магазин на главный экран и открывайте его как приложение.',
      step1: 'Нажмите кнопку «Поделиться» в браузере.',
      step2: 'Выберите «На экран Домой».',
      step3: 'Нажмите «Добавить».',
      fallback:
        'Если такого пункта нет, откройте страницу в Safari.',
      close: 'Понятно'
    },

    en: {
      button: 'Install',
      fullButton: 'Install the app',
      title: 'Install Look-in Brioche',
      intro:
        'Add the shop to your Home Screen and open it like an app.',
      step1: 'Tap the browser Share button.',
      step2: 'Choose “Add to Home Screen”.',
      step3: 'Tap “Add”.',
      fallback:
        'If this option is unavailable, open the page in Safari.',
      close: 'Got it'
    }
  };

  function currentLanguage() {
    const detectedLanguage = String(
      typeof window.detectLang === 'function'
        ? window.detectLang()
        : ''
    ).slice(0, 2).toLowerCase();

    const htmlLanguage = String(
      document.documentElement.lang || ''
    ).slice(0, 2).toLowerCase();

    const storedLanguage = String(
      localStorage.getItem('lang') || ''
    ).slice(0, 2).toLowerCase();

    if (COPY[detectedLanguage]) return detectedLanguage;
    if (COPY[htmlLanguage]) return htmlLanguage;
    if (COPY[storedLanguage]) return storedLanguage;

    return 'es';
  }

  function text() {
    return COPY[currentLanguage()] || COPY.es;
  }

  function installButtons() {
    return document.querySelectorAll('[data-install-app]');
  }

  function isIosDevice() {
    return (
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1
      )
    );
  }

  function isStandalone() {
    const modes = [
      'standalone',
      'fullscreen',
      'minimal-ui',
      'window-controls-overlay'
    ];

    return (
      window.navigator.standalone === true ||
      document.referrer.startsWith('android-app://') ||
      modes.some(mode =>
        window.matchMedia(`(display-mode: ${mode})`).matches
      )
    );
  }

  function installMode() {
    if (isStandalone()) return 'hidden';

    // iPhone and iPad use a manual Add to Home Screen flow.
    if (isIosDevice()) return 'ios';

    // Chromium exposes the native prompt only when installation
    // is genuinely available.
    if (deferredInstallPrompt) return 'native';

    return 'hidden';
  }

  function updateLabels() {
    const labels = text();

    installButtons().forEach(button => {
      button.title = labels.fullButton;
      button.setAttribute(
        'aria-label',
        labels.fullButton
      );

      const label = button.querySelector(
        '[data-install-app-label]'
      );

      if (label) label.textContent = labels.button;
    });

    if (!instructionOverlay) return;

    const title = instructionOverlay.querySelector(
      '[data-install-title]'
    );

    const intro = instructionOverlay.querySelector(
      '[data-install-intro]'
    );

    const steps = instructionOverlay.querySelectorAll(
      '[data-install-step]'
    );

    const fallback = instructionOverlay.querySelector(
      '[data-install-fallback]'
    );

    const action = instructionOverlay.querySelector(
      '[data-install-close]'
    );

    if (title) title.textContent = labels.title;
    if (intro) intro.textContent = labels.intro;

    if (steps[0]) steps[0].textContent = labels.step1;
    if (steps[1]) steps[1].textContent = labels.step2;
    if (steps[2]) steps[2].textContent = labels.step3;

    if (fallback) fallback.textContent = labels.fallback;
    if (action) action.textContent = labels.close;
  }

  function updateVisibility() {
    const mode = installMode();
    const visible = mode !== 'hidden';

    document.documentElement.classList.toggle(
      'install-app-available',
      visible
    );

    document.documentElement.dataset.installMode = mode;

    installButtons().forEach(button => {
      button.hidden = !visible;
      button.dataset.installMode = mode;
    });

    updateLabels();
  }

  function closeInstructions() {
    if (!instructionOverlay) return;

    instructionOverlay.remove();
    instructionOverlay = null;
  }

  function showIosInstructions() {
    closeInstructions();

    const overlay = document.createElement('div');

    overlay.className = 'install-app-overlay';

    overlay.innerHTML = `
      <section
        class="install-app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-app-dialog-title"
      >
        <div class="install-app-dialog-head">
          <h2
            id="install-app-dialog-title"
            data-install-title
          ></h2>

          <button
            type="button"
            class="install-app-dialog-x"
            data-install-x
            aria-label="Close"
          >×</button>
        </div>

        <p
          class="install-app-dialog-intro"
          data-install-intro
        ></p>

        <ol class="install-app-steps">
          <li data-install-step></li>
          <li data-install-step></li>
          <li data-install-step></li>
        </ol>

        <p
          class="install-app-fallback"
          data-install-fallback
        ></p>

        <button
          type="button"
          class="install-app-dialog-action"
          data-install-close
        ></button>
      </section>
    `;

    overlay.addEventListener('click', event => {
      if (
        event.target === overlay ||
        event.target.closest('[data-install-x]') ||
        event.target.closest('[data-install-close]')
      ) {
        closeInstructions();
      }
    });

    document.body.appendChild(overlay);
    instructionOverlay = overlay;

    updateLabels();

    overlay.querySelector('[data-install-x]')?.focus();
  }

  async function requestInstallation() {
    const mode = installMode();

    if (mode === 'ios') {
      showIosInstructions();
      return;
    }

    if (
      mode !== 'native' ||
      !deferredInstallPrompt
    ) {
      updateVisibility();
      return;
    }

    const promptEvent = deferredInstallPrompt;

    deferredInstallPrompt = null;
    updateVisibility();

    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (error) {
      console.warn('Install prompt failed:', error);
    }
  }

  function bindButtons() {
    installButtons().forEach(button => {
      if (button.dataset.installBound === '1') {
        return;
      }

      button.dataset.installBound = '1';

      button.addEventListener(
        'click',
        requestInstallation
      );
    });

    updateVisibility();
  }

  function injectStyles() {
    if (document.getElementById('install-app-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'install-app-style';

    style.textContent = `
      [data-install-app][hidden] {
        display: none !important;
      }

      [data-install-app]:not([hidden]) {
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
        background: rgba(0, 0, 0, .58);
      }

      .install-app-dialog {
        width: min(100%, 420px);
        padding: 22px;
        border: 1px solid var(--bdr, rgba(0,0,0,.14));
        border-radius: 20px;
        background: var(--bgc, #fff);
        color: var(--text, #2d211b);
        box-shadow: 0 24px 70px rgba(0,0,0,.3);
        font-family: var(--font-body, system-ui, sans-serif);
      }

      .install-app-dialog-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .install-app-dialog h2 {
        margin: 0;
        font-size: 21px;
        line-height: 1.2;
      }

      .install-app-dialog-x {
        flex: 0 0 auto;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 27px;
        line-height: 1;
      }

      .install-app-dialog-intro {
        margin: 13px 0 0;
        color: var(--text2, #66564d);
        font-size: 14px;
        line-height: 1.55;
      }

      .install-app-steps {
        margin: 17px 0 0;
        padding: 14px 14px 14px 34px;
        border-radius: 14px;
        background: var(--bg2, #f7f2ec);
        color: var(--text, #2d211b);
        font-size: 14px;
        line-height: 1.55;
      }

      .install-app-steps li + li {
        margin-top: 6px;
      }

      .install-app-fallback {
        margin: 12px 0 0;
        color: var(--text3, #786a62);
        font-size: 12px;
        line-height: 1.45;
      }

      .install-app-dialog-action {
        width: 100%;
        margin-top: 18px;
        padding: 12px 16px;
        border: 0;
        border-radius: 12px;
        background: var(--brand, #c4551a);
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }

      @media (max-width: 720px) {
        .install-app-overlay {
          align-items: flex-end;
          padding: 12px;
        }

        .install-app-dialog {
          border-radius: 22px;
          padding: 20px;
        }

        html.install-app-available .lb-nav {
          height: auto !important;
          min-height: 58px;
          padding-top: 6px;
          padding-bottom: 6px;
          align-items: flex-start !important;
        }

        html.install-app-available .lb-actions {
          width: 106px;
          flex: 0 0 106px;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 4px !important;
        }

        html.install-app-available
        .lb-actions
        .install-app-btn-header:not([hidden]) {
          display: inline-flex !important;
          width: 100%;
          min-height: 30px;
          padding: 6px 8px !important;
          font-size: 11px;
          line-height: 1.1;
        }

        html.install-app-available
        .install-app-btn-header
        > span:first-child {
          display: none;
        }

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

        #main-header
        .install-app-btn-shop:not([hidden]) {
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

        #main-header
        .install-app-btn-shop
        > span:first-child {
          display: none;
        }

        #main-header
        .install-app-btn-shop
        [data-install-app-label] {
          display: inline !important;
        }

        #main-header
        .header-right
        > .btn-ghost:not(.install-app-btn-shop),
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
      }

      @media (max-width: 380px) {
        #main-header #hdr-tag {
          display: none;
        }

        #main-header
        .install-app-btn-shop:not([hidden]) {
          padding-left: 8px !important;
          padding-right: 8px !important;
          font-size: 11px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.addEventListener(
    'beforeinstallprompt',
    event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      updateVisibility();
    }
  );

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    closeInstructions();
    updateVisibility();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeInstructions();
    }
  });

  document.addEventListener('click', event => {
    if (
      event.target.closest('[data-lang]') ||
      event.target.closest('.lang-btn')
    ) {
      setTimeout(updateLabels, 0);
    }
  });

  new MutationObserver(updateLabels).observe(
    document.documentElement,
    {
      attributes: true,
      attributeFilter: ['lang']
    }
  );

  injectStyles();

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      bindButtons
    );
  } else {
    bindButtons();
  }
})();
