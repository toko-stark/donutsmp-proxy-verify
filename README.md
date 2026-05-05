# donutsmp-proxy-verify

Verify your DonutSMP account through a proxy. DonutSMP requires that the IP you use in-game and the IP you open the verification link from are the same — if they don't match, verification will fail. This tool opens the verification page routed through your proxy so both IPs match.

## Requirements

- [Node.js](https://nodejs.org/) v18+
- Google Chrome or Microsoft Edge installed at the default path
- A working proxy (SOCKS5, SOCKS4, or HTTP)

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Edit `config.yml`**

```yaml
proxy:
  host: "your.proxy.host"
  port: 1080
  username: "your_proxy_username"
  password: "your_proxy_password"
  protocol: "socks5"   # socks5 / socks4 / http

verify:
  code: "XXXXXXXX"    # the part after ?c= in your verify URL
```

Get your verify code from the URL DonutSMP sent you:

```
https://verify.donutsmp.net/?c=XXXXXXXX
                                ^^^^^^^^ this is your code
```

**3. Run**

```bash
node index.js
```

A Chrome or Edge window will open routed through your proxy. Complete the verification normally in that window.

## Notes

- The browser stays open after the page loads so you can interact with it manually.
- Closing the browser automatically cleans up the local proxy.
- If your proxy has no username/password, leave those fields empty (`""`).
