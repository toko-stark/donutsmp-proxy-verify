const puppeteer = require('puppeteer');
const proxyChain = require('proxy-chain');
const yaml = require('js-yaml');
const fs = require('fs');

const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));
const { host, port, username, password, protocol = 'socks5' } = config.proxy;
const { code } = config.verify;

const verifyUrl = `https://verify.donutsmp.net/?c=${code}`;

(async () => {
  const credentials = username && password ? `${username}:${password}@` : '';
  const localProxy = await proxyChain.anonymizeProxy(`${protocol}://${credentials}${host}:${port}`);

  console.log(`proxy: ${protocol}://${host}:${port}`);
  console.log(`opening: ${verifyUrl}`);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [`--proxy-server=${localProxy}`, '--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(verifyUrl, { waitUntil: 'domcontentloaded' });
  console.log('done, finish the verification in the browser');

  browser.on('disconnected', async () => {
    await proxyChain.closeAnonymizedProxy(localProxy, true);
  });
})();
