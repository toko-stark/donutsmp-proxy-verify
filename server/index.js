'use strict';

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const puppeteer = require('puppeteer-core');
const proxyChain = require('proxy-chain');

const app = express();
const PORT = process.env.PORT || 10000;

app.set('trust proxy', 1);

app.use(cors({
  origin: ['https://toko-stark.github.io'],
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait 15 minutes.' },
});
app.use('/verify', limiter);

app.get('/health', (_req, res) => res.json({ ok: true }));

function validateBody(body) {
  const { proxy, code } = body;
  if (!code || typeof code !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(code)) {
    return 'Invalid or missing verification code.';
  }
  if (!proxy || typeof proxy !== 'object') return 'Missing proxy config.';
  if (!proxy.host || typeof proxy.host !== 'string') return 'Missing proxy host.';
  const port = Number(proxy.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 'Invalid proxy port.';
  if (!['socks5', 'socks4', 'http'].includes(proxy.protocol)) {
    return 'Proxy protocol must be socks5, socks4, or http.';
  }
  return null;
}

app.post('/verify', async (req, res) => {
  const validationError = validateBody(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { proxy, code } = req.body;
  const { host, port, username, password, protocol } = proxy;

  const verifyUrl = `https://verify.donutsmp.net/?c=${encodeURIComponent(code)}`;
  let localProxy = null;
  let browser = null;

  try {
    const credentials = username && password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
      : '';
    const upstreamProxy = `${protocol}://${credentials}${host}:${port}`;

    localProxy = await proxyChain.anonymizeProxy(upstreamProxy);

    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        `--proxy-server=${localProxy}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    await page.goto(verifyUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    try {
      await page.waitForSelector('button, input[type="submit"], a', { timeout: 3000 });
      const clicked = await page.evaluate(() => {
        const candidates = [...document.querySelectorAll('button, input[type="submit"], a')];
        const btn = candidates.find(el =>
          /verif/i.test(el.textContent) || /verif/i.test(el.value || '')
        );
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (clicked) await new Promise(r => setTimeout(r, 2000));
    } catch {
      // no verify button found — visiting the URL alone may be sufficient
    }

    return res.json({
      success: true,
      message: 'Verification page visited successfully through your proxy. Check in-game to confirm.',
    });
  } catch (err) {
    console.error('Verification error:', err.message);
    return res.status(500).json({
      success: false,
      message: `Verification failed: ${err.message}`,
    });
  } finally {
    if (browser) try { await browser.close(); } catch {}
    if (localProxy) try { await proxyChain.closeAnonymizedProxy(localProxy, true); } catch {}
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
