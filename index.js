const puppeteer = require('puppeteer');
const proxyChain = require('proxy-chain');
const fs = require('fs');
const yaml = require('js-yaml');

const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));

const { host, port, username, password, protocol = 'socks5' } = config.proxy;
const verifyCode = config.verify.code;

if (!host || !port || !verifyCode) {
  console.error('Missing required config fields: proxy.host, proxy.port, verify.code');
  process.exit(1);
}

const verifyUrl = `https://verify.donutsmp.net/?c=${verifyCode}`;

(async () => {
  const credentials = username && password ? `${username}:${password}@` : '';
  const upstreamUrl = `${protocol}://${credentials}${host}:${port}`;
  const localProxy = await proxyChain.anonymizeProxy(upstreamUrl);

  console.log(`Proxy:  ${protocol}://${host}:${port}`);
  console.log(`Opening: ${verifyUrl}`);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      `--proxy-server=${localProxy}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.goto(verifyUrl, { waitUntil: 'domcontentloaded' });
  console.log('Page loaded. Complete verification in the browser window.');

  browser.on('disconnected', async () => {
    await proxyChain.closeAnonymizedProxy(localProxy, true);
  });
})();
