function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}


async function getGoogleAccessToken(env) {
  const missing = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN'
  ].filter(key => !env[key]);

  if (missing.length) {
    throw new Error(`Missing Google OAuth secrets: ${missing.join(', ')}`);
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Google OAuth token error: ${res.status} ${JSON.stringify(data)}`
    );
  }

  return data.access_token;
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

    if (url.pathname === '/api/google-auth-test') {
      try {
        await getGoogleAccessToken(env);
        return json({ ok: true, googleOAuth: 'connected' });
      } catch (error) {
        console.error('Google OAuth test failed:', error);
        return json({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === '/api/google-sheet-test') {
      try {
        const accessToken = await getGoogleAccessToken(env);

        const spreadsheetId =
          '1R_lq1DaUkEtFer7srvnGIeAxh9kNR_0ltsIIVN75uMQ';

        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            `Google Sheets API error: ${res.status} ${JSON.stringify(data)}`
          );
        }

        const sheets = (data.sheets || []).map(item => ({
          sheetId: item.properties?.sheetId,
          title: item.properties?.title
        }));

        const template = sheets.find(
          item => item.title === 'Modelo 10%'
        );

        return json({
          ok: true,
          spreadsheet: data.properties?.title || '',
          templateFound: Boolean(template),
          templateSheetId: template?.sheetId ?? null,
          sheets
        });
      } catch (error) {
        console.error('Google Sheet test failed:', error);
        return json({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }



    if (
      url.pathname === '/api/google-sheet-fill-test' &&
      request.method === 'POST'
    ) {
      try {
        const accessToken = await getGoogleAccessToken(env);

        let payload = {};
        try {
          payload = await request.json();
        } catch (error) {
          return json({ ok: false, error: 'Invalid JSON body' }, 400);
        }

        const {
          invoiceSheetUrl,
          invoiceDataSheet,
          invoicePrefix,
          periodFrom,
          periodTo,
          total,
          base,
          vat,
          concepts
        } = payload;

        if (
          !invoiceSheetUrl ||
          !periodFrom ||
          !periodTo ||
          !Number.isFinite(Number(total)) ||
          !Number.isFinite(Number(base)) ||
          !Number.isFinite(Number(vat)) ||
          !Array.isArray(concepts) ||
          !concepts.length
        ) {
          return json({
            ok: false,
            error: 'Incomplete invoice payload'
          }, 400);
        }

        if (concepts.length > 3) {
          return json({
            ok: false,
            error: 'Template supports maximum 3 concept rows'
          }, 400);
        }

        const spreadsheetMatch = String(invoiceSheetUrl).match(
          /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
        );

        if (!spreadsheetMatch) {
          return json({
            ok: false,
            error: 'Invalid invoiceSheetUrl'
          }, 400);
        }

        const spreadsheetId = spreadsheetMatch[1];
        const dataSheet = String(invoiceDataSheet || 'num_fech').trim();

        // Read spreadsheet tabs to determine next invoice sequence.
        const metaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        const meta = await metaRes.json();

        if (!metaRes.ok) {
          throw new Error(
            `Google Sheets metadata error: ${metaRes.status} ${JSON.stringify(meta)}`
          );
        }

        const templateSheet = (meta.sheets || []).find(
          item => String(item.properties?.title || '').trim().toLowerCase() === 'modelo 10%'
        );

        if (!templateSheet?.properties?.sheetId) {
          throw new Error('Template sheet "Modelo 10%" not found');
        }

        const templateSheetId = templateSheet.properties.sheetId;

        const invoiceNumbers = (meta.sheets || [])
          .map(item => String(item.properties?.title || ''))
          .map(title => title.match(/^Factura_(\d+)_\d{4}$/))
          .filter(Boolean)
          .map(match => Number(match[1]))
          .filter(Number.isFinite);

        const nextSequence = invoiceNumbers.length
          ? Math.max(...invoiceNumbers) + 1
          : 1;

        let prefix = String(invoicePrefix || '').trim();

        if (!prefix) {
          const encodedDataSheet = encodeURIComponent(
            `'${dataSheet.replace(/'/g, "''")}'!B2`
          );

          const prefixRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedDataSheet}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          );

          const prefixData = await prefixRes.json();

          if (!prefixRes.ok) {
            throw new Error(
              `Google Sheets prefix error: ${prefixRes.status} ${JSON.stringify(prefixData)}`
            );
          }

          prefix = String(prefixData.values?.[0]?.[0] || '').trim();
        }

        if (!prefix) {
          throw new Error(
            `Invoice prefix not found for data sheet "${dataSheet}"`
          );
        }

        const now = new Date();

        const madridDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Madrid',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(now);

        const [year, month, day] = madridDate.split('-');

        const invoiceNumber =
          `${prefix}${nextSequence}${month}${year.slice(-2)}`;

        const targetSheet =
          `Factura_${nextSequence}_${month}${year.slice(-2)}`;

        const existingSheet = (meta.sheets || []).find(
          item => String(item.properties?.title || '') === targetSheet
        );

        if (existingSheet) {
          return json({
            ok: false,
            error: `Invoice sheet already exists: ${targetSheet}`
          }, 409);
        }

        const duplicateRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  duplicateSheet: {
                    sourceSheetId: templateSheetId,
                    insertSheetIndex: 0,
                    newSheetName: targetSheet
                  }
                }
              ]
            })
          }
        );

        const duplicateData = await duplicateRes.json();

        if (!duplicateRes.ok) {
          throw new Error(
            `Google Sheets duplicate error: ${duplicateRes.status} ${JSON.stringify(duplicateData)}`
          );
        }

        const createdSheetId =
          duplicateData.replies?.[0]?.duplicateSheet?.properties?.sheetId ?? null;

        const invoiceDateSerial =
          Math.floor(
            (
              Date.UTC(
                Number(year),
                Number(month) - 1,
                Number(day)
              ) -
              Date.UTC(1899, 11, 30)
            ) / 86400000
          );

        const formatPeriodDate = value => {
          const [y, m, d] = String(value).split('-');
          return `${d}/${m}/${y}`;
        };

        const periodText =
          `Correspondiente a las entregas efectuadas entre el ${formatPeriodDate(periodFrom)} y el ${formatPeriodDate(periodTo)}.`;

        // Clear the 3 concept rows first.
        const conceptRows = [0, 1, 2].map(index => {
          const row = concepts[index];

          if (!row) {
            return ['', '', '', '', '', ''];
          }

          return [
            index === 0 ? '=B2' : '',
            String(row.concept || ''),
            '',
            '',
            Number(row.units || 0),
            Number(row.base || 0)
          ];
        });

        const values = [
          {
            range: `'${targetSheet}'!A2`,
            values: [[invoiceDateSerial]]
          },
          {
            range: `'${targetSheet}'!B2`,
            values: [[invoiceNumber]]
          },
          {
            range: `'${targetSheet}'!E2`,
            values: [[Number(total)]]
          },
          {
            range: `'${targetSheet}'!A18:F20`,
            values: conceptRows
          },
          {
            range: `'${targetSheet}'!B22`,
            values: [[periodText]]
          },
          {
            range: `'${targetSheet}'!F24`,
            values: [[Number(base)]]
          },
          {
            range: `'${targetSheet}'!C25`,
            values: [[0.10]]
          },
          {
            range: `'${targetSheet}'!F25`,
            values: [[Number(vat)]]
          },
          {
            range: `'${targetSheet}'!F27`,
            values: [[Number(total)]]
          }
        ];

        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              valueInputOption: 'USER_ENTERED',
              data: values
            })
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            `Google Sheets fill error: ${res.status} ${JSON.stringify(data)}`
          );
        }

        return json({
          ok: true,
          sheet: targetSheet,
          sheetId: createdSheetId,
          invoiceNumber,
          updatedCells: data.totalUpdatedCells ?? null,
          spreadsheetId,
          sheetUrl:
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${createdSheetId}`
        });
      } catch (error) {
        console.error('Google Sheet fill test failed:', error);

        return json({
          ok: false,
          error: error instanceof Error
            ? error.message
            : String(error)
        }, 500);
      }
    }

    if (
      url.pathname === '/api/google-sheet-duplicate-test' &&
      request.method === 'POST'
    ) {
      try {
        const accessToken = await getGoogleAccessToken(env);

        const spreadsheetId =
          '1R_lq1DaUkEtFer7srvnGIeAxh9kNR_0ltsIIVN75uMQ';

        const templateSheetId = 599489858;

        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  duplicateSheet: {
                    sourceSheetId: templateSheetId,
                    newSheetName: 'TEST_AUTOMATION'
                  }
                }
              ]
            })
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            `Google Sheets duplicate error: ${res.status} ${JSON.stringify(data)}`
          );
        }

        const duplicated =
          data.replies?.[0]?.duplicateSheet?.properties || null;

        return json({
          ok: true,
          duplicatedSheetId: duplicated?.sheetId ?? null,
          duplicatedSheetTitle: duplicated?.title || ''
        });
      } catch (error) {
        console.error('Google Sheet duplicate test failed:', error);
        return json({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
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
