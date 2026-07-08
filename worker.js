function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

async function sendTelegramMessage(env, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const body = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    response: body.slice(0, 1000)
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true });
    }

    if (url.pathname === '/api/notify-new-order' && request.method === 'POST') {
      const missing = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'].filter(k => !env[k]);
      if (missing.length) {
        return json({ ok: false, error: 'Missing Telegram secrets', missing }, 500);
      }

      let payload = {};
      try {
        payload = await request.json();
      } catch(e) {}

      if (payload.type !== 'new_order') {
        return json({ ok: false, error: 'Bad request' }, 400);
      }

      const text = [
        '🥐 Nuevo pedido en Look-in Brioche.',
        'Entra en el panel de administración.'
      ].join('\n');

      const result = await sendTelegramMessage(env, text);

      return json({
        ok: result.ok,
        result
      }, result.ok ? 200 : 502);
    }

    return env.ASSETS.fetch(request);
  }
};
