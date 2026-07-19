(() => {
  const MEASUREMENT_ID = 'G-45BMX96W0B';
  const CONSENT_KEY = 'lbAnalyticsConsent';

  function loadAnalytics() {
    if (window.__lbAnalyticsLoaded) return;
    window.__lbAnalyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true
    });

    const script = document.createElement('script');
    script.async = true;
    script.src =
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    document.head.appendChild(script);
  }

  function getLanguage() {
    const language = (
      document.documentElement.lang ||
      navigator.language ||
      'es'
    ).toLowerCase();

    if (language.startsWith('ru')) return 'ru';
    if (language.startsWith('en')) return 'en';
    return 'es';
  }

  const texts = {
    es: {
      message:
        'Usamos Google Analytics para conocer cómo se utiliza el sitio y mejorar el servicio.',
      accept: 'Aceptar',
      reject: 'Rechazar'
    },
    en: {
      message:
        'We use Google Analytics to understand how the site is used and improve the service.',
      accept: 'Accept',
      reject: 'Reject'
    },
    ru: {
      message:
        'Мы используем Google Analytics, чтобы понимать, как используется сайт, и улучшать сервис.',
      accept: 'Принять',
      reject: 'Отклонить'
    }
  };

  function showConsentBanner() {
    const copy = texts[getLanguage()];

    const style = document.createElement('style');
    style.textContent = `
      .lb-cookie-banner {
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: 16px;
        z-index: 10000;
        max-width: 720px;
        margin: 0 auto;
        padding: 16px;
        border-radius: 16px;
        background: #fff;
        color: #2b2118;
        box-shadow: 0 10px 35px rgba(0,0,0,.22);
        font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .lb-cookie-banner__actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 12px;
        flex-wrap: wrap;
      }

      .lb-cookie-banner button {
        border: 1px solid #8b5e3c;
        border-radius: 999px;
        padding: 9px 16px;
        cursor: pointer;
        font: inherit;
      }

      .lb-cookie-reject {
        background: #fff;
        color: #6b4428;
      }

      .lb-cookie-accept {
        background: #8b5e3c;
        color: #fff;
      }
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.className = 'lb-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');

    const message = document.createElement('div');
    message.textContent = copy.message;

    const actions = document.createElement('div');
    actions.className = 'lb-cookie-banner__actions';

    const rejectButton = document.createElement('button');
    rejectButton.type = 'button';
    rejectButton.className = 'lb-cookie-reject';
    rejectButton.textContent = copy.reject;

    const acceptButton = document.createElement('button');
    acceptButton.type = 'button';
    acceptButton.className = 'lb-cookie-accept';
    acceptButton.textContent = copy.accept;

    rejectButton.addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'rejected');
      banner.remove();
    });

    acceptButton.addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      banner.remove();
      loadAnalytics();
    });

    actions.append(rejectButton, acceptButton);
    banner.append(message, actions);
    document.body.appendChild(banner);
  }

  const consent = localStorage.getItem(CONSENT_KEY);

  if (consent === 'accepted') {
    loadAnalytics();
    return;
  }

  if (consent !== 'rejected') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showConsentBanner, {
        once: true
      });
    } else {
      showConsentBanner();
    }
  }
})();
