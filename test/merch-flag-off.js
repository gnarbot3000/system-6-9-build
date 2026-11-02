const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const net = require("net");
const vm = require("vm");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const PRICE_TEXT = /\$|\b(36|32|58|78)\b/;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walkHtml(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === ".git" || ent.name === "node_modules") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(full, acc);
    else if (ent.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function makeDocument() {
  function node(tag) {
    const el = {
      tagName: String(tag).toUpperCase(),
      className: "",
      id: "",
      textContent: "",
      childNodes: [],
      attrs: {},
      parentNode: null,
      setAttribute(name, value) {
        this.attrs[name] = String(value);
      },
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
      },
      appendChild(child) {
        child.parentNode = this;
        this.childNodes.push(child);
        return child;
      },
      removeChild(child) {
        const i = this.childNodes.indexOf(child);
        if (i >= 0) this.childNodes.splice(i, 1);
        child.parentNode = null;
        return child;
      }
    };
    Object.defineProperty(el, "firstChild", {
      get() {
        return this.childNodes[0] || null;
      }
    });
    return el;
  }

  const grid = node("div");
  grid.id = "merch-grid";
  return {
    createElement: node,
    getElementById(id) {
      return id === "merch-grid" ? grid : null;
    },
    _grid: grid
  };
}

function nativeList(list) {
  return Array.from(list, (item) => String(item));
}

function loadMerch() {
  const sandbox = { console, URL, document: makeDocument() };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const rel of ["store/js/products.js", "js/merch-config.js", "js/merch.js"]) {
    vm.runInContext(read(rel), sandbox, { filename: rel });
  }
  return sandbox;
}

function elements(node, acc) {
  acc = acc || [];
  for (const child of node.childNodes || []) {
    acc.push(child);
    elements(child, acc);
  }
  return acc;
}

function allText(node) {
  return elements(node)
    .map((el) => el.textContent || "")
    .filter(Boolean)
    .join("\n");
}

test("config flag stays off and the Fourthwall map is empty", () => {
  const config = read("js/merch-config.js");
  assert.match(config, /MERCH_ENABLED\s*=\s*false/);
  assert.doesNotMatch(config, /MERCH_ENABLED\s*=\s*true/);
  assert.match(config, /Set MERCH_ENABLED to true/);

  const sb = loadMerch();
  assert.equal(sb.MERCH_ENABLED, false);
  const slugs = nativeList(sb.SYSTEM69_MERCH.map((product) => product.slug));
  assert.deepEqual(Object.keys(sb.FOURTHWALL_URLS), slugs);
  for (const slug of slugs) {
    assert.equal(sb.FOURTHWALL_URLS[slug], "");
  }
});

test("renderer builds cards with createElement and textContent", () => {
  const source = read("js/merch.js");
  assert.equal(source.includes("innerHTML"), false);
  assert.equal(source.includes("Object.hasOwn"), false);
  assert.equal(source.includes("Object.prototype.hasOwnProperty.call"), true);
  assert.equal(source.includes("createElement"), true);
  assert.equal(source.includes("textContent"), true);
  assert.equal(source.includes(".price"), false);
});

test("flag-off render has no outbound links and no prices", () => {
  const sb = loadMerch();
  sb.system69InitMerch();
  sb.system69InitMerch();

  const grid = sb.document._grid;
  const cards = grid.childNodes;
  assert.equal(cards.length, 4);

  const names = nativeList(sb.SYSTEM69_MERCH.map((product) => product.name));
  const headings = elements(grid).filter((el) => el.tagName === "H2");
  assert.deepEqual(nativeList(headings.map((el) => el.textContent)), names);

  const badges = elements(grid).filter((el) => el.className === "sold-badge");
  assert.equal(badges.length, 4);
  for (const badge of badges) assert.equal(badge.textContent, "Coming soon");

  const images = elements(grid).filter((el) => el.tagName === "IMG");
  assert.deepEqual(images.map((img) => img.getAttribute("src")), [
    "/media/merch/tee-front.png",
    "/media/merch/trucker-front.png",
    "/media/merch/cowboy-front.png",
    "/media/merch/shades-front.png"
  ]);
  for (const src of images.map((img) => img.getAttribute("src"))) {
    assert.equal(fs.existsSync(path.join(root, src)), true, src);
  }

  const anchors = elements(grid).filter((el) => el.tagName === "A");
  assert.equal(anchors.length, 0);

  const text = allText(grid);
  assert.equal(PRICE_TEXT.test(text), false, text);
  assert.equal(text.includes("Buy on Fourthwall"), false);
  assert.equal(text.toLowerCase().includes("fourthwall"), false);
});

test("a Fourthwall link is added only when the flag is on and the URL is valid", () => {
  const sb = loadMerch();
  const hrefOf = sb.system69FourthwallBuyHref;
  assert.equal(hrefOf("https://my-shop.fourthwall.com/products/tee"), "https://my-shop.fourthwall.com/products/tee");
  assert.equal(hrefOf("https://My-Shop.Fourthwall.com/products/Tee"), "https://my-shop.fourthwall.com/products/Tee");
  assert.equal(hrefOf("https://fourthwall.com/x"), "https://fourthwall.com/x");
  assert.equal(hrefOf("https://www.fourthwall.com/x"), "https://www.fourthwall.com/x");
  assert.equal(hrefOf("https://a.b.fourthwall.com/x"), "https://a.b.fourthwall.com/x");
  assert.equal(hrefOf("https://fourthwall.com:443/x"), "https://fourthwall.com/x");
  assert.equal(hrefOf("http://shop.fourthwall.com/x"), "");
  assert.equal(hrefOf("https://fourthwall.com.evil.com/x"), "");
  assert.equal(hrefOf("https://notfourthwall.com/x"), "");
  assert.equal(hrefOf("https://user:pass@shop.fourthwall.com/x"), "");
  assert.equal(hrefOf("https://shop.fourthwall.com:444/x"), "");
  assert.equal(hrefOf("https://shop.fourthwall.com/x "), "");
  assert.equal(hrefOf("https://fourthwall.com./x"), "");
  assert.equal(hrefOf("https://shop..fourthwall.com/x"), "");
  assert.equal(hrefOf("//shop.fourthwall.com/x"), "");
  assert.equal(hrefOf("javascript:alert(1)"), "");
  assert.equal(hrefOf(""), "");

  sb.FOURTHWALL_URLS["endless-loop-tee"] = "https://my-shop.fourthwall.com/products/endless-loop-tee";
  sb.system69InitMerch();
  assert.equal(elements(sb.document._grid).some((el) => el.tagName === "A"), false);

  sb.MERCH_ENABLED = true;
  sb.FOURTHWALL_URLS = {
    "endless-loop-tee": "https://my-shop.fourthwall.com/products/endless-loop-tee",
    "community-diy-trucker": "",
    "shoreline-cowboy": "https://evil.example/cowboy",
    "gold-mirror-shades": "http://shop.fourthwall.com/products/shades"
  };
  sb.system69InitMerch();

  const anchors = elements(sb.document._grid).filter((el) => el.tagName === "A");
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].getAttribute("href"), "https://my-shop.fourthwall.com/products/endless-loop-tee");
  assert.equal(anchors[0].getAttribute("target"), "_blank");
  assert.equal(anchors[0].getAttribute("rel"), "noopener");
  assert.equal(anchors[0].textContent, "Buy on Fourthwall");
  const coming = elements(sb.document._grid).filter((el) => el.textContent === "Coming soon");
  assert.equal(coming.length, 3);
  assert.equal(PRICE_TEXT.test(allText(sb.document._grid)), false);
});

test("names and alts are text, and a bad image path is dropped", () => {
  const sb = loadMerch();
  sb.SYSTEM69_MERCH = [
    {
      slug: "endless-loop-tee",
      name: "<b>Nope</b> $36",
      price: 36,
      images: [{ src: "tee-front.png\" onerror=\"alert(1)", alt: "<script>alert(1)</script>" }]
    }
  ];
  sb.MERCH_ENABLED = true;
  sb.FOURTHWALL_URLS = { "endless-loop-tee": "javascript:alert(1)" };
  sb.system69InitMerch();

  const grid = sb.document._grid;
  const headings = elements(grid).filter((el) => el.tagName === "H2");
  assert.equal(headings.length, 1);
  assert.equal(headings[0].textContent, "<b>Nope</b> $36");
  assert.equal(headings[0].childNodes.length, 0);
  assert.equal(elements(grid).some((el) => el.tagName === "IMG"), false);
  assert.equal(elements(grid).some((el) => el.tagName === "A"), false);
  assert.equal(elements(grid).some((el) => el.tagName === "SCRIPT"), false);
});

test("page is noindex, unlinked, and out of the sitemap", () => {
  const html = read("merch/index.html");
  assert.match(html, /name="robots"\s+content="[^"]*noindex/);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts.filter((src) => src.includes("ga.js")), ["/js/ga.js?v=ga1"]);
  assert.equal(scripts.length, 4);
  assert.match(html, /href="\/store\/css\/store\.css\?v=merch1"/);
  assert.equal(html.includes("fourthwall"), false);
  assert.equal(html.includes("Buy on Fourthwall"), false);
  assert.equal(html.toLowerCase().includes("<form"), false);
  assert.equal(html.includes('type="email"'), false);
  assert.equal(PRICE_TEXT.test(html.replace(/content="1280"/, "").replace(/content="720"/, "")), false);

  const sitemap = read("sitemap.xml");
  assert.equal(/merch/i.test(sitemap), false);

  for (const file of walkHtml(root, [])) {
    if (file.endsWith(path.join("merch", "index.html"))) continue;
    const text = fs.readFileSync(file, "utf8");
    assert.equal(/href\s*=\s*["'][^"']*\/merch\/?["']/i.test(text), false, file);
  }
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function startSite() {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8"
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const rel = pathname.replace(/^\/+/, "");
    const file = path.resolve(root, rel);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        "Content-Type": types[ext] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(data);
    });
  });
  return listen(server).then((port) => ({ server, port }));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close(() => resolve(port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageText(data) {
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  return String(data);
}

async function waitForJson(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      last = String(res.status);
    } catch (err) {
      last = err.message;
    }
    await sleep(100);
  }
  throw new Error("timed out waiting for " + url + " (" + last + ")");
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const waits = [];
  const events = [];

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(messageText(ev.data));
    if (msg.id && pending.has(msg.id)) {
      const job = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) job.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else job.resolve(msg.result || {});
      return;
    }
    if (!msg.method) return;
    events.push(msg);
    for (let i = waits.length - 1; i >= 0; i--) {
      if (waits[i].method === msg.method) {
        const job = waits.splice(i, 1)[0];
        job.resolve(msg.params || {});
      }
    }
  });

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new Error("devtools websocket failed")));
  });

  return {
    events,
    async send(method, params) {
      await opened;
      const msgId = ++id;
      ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
      return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
    },
    wait(method, timeoutMs) {
      const prior = events.find((event) => event.method === method);
      if (prior) return Promise.resolve(prior.params || {});
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout waiting for " + method)), timeoutMs);
        waits.push({
          method,
          resolve(params) {
            clearTimeout(timer);
            resolve(params);
          }
        });
      });
    },
    close() {
      ws.close();
    }
  };
}

function killChrome(child) {
  if (!child || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (err) {
    try {
      child.kill("SIGKILL");
    } catch (err2) {
      /* already gone */
    }
  }
}

test("flag-off page at 375px has no outbound links, no prices, no overflow, and no console errors", async (t) => {
  const site = await startSite();
  t.after(() => new Promise((resolve) => site.server.close(resolve)));

  const debugPort = await freePort();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "merch-chrome-"));
  const chromeLogs = [];
  const chrome = spawn(
    "/usr/bin/google-chrome",
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--window-size=375,812",
      "--remote-debugging-address=127.0.0.1",
      "--remote-allow-origins=*",
      "--remote-debugging-port=" + debugPort,
      "--user-data-dir=" + userData,
      "about:blank"
    ],
    { detached: true, stdio: ["ignore", "pipe", "pipe"] }
  );
  t.after(() => killChrome(chrome));
  chrome.stderr.on("data", (buf) => {
    chromeLogs.push(String(buf));
    if (chromeLogs.length > 40) chromeLogs.shift();
  });
  chrome.stdout.on("data", (buf) => {
    chromeLogs.push(String(buf));
    if (chromeLogs.length > 40) chromeLogs.shift();
  });

  let client;
  try {
    const list = await waitForJson("http://127.0.0.1:" + debugPort + "/json/list", 15000);
    const page = list.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
    assert.ok(page, "chrome did not open a page target");
    client = connectCdp(page.webSocketDebuggerUrl);
    t.after(() => client.close());

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Network.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true
    });

    const loaded = client.wait("Page.loadEventFired", 15000);
    await client.send("Page.navigate", { url: "http://127.0.0.1:" + site.port + "/merch/" });
    await loaded;
    await client.send("Runtime.evaluate", {
      expression: "Promise.race([document.fonts.ready, new Promise(function (resolve) { setTimeout(resolve, 4000); })])",
      awaitPromise: true,
      returnByValue: true
    });

    const evaluated = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [];
        document.querySelectorAll("body *").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          if (rect.left < -1 || rect.right > vw + 1) {
            offenders.push(el.tagName + "." + String(el.className || "") + " " + Math.round(rect.left) + ".." + Math.round(rect.right));
          }
        });
        const anchors = Array.from(document.querySelectorAll("a")).map((a) => ({
          href: a.getAttribute("href"),
          resolved: a.href,
          text: a.textContent
        }));
        return {
          flag: window.MERCH_ENABLED,
          urls: window.FOURTHWALL_URLS,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          offenders,
          text: document.body.innerText,
          textContent: document.body.textContent,
          anchors,
          gridAnchors: document.querySelectorAll("#merch-grid a").length,
          names: Array.from(document.querySelectorAll("#merch-grid h2")).map((h) => h.textContent),
          images: Array.from(document.querySelectorAll("#merch-grid img")).map((img) => img.getAttribute("src")),
          alts: Array.from(document.querySelectorAll("#merch-grid img")).map((img) => img.getAttribute("alt")),
          robots: (document.querySelector('meta[name="robots"]') || {}).content || "",
          ga: Array.from(document.querySelectorAll("script[src]")).map((s) => s.getAttribute("src")).filter((src) => src.indexOf("ga.js") !== -1),
          forms: document.forms.length,
          height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
        };
      })()`,
      returnByValue: true
    });
    if (evaluated.exceptionDetails) {
      throw new Error(JSON.stringify(evaluated.exceptionDetails));
    }
    const pageState = evaluated.result.value;

    const shot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 375, height: pageState.height, scale: 1 }
    });
    const shotPath = path.join(os.tmpdir(), "merch-375-flag-off.png");
    fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));

    const problems = [];
    for (const event of client.events) {
      if (event.method === "Runtime.exceptionThrown") {
        const details = event.params.exceptionDetails || {};
        problems.push(details.text || "exception");
      } else if (event.method === "Runtime.consoleAPICalled" && event.params.type === "error") {
        problems.push("console.error");
      } else if (event.method === "Log.entryAdded" && event.params.entry && event.params.entry.level === "error") {
        const text = event.params.entry.text || "";
        if (/favicon\.ico/i.test(text)) continue;
        problems.push(text);
      } else if (event.method === "Network.responseReceived") {
        const response = event.params.response || {};
        if (response.status >= 400 && !/favicon\.ico/i.test(response.url || "")) {
          problems.push(response.status + " " + response.url);
        }
      }
    }

    assert.deepEqual(problems, [], chromeLogs.join("").slice(-2000));
    assert.equal(pageState.flag, false);
    for (const value of Object.values(pageState.urls)) assert.equal(value, "");
    assert.equal(pageState.clientWidth, 375);
    assert.ok(pageState.scrollWidth <= pageState.clientWidth + 1, JSON.stringify(pageState));
    assert.deepEqual(pageState.offenders, []);
    assert.equal(pageState.gridAnchors, 0);
    assert.deepEqual(pageState.names, [
      "Endless Loop Tee",
      "Community DIY Trucker",
      "Shoreline Cowboy",
      "Gold Mirror Shades"
    ]);
    assert.deepEqual(pageState.images, [
      "/media/merch/tee-front.png",
      "/media/merch/trucker-front.png",
      "/media/merch/cowboy-front.png",
      "/media/merch/shades-front.png"
    ]);
    assert.equal(pageState.robots.includes("noindex"), true);
    assert.deepEqual(pageState.ga, ["/js/ga.js?v=ga1"]);
    assert.equal(pageState.forms, 0);
    assert.equal(PRICE_TEXT.test(pageState.text), false, pageState.text);
    assert.equal(PRICE_TEXT.test(pageState.textContent), false, pageState.textContent);
    assert.equal(pageState.text.includes("Buy on Fourthwall"), false);
    assert.equal(pageState.textContent.includes("Buy on Fourthwall"), false);
    assert.ok((pageState.textContent.match(/Coming soon/g) || []).length >= 4, pageState.textContent);

    for (const anchor of pageState.anchors) {
      assert.equal(/^https?:/i.test(anchor.href || ""), false, JSON.stringify(anchor));
      assert.equal(/fourthwall|javascript:|mailto:/i.test(anchor.href || ""), false, JSON.stringify(anchor));
      const resolved = new URL(anchor.resolved);
      assert.equal(resolved.hostname, "127.0.0.1");
    }

    const artifacts = process.env.ARTIFACTS_DIR || path.join(os.tmpdir(), "s69-artifacts");
    fs.mkdirSync(artifacts, { recursive: true });
    fs.copyFileSync(shotPath, path.join(artifacts, "merch_375_coming_soon.png"));

    const flipped = await client.send("Runtime.evaluate", {
      expression: `(() => {
        window.MERCH_ENABLED = true;
        window.FOURTHWALL_URLS = {
          "endless-loop-tee": "https://my-shop.fourthwall.com/products/endless-loop-tee",
          "community-diy-trucker": "",
          "shoreline-cowboy": "https://evil.example/nope",
          "gold-mirror-shades": "http://shop.fourthwall.com/products/shades"
        };
        window.system69InitMerch();
        const vw = document.documentElement.clientWidth;
        const offenders = [];
        document.querySelectorAll("body *").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          if (rect.left < -1 || rect.right > vw + 1) {
            offenders.push(el.tagName + "." + String(el.className || ""));
          }
        });
        return {
          buy: Array.from(document.querySelectorAll("#merch-grid a")).map((a) => ({
            href: a.getAttribute("href"),
            target: a.getAttribute("target"),
            rel: a.getAttribute("rel"),
            text: a.textContent
          })),
          coming: Array.from(document.querySelectorAll("#merch-grid .sold-badge")).map((el) => el.textContent),
          text: document.body.innerText,
          offenders,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
        };
      })()`,
      returnByValue: true
    });
    if (flipped.exceptionDetails) throw new Error(JSON.stringify(flipped.exceptionDetails));
    const onState = flipped.result.value;
    assert.deepEqual(onState.buy, [
      {
        href: "https://my-shop.fourthwall.com/products/endless-loop-tee",
        target: "_blank",
        rel: "noopener",
        text: "Buy on Fourthwall"
      }
    ]);
    assert.deepEqual(onState.coming, ["Coming soon", "Coming soon", "Coming soon"]);
    assert.equal(PRICE_TEXT.test(onState.text), false, onState.text);
    assert.equal(onState.clientWidth, 375);
    assert.ok(onState.scrollWidth <= onState.clientWidth + 1);
    assert.deepEqual(onState.offenders, []);
    assert.equal(read("js/merch-config.js").includes("MERCH_ENABLED = false"), true);

    const onShot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 375, height: onState.height, scale: 1 }
    });
    fs.writeFileSync(path.join(artifacts, "merch_375_buy_link.png"), Buffer.from(onShot.data, "base64"));
  } catch (err) {
    err.message += "\nchrome:\n" + chromeLogs.join("").slice(-2000);
    throw err;
  }
});
